import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { updateStaffAccessCSV, readStaffAccessCSV } from '../../../lib/googleDrive';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Only admin can remove staff
    if (session.user.permissions !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Read existing staff data
    const existingStaff = await readStaffAccessCSV();
    
    // Find staff member
    const staffIndex = existingStaff.findIndex(staff => staff.email === email);
    if (staffIndex === -1) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Remove staff member
    const removedStaff = existingStaff[staffIndex];
    existingStaff.splice(staffIndex, 1);
    
    // Save updated list to Google Drive CSV
    await updateStaffAccessCSV(existingStaff);
    
    res.status(200).json({ 
      success: true, 
      message: `Staff member ${removedStaff.name} removed successfully`
    });

  } catch (error) {
    console.error('Error removing staff member:', error);
    res.status(500).json({ 
      error: 'Failed to remove staff member', 
      details: error.message 
    });
  }
}
