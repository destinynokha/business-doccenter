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

    // Only admin can add staff
    if (session.user.permissions !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, email, role } = req.body;
    
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email and role are required' });
    }

    // Read existing staff data
    const existingStaff = await readStaffAccessCSV();
    
    // Check if email already exists
    const existingStaffMember = existingStaff.find(staff => staff.email === email);
    if (existingStaffMember) {
      return res.status(400).json({ error: 'Staff member with this email already exists' });
    }

    // Add new staff member
    const newStaffMember = {
      name: name.trim(),
      email: email.trim(),
      role,
      status: 'active',
      createdDate: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString()
    };

    const updatedStaff = [...existingStaff, newStaffMember];
    
    // Save to Google Drive CSV
    await updateStaffAccessCSV(updatedStaff);
    
    res.status(200).json({ 
      success: true, 
      message: `Staff member ${name} added successfully`,
      staffMember: newStaffMember
    });

  } catch (error) {
    console.error('Error adding staff member:', error);
    res.status(500).json({ 
      error: 'Failed to add staff member', 
      details: error.message 
    });
  }
}
