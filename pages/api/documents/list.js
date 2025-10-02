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
      return res.status(400).json({ error: 'Entity parameter is required' });
    }

    console.log('Fetching documents for entity:', entity);

    const documents = await getDocumentsByEntity(entity, 1000);

    const formattedDocs = documents.map(doc => ({
      id: doc._id.toString(),
      googleDriveId: doc.googleDriveId,
      googleDriveLink: doc.googleDriveLink,
      fileName: doc.fileName,
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      category: doc.category,
      financialYear: doc.financialYear,
      month: doc.month,
      description: doc.description,
      tags: doc.tags,
      ocrText: doc.ocrText,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      uploadedBy: doc.uploadedBy,
      uploadedByName: doc.uploadedByName
    }));

    console.log(`Found ${formattedDocs.length} documents`);

    res.status(200).json(formattedDocs);

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({
      error: 'Failed to fetch documents',
      details: error.message
    });
  }
}
