import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getStaffMembers } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only admin users can view staff list
    if (session.user.permissions !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const staffMembers = await getStaffMembers();
    res.status(200).json(staffMembers);

  } catch (error) {
    console.error('Error getting staff members:', error);
    res.status(500).json({ 
      error: 'Failed to get staff members', 
      details: error.message 
    });
  }
}
