import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.accessToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { folderId, email, role } = req.body;

    if (!folderId || !email) {
      return res.status(400).json({ error: 'Folder ID and email are required' });
    }

    // Validate role
    const validRoles = ['reader', 'writer', 'commenter'];
    const shareRole = validRoles.includes(role) ? role : 'reader';

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Share the folder
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        type: 'user',
        role: shareRole,
        emailAddress: email,
      },
      sendNotificationEmail: true,
      emailMessage: `${session.user.name} has shared a folder with you from Business DocCenter.`
    });

    console.log(`Folder ${folderId} shared with ${email} as ${shareRole}`);

    res.status(200).json({
      success: true,
      message: `Folder shared with ${email} successfully`
    });

  } catch (error) {
    console.error('Error sharing folder:', error);
    res.status(500).json({
      error: 'Failed to share folder',
      details: error.message
    });
  }
}
