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

    // Only admin can update staff
    if (session.user.permissions !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, status, role } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Read existing staff data
    const existingStaff = await readStaffAccessCSV();
    
    // Find staff member
    const staffMemberIndex = existingStaff.findIndex(staff => staff.email === email);
    if (staffMemberIndex === -1) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    // Update staff member
    if (status) {
      existingStaff[staffMemberIndex].status = status;
    }
    if (role) {
      existingStaff[staffMemberIndex].role = role;
    }
    
    existingStaff[staffMemberIndex].lastModified = new Date().toISOString();
    
    // Save updated list to Google Drive CSV
    await updateStaffAccessCSV(existingStaff);
    
    res.status(200).json({ 
      success: true, 
      message: `Staff member ${existingStaff[staffMemberIndex].name} updated successfully`,
      staffMember: existingStaff[staffMemberIndex]
    });

  } catch (error) {
    console.error('Error updating staff member:', error);
    res.status(500).json({ 
      error: 'Failed to update staff member', 
      details: error.message 
    });
  }
}
