import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getDocumentsByEntity } from '../../../lib/mongodb';

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
      return res.status(400).json({ error: 'Entity name is required' });
    }

    console.log('Getting structure for entity:', entity);

    // Get all documents for this entity from MongoDB
    const documents = await getDocumentsByEntity(entity);

    // Build folder structure from documents
    const structure = buildStructureFromDocuments(documents);

    res.status(200).json(structure);

  } catch (error) {
    console.error('Error getting document structure:', error);
    res.status(500).json({
      error: 'Failed to get document structure',
      details: error.message
    });
  }
}

function buildStructureFromDocuments(documents) {
  const structure = {};

  for (const doc of documents) {
    const parts = doc.filePath.split('/');
    let current = structure;

    // Build nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {
          type: 'folder',
          name: part,
          children: {},
          files: []
        };
      }
      current = current[part].children;
    }

    // Add file to the last folder
    const fileName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');
    
    if (!current.files) {
      current.files = [];
    }

    current.files = current.files || [];
    current.files.push({
      id: doc._id.toString(),
      name: fileName,
      fileName: doc.fileName,
      googleDriveId: doc.googleDriveId,
      googleDriveLink: doc.googleDriveLink,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      createdAt: doc.createdAt,
      category: doc.category,
      financialYear: doc.financialYear,
      month: doc.month,
      tags: doc.tags || [],
      description: doc.description || ''
    });
  }

  return structure;
}
