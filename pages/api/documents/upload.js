// Replace your pages/api/documents/upload.js with this OAuth version

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
  // Set timeout for the entire request
  res.setTimeout(5 * 60 * 1000); // 5 minutes

  console.log('=== OAUTH UPLOAD DEBUG START ===');
  console.log('Method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication and get access token
    console.log('Checking session and access token...');
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      console.log('No session found');
      return res.status(401).json({ error: 'Unauthorized - Please sign in again' });
    }

    if (!session.accessToken) {
      console.log('No access token found');
      return res.status(401).json({ error: 'No Google Drive access token - Please sign out and sign in again' });
    }
    
    console.log('Session and access token OK:', session.user?.email);

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.MAIN_DRIVE_FOLDER_ID) {
      console.error('Missing Google OAuth credentials');
      return res.status(500).json({ error: 'Server configuration error - Google OAuth credentials missing' });
    }

    // Parse form data
    console.log('Parsing form data...');
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
      multiples: true,
      keepExtensions: true,
    });

    let fields, files;
    try {
      [fields, files] = await form.parse(req);
      console.log('Form parsed successfully');
    } catch (parseError) {
      console.error('Form parsing failed:', parseError);
      return res.status(400).json({ 
        error: 'Failed to parse uploaded data',
        details: parseError.message 
      });
    }
    
    // Extract and validate fields
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
      month
    });

    if (!entityName || entityName.trim() === '') {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    // Process files
    const uploadedFiles = [];
    const fileArray = files.documents ? 
      (Array.isArray(files.documents) ? files.documents : [files.documents]) 
      : [];
    
    if (fileArray.length === 0 || !fileArray[0]) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`Processing ${fileArray.length} file(s) with OAuth`);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      if (!file) continue;

      try {
        console.log(`\n--- Processing file ${i + 1}/${fileArray.length} ---`);
        console.log(`File: ${file.originalFilename}`);
        console.log(`Size: ${file.size} bytes`);

        // Validate file
        if (!file.originalFilename || file.size === 0) {
          console.error('Invalid file:', file);
          continue;
        }

        // Determine final filename
        const finalFileName = (customFileName && fileArray.length === 1) 
          ? customFileName.trim() 
          : file.originalFilename;
        
        console.log(`Final filename: ${finalFileName}`);
        
        // Get target folder using OAuth
        console.log('Getting target folder with OAuth...');
        const targetFolder = await getTargetFolder(
          entityName.trim(), 
          category, 
          financialYear, 
          month, 
          session.accessToken
        );
        
        if (!targetFolder || !targetFolder.id) {
          throw new Error('Failed to create/get target folder');
        }
        
        console.log('Target folder ID:', targetFolder.id);
        
        // Read file buffer
        let fileBuffer;
        try {
          console.log('Reading file buffer...');
          
          if (!fs.existsSync(file.filepath)) {
            throw new Error(`File not found at: ${file.filepath}`);
          }
          
          fileBuffer = fs.readFileSync(file.filepath);
          console.log(`Buffer created: ${fileBuffer.length} bytes`);
          
          if (fileBuffer.length === 0) {
            throw new Error('File buffer is empty');
          }
          
        } catch (readError) {
          console.error('File read error:', readError);
          throw new Error(`Failed to read file: ${readError.message}`);
        }
        
        // Upload to Google Drive using OAuth
        console.log('Uploading to Google Drive with OAuth...');
        const driveFile = await uploadFileToGoogleDrive(
          fileBuffer, 
          finalFileName, 
          file.mimetype, 
          targetFolder.id,
          session.accessToken
        );
        
        if (!driveFile || !driveFile.id) {
          throw new Error('Google Drive upload returned no file ID');
        }
        
        console.log('OAuth Drive upload successful:', driveFile.id);

        // Build file path for database
        const pathParts = [entityName.trim()];
        if (category && category.trim() !== '') {
          pathParts.push(category.trim());
          
          if (financialYear && financialYear.trim() !== '') {
            pathParts.push(financialYear.trim());
            
            if (month && ['GST', 'TDS'].includes(category)) {
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              const monthIndex = parseInt(month) - 1;
              if (monthIndex >= 0 && monthIndex < 12) {
                pathParts.push(monthNames[monthIndex]);
              }
            }
          }
        }
        pathParts.push(finalFileName);
        
        const filePath = pathParts.join('/');
        console.log('File path:', filePath);
        
        // Save to database
        const documentData = {
          fileName: finalFileName,
          originalFileName: file.originalFilename,
          filePath: filePath,
          googleDriveId: driveFile.id,
          entityName: entityName.trim(),
          category: category?.trim() || '',
          financialYear: financialYear?.trim() || '',
          month: month ? parseInt(month) : null,
          description: description?.trim() || '',
          tags: tags ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
          ocrText: ocrText?.trim() || '',
          mimeType: file.mimetype,
          fileSize: parseInt(file.size),
          uploadedBy: session.user.email,
          uploadedByName: session.user.name,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        console.log('Saving to database...');
        const savedDocument = await saveDocument(documentData);
        
        if (!savedDocument?.insertedId) {
          console.warn('Database save failed, continuing...');
        } else {
          console.log('Database save successful');
        }
        
        // Log activity (optional)
        try {
          await logActivity({
            action: 'document_upload',
            entityName: entityName.trim(),
            documentId: savedDocument?.insertedId?.toString(),
            fileName: finalFileName,
            category: category || 'Root',
            userEmail: session.user.email,
            userName: session.user.name,
            timestamp: new Date()
          });
        } catch (activityError) {
          console.warn('Activity logging failed (non-critical):', activityError);
        }

        uploadedFiles.push({
          id: savedDocument?.insertedId?.toString() || driveFile.id,
          fileName: finalFileName,
          googleDriveId: driveFile.id,
          path: filePath,
          size: file.size
        });

        // Clean up temporary file
        try {
          if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
            console.log('Temporary file cleaned up');
          }
        } catch (cleanupError) {
          console.warn('Cleanup error (non-critical):', cleanupError);
        }
        
        console.log(`File ${finalFileName} processed successfully with OAuth`);
        
      } catch (fileError) {
        console.error(`Error processing file ${file?.originalFilename}:`, fileError);
        
        // Clean up on error
        try {
          if (file?.filepath && fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
          }
        } catch (cleanupError) {
          console.warn('Error during cleanup:', cleanupError);
        }
        
        throw new Error(`Failed to process ${file?.originalFilename}: ${fileError.message}`);
      }
    }

    if (uploadedFiles.length === 0) {
      throw new Error('No files were successfully processed');
    }

    console.log(`OAuth upload completed successfully. ${uploadedFiles.length} file(s) processed.`);
    console.log('=== OAUTH UPLOAD DEBUG END ===');

    res.status(200).json({ 
      success: true, 
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('=== OAUTH UPLOAD ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Clean up any remaining temporary files
    try {
      if (files?.documents) {
        const fileArray = Array.isArray(files.documents) ? files.documents : [files.documents];
        fileArray.forEach(file => {
          if (file?.filepath && fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
          }
        });
      }
    } catch (cleanupError) {
      console.warn('Final cleanup error:', cleanupError);
    }
    
    console.error('=== END OAUTH ERROR ===');
    
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message
    });
  }
}
