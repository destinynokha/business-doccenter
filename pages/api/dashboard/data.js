import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getDocuments } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all documents from MongoDB
    const documents = await getDocuments();
    
    // Extract unique entities
    const entities = [...new Set(documents.map(doc => doc.entityName))].filter(Boolean);
    
    // Calculate stats
    const stats = {
      totalDocuments: documents.length,
      activeEntities: entities.length,
      totalSize: documents.reduce((sum, doc) => sum + (doc.fileSize || 0), 0)
    };
    
    // Get latest files for each entity from MongoDB
    const latestFiles = {};
    
    for (const entity of entities) {
      try {
        // Get latest 10 files for this entity
        const entityDocs = documents
          .filter(doc => doc.entityName === entity)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
          .map(doc => ({
            id: doc._id.toString(),
            googleDriveId: doc.googleDriveId,
            googleDriveLink: doc.googleDriveLink,
            name: doc.fileName,
            fileName: doc.fileName,
            path: doc.filePath,
            mimeType: doc.mimeType,
            fileSize: doc.fileSize || 0,
            size: doc.fileSize || 0,
            createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
            modifiedTime: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
            category: doc.category || '',
            financialYear: doc.financialYear || '',
            month: doc.month || null,
            ocrText: doc.ocrText || '',
            tags: doc.tags || [],
            description: doc.description || ''
          }));
        
        latestFiles[entity] = entityDocs;
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
