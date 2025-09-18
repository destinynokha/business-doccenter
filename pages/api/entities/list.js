import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getEntities } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const entities = await getEntities();
    res.status(200).json(entities);

  } catch (error) {
    console.error('Error getting entities:', error);
    res.status(500).json({ 
      error: 'Failed to get entities', 
      details: error.message 
    });
  }
}
