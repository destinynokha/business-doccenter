import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.accessToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { entityName } = req.query;

    if (!entityName) {
      return res.status(400).json({ error: 'Entity name is required' });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Find Business Documents root
    const rootResponse = await drive.files.list({
      q: "name='Business Documents' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (!rootResponse.data.files || rootResponse.data.files.length === 0) {
      return res.status(404).json({ error: 'Business Documents folder not found' });
    }

    const rootId = rootResponse.data.files[0].id;

    // Find entity folder
    const entityResponse = await drive.files.list({
      q: `name='${entityName}' and '${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive'
    });

    if (!entityResponse.data.files || entityResponse.data.files.length === 0) {
      return res.status(404).json({ error: `Entity folder '${entityName}' not found` });
    }

    const entityFolder = entityResponse.data.files[0];

    // Get all subfolders (categories)
    const subfolders = await drive.files.list({
      q: `'${entityFolder.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive',
      orderBy: 'name'
    });

    res.status(200).json({
      entityFolder: {
        id: entityFolder.id,
        name: entityFolder.name,
        webViewLink: entityFolder.webViewLink
      },
      subfolders: subfolders.data.files || []
    });

  } catch (error) {
    console.error('Error listing folders:', error);
    res.status(500).json({
      error: 'Failed to list folders',
      details: error.message
    });
  }
}
