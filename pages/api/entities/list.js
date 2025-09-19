import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { drive } from '../../../lib/googleDrive';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get entities by listing folders in the main Google Drive folder
    const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID;
    
    const folders = await drive.files.list({
      q: `parents in '${mainFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'name'
    });

    const entities = folders.data.files ? folders.data.files.map(folder => folder.name) : [];
    
    console.log(`Found ${entities.length} entities:`, entities);
    
    res.status(200).json(entities);

  } catch (error) {
    console.error('Error getting entities:', error);
    res.status(500).json({ 
      error: 'Failed to get entities', 
      details: error.message 
    });
  }
}
