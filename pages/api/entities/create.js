import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createEntityFolderStructure } from '../../../lib/googleDrive';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { entityName, entityType } = req.body;
    
    if (!entityName || !entityType) {
      return res.status(400).json({ error: 'Entity name and type are required' });
    }

    // Validate entity type
    if (!['business', 'personal'].includes(entityType)) {
      return res.status(400).json({ error: 'Entity type must be business or personal' });
    }

    // Create folder structure in Google Drive
    const folderStructure = await createEntityFolderStructure(entityName, entityType);
    
    res.status(200).json({ 
      success: true, 
      message: `Entity "${entityName}" created successfully`,
      entityName,
      entityType,
      folderStructure
    });

  } catch (error) {
    console.error('Error creating entity:', error);
    res.status(500).json({ 
      error: 'Failed to create entity', 
      details: error.message 
    });
  }
}
