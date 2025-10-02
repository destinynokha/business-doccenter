import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import formidable from 'formidable';
import fs from 'fs';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { saveDocument, logActivity } from '../../../lib/mongodb';

export const config = {
  api: {
    bodyParser: false,
  },
};


export default async function handler(req, res) {
  console.log('=== UPLOAD START ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    console.log('Session check:', !!session);
    console.log('Has access token:', !!session?.accessToken);
    
    if (!session || !session.accessToken) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Please sign out and sign in again to grant Drive permissions'
      });
    }

    // Create OAuth2 client with user's access token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    console.log('Drive client created with user token');

    // Parse form
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024,
      multiples: true,
    });

    const [fields, files] = await form.parse(req);
    
    const entityName = Array.isArray(fields.entityName) ? fields.entityName[0] : fields.entityName;
    const category = Array.isArray(fields.category) ? fields.category[0] : fields.category;
    const financialYear = Array.isArray(fields.financialYear) ? fields.financialYear[0] : fields.financialYear;
    const month = Array.isArray(fields.month) ? fields.month[0] : fields.month;
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
    const tags = Array.isArray(fields.tags) ? fields.tags[0] : fields.tags;
    const customFileName = Array.isArray(fields.customFileName) ? fields.customFileName[0] : fields.customFileName;

    console.log('Entity:', entityName, 'Category:', category);

    if (!entityName) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    const uploadedFiles = [];
    const fileArray = Array.isArray(files.documents) ? files.documents : [files.documents].filter(Boolean);
    
    console.log('Processing', fileArray.length, 'file(s)');

    for (const file of fileArray) {
      if (!file) continue;

      try {
        console.log('Processing:', file.originalFilename);
        const finalFileName = customFileName || file.originalFilename;
        
        // Get or create folder in user's Drive
        const targetFolder = await getOrCreateFolderPath(drive, entityName, category, financialYear, month);
        console.log('Target folder:', targetFolder.id);
        
        // Read and upload file
        const fileBuffer = fs.readFileSync(file.filepath);
        const stream = Readable.from(fileBuffer);
        
        console.log('Uploading to user Drive...');
        const driveFile = await drive.files.create({
          requestBody: {
            name: finalFileName,
            parents: [targetFolder.id],
          },
          media: {
            mimeType: file.mimetype,
            body: stream,
          },
          fields: 'id, name, size, createdTime, mimeType, webViewLink',
        });

        console.log('Upload successful:', driveFile.data.id);

        // Build file path
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
        
        // Save to MongoDB
        const documentData = {
          fileName: finalFileName,
          originalFileName: file.originalFilename,
          filePath: pathParts.join('/'),
          googleDriveId: driveFile.data.id,
          googleDriveLink: driveFile.data.webViewLink,
          entityName,
          category: category || '',
          financialYear: financialYear || '',
          month: month ? parseInt(month) : null,
          description: description || '',
          tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedBy: session.user.email,
          uploadedByName: session.user.name,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const savedDocument = await saveDocument(documentData);
        console.log('Saved to MongoDB:', savedDocument.insertedId);
        
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
          googleDriveId: driveFile.data.id,
          googleDriveLink: driveFile.data.webViewLink,
          path: pathParts.join('/')
        });

        fs.unlinkSync(file.filepath);
        
      } catch (fileError) {
        console.error('File error:', fileError.message);
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
        throw fileError;
      }
    }

    console.log('=== UPLOAD SUCCESS ===');
    res.status(200).json({ 
      success: true, 
      message: `${uploadedFiles.length} file(s) uploaded to your Google Drive`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
}

// Helper: Create folder path in user's Drive
async function getOrCreateFolderPath(drive, entityName, category, financialYear, month) {
  try {
    // Find or create root "Business Documents" folder
    let rootFolder = await findOrCreateFolder(drive, 'Business Documents', 'root');
    
    // Create entity folder
    let currentFolder = await findOrCreateFolder(drive, entityName, rootFolder.id);
    
    // Create category folder if specified
    if (category && category !== '') {
      currentFolder = await findOrCreateFolder(drive, category, currentFolder.id);
      
      // Create financial year folder
      if (financialYear && financialYear !== '' && category !== 'Others') {
        currentFolder = await findOrCreateFolder(drive, financialYear, currentFolder.id);
        
        // Create month folder for GST/TDS
        if (month && ['GST', 'TDS'].includes(category)) {
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
          const monthName = monthNames[parseInt(month) - 1];
          currentFolder = await findOrCreateFolder(drive, monthName, currentFolder.id);
        }
      }
    }
    
    return currentFolder;
  } catch (error) {
    console.error('Folder creation error:', error);
    throw error;
  }
}

async function findOrCreateFolder(drive, name, parentId) {
  try {
    // Search for existing folder
    const response = await drive.files.list({
      q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0];
    }

    // Create new folder
    const folder = await drive.files.create({
      requestBody: {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      },
      fields: 'id, name'
    });

    return folder.data;
  } catch (error) {
    console.error('findOrCreateFolder error:', error);
    throw error;
  }
}
