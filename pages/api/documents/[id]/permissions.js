import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { google } from 'googleapis';
import { getDocumentById } from '../../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.accessToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    // Get document from MongoDB
    const doc = await getDocumentById(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
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

    // Get all permissions
    const permissionsResponse = await drive.permissions.list({
      fileId: doc.googleDriveId,
      fields: 'permissions(id, emailAddress, role, type, displayName)'
    });

    // Filter out owner and only show user permissions
    const sharedWith = permissionsResponse.data.permissions.filter(
      p => p.type === 'user' && p.role !== 'owner'
    );

    res.status(200).json({
      documentId: id,
      fileName: doc.fileName,
      sharedWith
    });

  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({
      error: 'Failed to get permissions',
      details: error.message
    });
  }
}
