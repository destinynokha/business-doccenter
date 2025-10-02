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

    const { documentIds, recipientEmail, message, permission } = req.body;

    if (!documentIds || documentIds.length === 0) {
      return res.status(400).json({ error: 'No documents selected' });
    }

    if (!recipientEmail) {
      return res.status(400).json({ error: 'Recipient email is required' });
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
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get document details and share each one
    const sharedDocs = [];
    for (const docId of documentIds) {
      const doc = await getDocumentById(docId);
      if (!doc) continue;

      try {
        // Share the document in Google Drive
        await drive.permissions.create({
          fileId: doc.googleDriveId,
          requestBody: {
            type: 'user',
            role: permission || 'reader',
            emailAddress: recipientEmail,
          },
          sendNotificationEmail: false, // We'll send our own email
        });

        sharedDocs.push({
          name: doc.fileName,
          link: doc.googleDriveLink || `https://drive.google.com/file/d/${doc.googleDriveId}/view`
        });
      } catch (error) {
        console.error(`Error sharing document ${doc.fileName}:`, error);
      }
    }

    if (sharedDocs.length === 0) {
      throw new Error('Failed to share any documents');
    }

    // Send email with links
    const emailBody = createEmailBody(
      session.user.name,
      recipientEmail,
      sharedDocs,
      message
    );

    const emailMessage = [
      `To: ${recipientEmail}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${session.user.name} shared ${sharedDocs.length} document(s) with you`,
      '',
      emailBody
    ].join('\n');

    const encodedEmail = Buffer.from(emailMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    res.status(200).json({
      success: true,
      message: `${sharedDocs.length} document(s) shared with ${recipientEmail}`,
      sharedCount: sharedDocs.length
    });

  } catch (error) {
    console.error('Error sharing documents:', error);
    res.status(500).json({
      error: 'Failed to share documents',
      details: error.message
    });
  }
}

function createEmailBody(senderName, recipientEmail, documents, customMessage) {
  const docLinks = documents.map(doc => 
    `<li><a href="${doc.link}" style="color: #3b82f6; text-decoration: none;">${doc.name}</a></li>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Business DocCenter</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Document Sharing</p>
  </div>
  
  <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${senderName}</strong> has shared ${documents.length} document(s) with you:
    </p>
    
    ${customMessage ? `
      <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
        <p style="margin: 0; font-style: italic; color: #4b5563;">"${customMessage}"</p>
      </div>
    ` : ''}
    
    <ul style="list-style: none; padding: 0;">
      ${docLinks}
    </ul>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        You can now view and access these documents in your Google Drive
      </p>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>Sent via Business DocCenter</p>
  </div>
</body>
</html>
  `;
}
