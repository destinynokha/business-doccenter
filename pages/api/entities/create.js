import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { createEntityFolderStructure } from '../../../lib/googleDrive';
import { logActivity } from '../../../lib/mongodb';

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

    console.log(`Creating entity: ${entityName} (${entityType})`);

    // Create folder structure in Google Drive immediately
    const folderStructure = await createEntityFolderStructure(entityName, entityType);
    
    // Log the activity
    await logActivity({
      action: 'entity_created',
      entityName,
      entityType,
      userEmail: session.user.email,
      userName: session.user.name,
      details: `Created ${entityType} entity with folder structure`
    });

    console.log(`Entity created successfully: ${entityName}`);
    
    res.status(200).json({ 
      success: true, 
      message: `Entity "${entityName}" created successfully with complete folder structure in Google Drive`,
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
