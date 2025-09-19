import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { readStaffAccessCSV } from '../../../lib/googleDrive';

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

    // Read staff members from Google Drive CSV
    const staffMembers = await readStaffAccessCSV();
    res.status(200).json(staffMembers);

  } catch (error) {
    console.error('Error getting staff members:', error);
    // Return empty array if CSV doesn't exist yet
    res.status(200).json([]);
  }
}
