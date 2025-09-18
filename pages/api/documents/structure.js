import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getEntityFolderStructure } from '../../../lib/googleDrive';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { entity } = req.query;
    
    if (!entity) {
      return res.status(400).json({ error: 'Entity parameter is required' });
    }

    const structure = await getEntityFolderStructure(entity);
    res.status(200).json(structure);

  } catch (error) {
    console.error('Error getting document structure:', error);
    res.status(500).json({ 
      error: 'Failed to get document structure', 
      details: error.message 
    });
  }
}
