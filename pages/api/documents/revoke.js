import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { google } from 'googleapis';
import { getDocumentById } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.accessToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { documentId, email } = req.body;

    if (!documentId || !email) {
      return res.status(400).json({ error: 'Document ID and email are required' });
    }

    // Get document from MongoDB
    const doc = await getDocumentById(documentId);
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

    // Get all permissions for this file
    const permissionsResponse = await drive.permissions.list({
      fileId: doc.googleDriveId,
      fields: 'permissions(id, emailAddress, role)'
    });

    // Find permission for this email
    const permission = permissionsResponse.data.permissions.find(
      p => p.emailAddress === email
    );

    if (!permission) {
      return res.status(404).json({ error: 'No permission found for this email' });
    }

    // Delete the permission
    await drive.permissions.delete({
      fileId: doc.googleDriveId,
      permissionId: permission.id
    });

    console.log(`Revoked access for ${email} on ${doc.fileName}`);

    res.status(200).json({
      success: true,
      message: `Access revoked for ${email}`
    });

  } catch (error) {
    console.error('Error revoking access:', error);
    res.status(500).json({
      error: 'Failed to revoke access',
      details: error.message
    });
  }
}
