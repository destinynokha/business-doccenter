import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getDocuments } from '../../../lib/mongodb';
import { getLatestFilesByEntity } from '../../../lib/googleDrive';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all documents from database
    const documents = await getDocuments();
    
    // Extract unique entities
    const entities = [...new Set(documents.map(doc => doc.entityName))].filter(Boolean);
    
    // Calculate stats
    const stats = {
      totalDocuments: documents.length,
      activeEntities: entities.length,
      totalSize: documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)
    };
    
    // Get latest files for each entity (from Google Drive)
    const latestFiles = {};
    
    for (const entity of entities) {
      try {
        // Get latest files from Google Drive
        const files = await getLatestFilesByEntity(entity, 10);
        
        // Enrich with database metadata
        const enrichedFiles = files.map(file => {
          const dbDoc = documents.find(doc => doc.googleDriveId === file.id);
          return {
            ...file,
            path: dbDoc ? dbDoc.filePath : file.path,
            ocrText: dbDoc ? dbDoc.ocrText : '',
            tags: dbDoc ? dbDoc.tags : [],
            description: dbDoc ? dbDoc.description : ''
          };
        });
        
        latestFiles[entity] = enrichedFiles;
      } catch (error) {
        console.error(`Error getting files for entity ${entity}:`, error);
        latestFiles[entity] = [];
      }
    }

    const dashboardData = {
      entities,
      latestFiles,
      stats
    };

    res.status(200).json(dashboardData);

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ 
      error: 'Failed to load dashboard data', 
      details: error.message 
    });
  }
}
