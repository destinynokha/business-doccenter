import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { saveEntity } from '../../../lib/mongodb';
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

    const { entityName, entityType } = req.body;

    if (!entityName || !entityType) {
      return res.status(400).json({ error: 'Entity name and type are required' });
    }

    console.log('Creating entity:', entityName, 'Type:', entityType);

    // Create OAuth2 client with user's access token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Create folder structure in user's Drive
    const folderStructure = await createEntityFolderStructure(drive, entityName, entityType);
    
    // Save entity to MongoDB
    const entityData = {
      entityName,
      entityType,
      rootFolderId: folderStructure.rootFolder.id,
      createdBy: session.user.email,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await saveEntity(entityData);

    console.log('Entity created successfully');

    res.status(200).json({
      success: true,
      message: `Entity "${entityName}" created successfully`,
      entity: entityData
    });

  } catch (error) {
    console.error('Entity creation error:', error);
    res.status(500).json({
      error: 'Failed to create entity',
      details: error.message
    });
  }
}

async function createEntityFolderStructure(drive, entityName, entityType) {
  try {
    // Find or create "Business Documents" root folder
    const rootFolder = await findOrCreateFolder(drive, 'Business Documents', 'root');
    
    // Create entity folder
    const entityFolder = await findOrCreateFolder(drive, entityName, rootFolder.id);
    
    // Define categories based on entity type
    let categories = [];
    if (entityType === 'business') {
      categories = [
        'GST',
        'Income Tax',
        'ROC',
        'TDS',
        'Accounts',
        'Bank Statements',
        'Agreements',
        'Licenses',
        'Others'
      ];
    } else if (entityType === 'personal') {
      categories = [
        'Identity Documents',
        'Income Tax',
        'Investments',
        'Bank Statements',
        'Property Documents',
        'Medical Records',
        'Educational',
        'Others'
      ];
    }

    // Create category folders
    for (const category of categories) {
      await findOrCreateFolder(drive, category, entityFolder.id);
    }

    console.log(`Created folder structure for ${entityType} entity: ${entityName}`);

    return {
      rootFolder: entityFolder,
      categories: categories.length
    };
  } catch (error) {
    console.error('Error creating folder structure:', error);
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
    console.error('Error in findOrCreateFolder:', error);
    throw error;
  }
}
