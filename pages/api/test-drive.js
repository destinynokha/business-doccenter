import { drive } from '../../lib/googleDrive';

export default async function handler(req, res) {
  try {
    console.log('Testing Google Drive connection...');
    console.log('MAIN_DRIVE_FOLDER_ID:', process.env.MAIN_DRIVE_FOLDER_ID);
    console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.log('GOOGLE_PRIVATE_KEY exists:', !!process.env.GOOGLE_PRIVATE_KEY);
    
    // Test Drive API access
    const result = await drive.files.list({
      pageSize: 1,
      fields: 'files(id, name)'
    });
    
    console.log('Drive API test successful');
    
    // Test accessing the main folder
    const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID;
    const folders = await drive.files.list({
      q: `parents in '${mainFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'name'
    });
    
    res.status(200).json({
      success: true,
      driveApiWorking: true,
      mainFolderId: mainFolderId,
      foldersFound: folders.data.files?.length || 0,
      folders: folders.data.files || []
    });
    
  } catch (error) {
    console.error('Google Drive test error:', error);
    res.status(500).json({
      error: error.message,
      code: error.code,
      details: error.response?.data || 'No additional details'
    });
  }
}
