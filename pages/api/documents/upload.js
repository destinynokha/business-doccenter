import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import { uploadFileToGoogleDrive, getTargetFolder } from '../../../lib/googleDrive';
import { saveDocument, logActivity } from '../../../lib/mongodb';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
      multiples: true,
    });

    const [fields, files] = await form.parse(req, (err, fields, files) => { … });
    
    const entityName = Array.isArray(fields.entityName) ? fields.entityName[0] : fields.entityName;
    const category = Array.isArray(fields.category) ? fields.category[0] : fields.category;
    const financialYear = Array.isArray(fields.financialYear) ? fields.financialYear[0] : fields.financialYear;
    const month = Array.isArray(fields.month) ? fields.month[0] : fields.month;
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
    const tags = Array.isArray(fields.tags) ? fields.tags[0] : fields.tags;
    const customFileName = Array.isArray(fields.customFileName) ? fields.customFileName[0] : fields.customFileName;
    let ocrText = Array.isArray(fields.ocrText) ? fields.ocrText[0] : fields.ocrText;

    if (!entityName) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    // Handle multiple files
    const uploadedFiles = [];
    const fileArray = Array.isArray(files.documents) ? files.documents : [files.documents].filter(Boolean);
    
    for (const file of fileArray) {
      if (!file) continue;

      try {
        // Determine final filename
        const finalFileName = customFileName || file.originalFilename;
        
        // Get target folder based on hierarchy
        const targetFolder = await getTargetFolder(entityName, category, financialYear, month);
        
        // Read file buffer
        const fileBuffer = fs.readFileSync(file.filepath);
        
        // Additional OCR processing for PDFs and images
        if (!ocrText && (file.mimetype.includes('image') || file.mimetype.includes('pdf'))) {
          try {
            ocrText = await processFileOCR(fileBuffer, file.mimetype);
          } catch (ocrError) {
            console.error('OCR processing failed:', ocrError);
            ocrText = '';
          }
        }
        
        // Upload to Google Drive
        const driveFile = await uploadFileToGoogleDrive(
          fileBuffer, 
          finalFileName, 
          file.mimetype, 
          targetFolder.id
        );

        // Build file path for database
        const pathParts = [entityName];
        if (category) pathParts.push(category);
        if (financialYear && category) pathParts.push(financialYear);
        if (month && ['GST', 'TDS'].includes(category)) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          pathParts.push(monthNames[parseInt(month) - 1]);
        }
        pathParts.push(finalFileName);
        
        // Save document metadata to database
        const documentData = {
          fileName: finalFileName,
          originalFileName: file.originalFilename,
          filePath: pathParts.join('/'),
          googleDriveId: driveFile.id,
          entityName,
          category: category || '',
          financialYear: financialYear || '',
          month: month ? parseInt(month) : null,
          description: description || '',
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          ocrText: ocrText || '',
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: session.user.email,
          uploadedByName: session.user.name,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const savedDocument = await saveDocument(documentData);
        
        // Log activity
        await logActivity({
          action: 'document_upload',
          entityName,
          documentId: savedDocument.insertedId.toString(),
          fileName: finalFileName,
          category: category || 'Root',
          userEmail: session.user.email,
          userName: session.user.name,
          timestamp: new Date()
        });

        uploadedFiles.push({
          id: savedDocument.insertedId.toString(),
          fileName: finalFileName,
          googleDriveId: driveFile.id,
          path: pathParts.join('/')
        });

        // Clean up temporary file
        fs.unlinkSync(file.filepath);
        
      } catch (fileError) {
        console.error(`Error uploading file ${file.originalFilename}:`, fileError);
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
        throw fileError;
      }
    }

    res.status(200).json({ 
      success: true, 
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
}

// OCR processing function
async function processFileOCR(fileBuffer, mimeType) {
  try {
    if (mimeType.includes('image')) {
      // For images, use Tesseract.js (client-side processing preferred)
      return ''; // OCR will be done client-side
    }
    
    if (mimeType.includes('pdf')) {
      // For PDFs, you could use pdf-parse + tesseract or similar
      // For now, return empty string as PDFs are complex
      return '';
    }
    
    return '';
  } catch (error) {
    console.error('OCR processing error:', error);
    return '';
  }
}
