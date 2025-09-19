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
  console.log('=== UPLOAD DEBUG START ===');
  console.log('Method:', req.method);
  console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    MONGODB_URI: !!process.env.MONGODB_URI,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
    MAIN_DRIVE_FOLDER_ID: !!process.env.MAIN_DRIVE_FOLDER_ID,
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    console.log('Checking session...');
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      console.log('No session found');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    console.log('Session OK:', session.user.email);

    // Parse form data
    console.log('Parsing form data...');
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
      multiples: true,
    });

    const [fields, files] = await form.parse(req);
    console.log('Form parsed - fields:', Object.keys(fields));
    console.log('Form parsed - files:', Object.keys(files));
    
    // Extract fields with proper array handling
    const entityName = Array.isArray(fields.entityName) ? fields.entityName[0] : fields.entityName;
    const category = Array.isArray(fields.category) ? fields.category[0] : fields.category;
    const financialYear = Array.isArray(fields.financialYear) ? fields.financialYear[0] : fields.financialYear;
    const month = Array.isArray(fields.month) ? fields.month[0] : fields.month;
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
    const tags = Array.isArray(fields.tags) ? fields.tags[0] : fields.tags;
    const customFileName = Array.isArray(fields.customFileName) ? fields.customFileName[0] : fields.customFileName;
    let ocrText = Array.isArray(fields.ocrText) ? fields.ocrText[0] : fields.ocrText;

    console.log('Extracted fields:', {
      entityName,
      category,
      financialYear,
      month,
      hasDescription: !!description,
      hasTags: !!tags,
      hasCustomFileName: !!customFileName
    });

    if (!entityName) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    // Handle multiple files
    const uploadedFiles = [];
    const fileArray = Array.isArray(files.documents) ? files.documents : [files.documents].filter(Boolean);
    
    console.log('Processing', fileArray.length, 'file(s)');

    for (const file of fileArray) {
      if (!file) continue;

      try {
        console.log(`Processing file: ${file.originalFilename}`);
        console.log(`File size: ${file.size} bytes`);
        console.log(`File type: ${file.mimetype}`);

        // Determine final filename
        const finalFileName = customFileName || file.originalFilename;
        console.log(`Final filename: ${finalFileName}`);
        
        // Get target folder based on hierarchy
        console.log('Getting target folder for:', { entityName, category, financialYear, month });
        const targetFolder = await getTargetFolder(entityName, category, financialYear, month);
        console.log('Target folder received:', targetFolder);

        if (!targetFolder || !targetFolder.id) {
          throw new Error('Failed to get or create target folder');
        }
        
        // Read file buffer with error handling
        let fileBuffer;
        try {
          if (!fs.existsSync(file.filepath)) {
            throw new Error(`Temporary file not found: ${file.filepath}`);
          }
          
          fileBuffer = fs.readFileSync(file.filepath);
          console.log(`File buffer created, size: ${fileBuffer.length} bytes`);
          
          if (fileBuffer.length === 0) {
            throw new Error('File buffer is empty');
          }
        } catch (readError) {
          console.error('Error reading file:', readError);
          throw new Error(`Failed to read uploaded file: ${readError.message}`);
        }
        
        // Additional OCR processing for PDFs and images
        if (!ocrText && (file.mimetype.includes('image') || file.mimetype.includes('pdf'))) {
          try {
            console.log('Processing OCR...');
            ocrText = await processFileOCR(fileBuffer, file.mimetype);
          } catch (ocrError) {
            console.error('OCR processing failed:', ocrError);
            ocrText = '';
          }
        }
        
        // Upload to Google Drive
        console.log('Uploading to Google Drive...');
        const driveFile = await uploadFileToGoogleDrive(
          fileBuffer, 
          finalFileName, 
          file.mimetype, 
          targetFolder.id
        );
        
        if (!driveFile || !driveFile.id) {
          throw new Error('Google Drive upload failed - no file ID returned');
        }
        
        console.log('Google Drive upload successful:', driveFile.id);

        // Build file path for database
        const pathParts = [entityName];
        if (category && category !== '') {
          pathParts.push(category);
          
          if (financialYear && financialYear !== '') {
            pathParts.push(financialYear);
            
            if (month && ['GST', 'TDS'].includes(category)) {
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const monthIndex = parseInt(month) - 1;
              if (monthIndex >= 0 && monthIndex < 12) {
                pathParts.push(monthNames[monthIndex]);
              }
            }
          }
        }
        pathParts.push(finalFileName);
        
        console.log('Built file path:', pathParts.join('/'));
        
        // Prepare document data for database
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

        console.log('Saving document to database...');
        const savedDocument = await saveDocument(documentData);
        
        if (!savedDocument || !savedDocument.insertedId) {
          throw new Error('Database save failed - no document ID returned');
        }
        
        console.log('Document saved to database:', savedDocument.insertedId.toString());
        
        // Log activity (non-critical, don't fail if this errors)
        try {
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
          console.log('Activity logged successfully');
        } catch (activityError) {
          console.error('Activity logging failed (non-critical):', activityError);
        }

        uploadedFiles.push({
          id: savedDocument.insertedId.toString(),
          fileName: finalFileName,
          googleDriveId: driveFile.id,
          path: pathParts.join('/')
        });

        // Clean up temporary file
        try {
          if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
            console.log('Temporary file cleaned up');
          }
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
        
        console.log(`File ${finalFileName} processed successfully`);
        
      } catch (fileError) {
        console.error(`Error uploading file ${file.originalFilename}:`, fileError);
        console.error('File error stack:', fileError.stack);
        
        // Clean up temporary file on error
        try {
          if (file && file.filepath && fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
            console.log('Cleaned up temp file after error');
          }
        } catch (cleanupError) {
          console.error('Error cleaning up temp file after error:', cleanupError);
        }
        
        throw fileError;
      }
    }

    console.log(`Upload completed successfully. ${uploadedFiles.length} file(s) uploaded.`);
    console.log('=== UPLOAD DEBUG END ===');

    res.status(200).json({ 
      success: true, 
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('=== END ERROR ===');
    
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message,
      // Only include stack in development
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
}

// OCR processing function
async function processFileOCR(fileBuffer, mimeType) {
  try {
    console.log('OCR processing started for type:', mimeType);
    
    if (mimeType.includes('image')) {
      // For images, OCR would be done client-side or with a service
      console.log('Image OCR - returning empty for now');
      return '';
    }
    
    if (mimeType.includes('pdf')) {
      // For PDFs, you could integrate with a PDF text extraction service
      console.log('PDF OCR - returning empty for now');
      return '';
    }
    
    return '';
  } catch (error) {
    console.error('OCR processing error:', error);
    return '';
  }
}
