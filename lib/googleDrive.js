import { google } from 'googleapis';
import { Readable } from 'stream';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
  ],
});

export const drive = google.drive({ version: 'v3', auth });

// Generate Indian Financial Years
export function generateFinancialYears() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-based
  
  // If current month is April or later, we're in the new financial year
  const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
  
  const years = [];
  for (let year = 1950; year <= startYear + 1; year++) {
    years.push({
      value: `${year}-${(year + 1).toString().slice(-2)}`,
      label: `FY ${year}-${(year + 1).toString().slice(-2)}`
    });
  }
  
  return years.reverse(); // Most recent first
}

// Create complete folder structure for a new entity
export async function createEntityFolderStructure(entityName, entityType) {
  try {
    const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID;
    
    // Create entity folder
    const entityFolder = await createOrGetFolder(entityName, mainFolderId);
    
    // Define folder structure based on entity type
    let categories = [];
    
    if (entityType === 'business') {
      categories = [
        'GST',
        'Income Tax', 
        'ROC',
        'TDS',
        'Accounts',
        'Bank Statements',
        'Agreements',
        'Licenses',
        'Others'
      ];
    } else if (entityType === 'personal') {
      categories = [
        'Identity Documents',
        'Income Tax',
        'Investments',
        'Bank Statements', 
        'Property Documents',
        'Medical Records',
        'Educational',
        'Others'
      ];
    }
    
    // Create category folders and their subfolders
    const categoryFolders = {};
    for (const category of categories) {
      const categoryFolder = await createOrGetFolder(category, entityFolder.id);
      categoryFolders[category] = categoryFolder;
      
      // For business entities, create year folders for specific categories
      if (entityType === 'business' && ['GST', 'Income Tax', 'ROC', 'TDS', 'Accounts'].includes(category)) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth(); // 0-based
        const startYear = currentMonth >= 3 ? currentYear : currentYear - 1; // Financial year logic
        
        // Create current and next financial year folders
        const financialYears = [
          `${startYear}-${(startYear + 1).toString().slice(-2)}`,
          `${startYear + 1}-${(startYear + 2).toString().slice(-2)}`
        ];
        
        for (const fy of financialYears) {
          const yearFolder = await createOrGetFolder(fy, categoryFolder.id);
          
          // For GST and TDS, create month folders
          if (['GST', 'TDS'].includes(category)) {
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            
            for (const month of monthNames) {
              await createOrGetFolder(month, yearFolder.id);
            }
          }
        }
      }
    }
    
    console.log(`Created folder structure for ${entityType} entity: ${entityName}`);
    
    return {
      entityFolder,
      categoryFolders,
      entityType,
      totalFoldersCreated: Object.keys(categoryFolders).length
    };
  } catch (error) {
    console.error('Error creating entity folder structure:', error);
    throw error;
  }
}
async function createOrGetFolder(name, parentId) {
  try {
    // Check if folder exists
    const existing = await drive.files.list({
      q: `name='${name}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, createdTime)'
    });
    
    if (existing.data.files && existing.data.files.length > 0) {
      return existing.data.files[0];
    }
    
    // Create new folder
    const folder = await drive.files.create({
      requestBody: {
        name,
        parents: [parentId],
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id, name, createdTime'
    });
    
    return folder.data;
  } catch (error) {
    console.error('Error creating/getting folder:', error);
    throw error;
  }
}

// Get target folder for document upload based on hierarchy
export async function getTargetFolder(entityName, category = null, financialYear = null, month = null) {
  try {
    const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID;
    
    // Start with entity folder
    let currentFolder = await createOrGetFolder(entityName, mainFolderId);
    
    // If category is specified, create category folder
    if (category) {
      currentFolder = await createOrGetFolder(category, currentFolder.id);
      
      // If financial year is specified and category is not Others
      if (financialYear && category !== 'Others') {
        currentFolder = await createOrGetFolder(financialYear, currentFolder.id);
        
        // If month is specified for relevant categories
        if (month && ['GST', 'TDS'].includes(category)) {
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          const monthName = monthNames[parseInt(month) - 1];
          currentFolder = await createOrGetFolder(monthName, currentFolder.id);
        }
      }
    }
    
    return currentFolder;
  } catch (error) {
    console.error('Error getting target folder:', error);
    throw error;
  }
}

// Upload file to Google Drive
export async function uploadFileToGoogleDrive(fileBuffer, fileName, mimeType, parentFolderId) {
  try {
    console.log('Starting Google Drive upload:', {
      fileName,
      mimeType, 
      bufferSize: fileBuffer?.length,
      parentFolderId
    });

    // Import Readable at the top of your file if not already imported
    const { Readable } = require('stream');
    
    // Convert buffer to readable stream
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null); // End the stream

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentFolderId],
      },
      media: {
        mimeType: mimeType,
        body: bufferStream  // Use the stream instead of buffer
      },
      fields: 'id, name, size, createdTime, mimeType'
    });
    
    console.log('Google Drive upload successful:', file.data);
    return file.data;
  } catch (error) {
    console.error('Google Drive upload error:', error);
    throw error;
  }
}

// Get file from Google Drive
export async function getFileFromGoogleDrive(fileId) {
  try {
    const file = await drive.files.get({
      fileId,
      alt: 'media'
    });
    
    return file.data;
  } catch (error) {
    console.error('Error getting file from Google Drive:', error);
    throw error;
  }
}

// Get file metadata
export async function getFileMetadata(fileId) {
  try {
    const file = await drive.files.get({
      fileId,
      fields: 'id, name, size, createdTime, modifiedTime, mimeType, parents, webViewLink'
    });
    
    return file.data;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw error;
  }
}

// List files in folder with pagination
export async function listFilesInFolder(folderId, pageSize = 50, pageToken = null) {
  try {
    const files = await drive.files.list({
      q: `parents in '${folderId}' and trashed=false`,
      fields: 'nextPageToken, files(id, name, size, createdTime, modifiedTime, mimeType, webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: pageSize,
      pageToken: pageToken
    });
    
    return files.data;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
}

// Get folder structure for entity
export async function getEntityFolderStructure(entityName) {
  try {
    const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID;
    
    // Find entity folder
    const entityFolders = await drive.files.list({
      q: `name='${entityName}' and parents in '${mainFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name, createdTime)'
    });
    
    if (!entityFolders.data.files || entityFolders.data.files.length === 0) {
      return null;
    }
    
    const entityFolder = entityFolders.data.files[0];
    
    // Get category folders and their files
    const structure = await buildFolderTree(entityFolder.id);
    
    return {
      entityFolder,
      structure
    };
  } catch (error) {
    console.error('Error getting folder structure:', error);
    throw error;
  }
}

// Recursively build folder tree with file counts
async function buildFolderTree(folderId, level = 0) {
  if (level > 4) return []; // Prevent infinite recursion
  
  try {
    const items = await drive.files.list({
      q: `parents in '${folderId}' and trashed=false`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime)',
      orderBy: 'createdTime desc'
    });
    
    const folders = [];
    const files = [];
    
    for (const item of items.data.files) {
      if (item.mimeType === 'application/vnd.google-apps.folder') {
        const subStructure = await buildFolderTree(item.id, level + 1);
        folders.push({
          ...item,
          type: 'folder',
          children: subStructure,
          fileCount: countFilesInStructure(subStructure)
        });
      } else {
        files.push({
          ...item,
          type: 'file'
        });
      }
    }
    
    return [...folders, ...files];
  } catch (error) {
    console.error('Error building folder tree:', error);
    return [];
  }
}

// Count files in folder structure
function countFilesInStructure(structure) {
  let count = 0;
  for (const item of structure) {
    if (item.type === 'file') {
      count++;
    } else if (item.type === 'folder' && item.children) {
      count += countFilesInStructure(item.children);
    }
  }
  return count;
}

// Get latest files across all folders for dashboard
export async function getLatestFilesByEntity(entityName, limit = 10) {
  try {
    const structure = await getEntityFolderStructure(entityName);
    if (!structure) return [];
    
    const allFiles = [];
    collectAllFiles(structure.structure, allFiles);
    
    // Sort by creation time and take latest
    allFiles.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
    
    return allFiles.slice(0, limit);
  } catch (error) {
    console.error('Error getting latest files:', error);
    return [];
  }
}

// Recursively collect all files from structure
function collectAllFiles(structure, fileArray, path = '') {
  for (const item of structure) {
    if (item.type === 'file') {
      fileArray.push({
        ...item,
        path: path ? `${path}/${item.name}` : item.name
      });
    } else if (item.type === 'folder' && item.children) {
      collectAllFiles(
        item.children, 
        fileArray, 
        path ? `${path}/${item.name}` : item.name
      );
    }
  }
}

// Search files across Google Drive
export async function searchFiles(query, entityName = null) {
  try {
    const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID;
    
    let searchQuery = `parents in '${mainFolderId}' and trashed=false and (name contains '${query}')`;
    
    if (entityName) {
      // First get entity folder ID
      const entityFolders = await drive.files.list({
        q: `name='${entityName}' and parents in '${mainFolderId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      });
      
      if (entityFolders.data.files && entityFolders.data.files.length > 0) {
        searchQuery = `parents in '${entityFolders.data.files[0].id}' and trashed=false and (name contains '${query}')`;
      }
    }
    
    const results = await drive.files.list({
      q: searchQuery,
      fields: 'files(id, name, size, createdTime, modifiedTime, mimeType, parents, webViewLink)',
      orderBy: 'createdTime desc'
    });
    
    return results.data.files || [];
  } catch (error) {
    console.error('Error searching files:', error);
    throw error;
  }
}

// Create or update staff access CSV
export async function updateStaffAccessCSV(staffData) {
  try {
    const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID;
    const fileName = '.staff_access.csv';
    
    // Check if file exists
    const existing = await drive.files.list({
      q: `name='${fileName}' and parents in '${mainFolderId}' and trashed=false`,
    });
    
    // Create CSV content
    const csvHeaders = 'Name,Email,Role,Status,CreatedDate,LastModified\n';
    const csvRows = staffData.map(staff => 
      `"${staff.name}","${staff.email}","${staff.role}","${staff.status}","${staff.createdDate}","${new Date().toISOString()}"`
    ).join('\n');
    const csvContent = csvHeaders + csvRows;
    
    if (existing.data.files && existing.data.files.length > 0) {
      // Update existing file
      await drive.files.update({
        fileId: existing.data.files[0].id,
        media: {
          body: csvContent,
          mimeType: 'text/csv',
        },
      });
    } else {
      // Create new file
      await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [mainFolderId],
        },
        media: {
          body: csvContent,
          mimeType: 'text/csv',
        },
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating staff access CSV:', error);
    throw error;
  }
}

// Read staff access CSV
export async function readStaffAccessCSV() {
  try {
    const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID;
    const fileName = '.staff_access.csv';
    
    const existing = await drive.files.list({
      q: `name='${fileName}' and parents in '${mainFolderId}' and trashed=false`,
    });
    
    if (!existing.data.files || existing.data.files.length === 0) {
      return [];
    }
    
    const fileContent = await drive.files.get({
      fileId: existing.data.files[0].id,
      alt: 'media'
    });
    
    // Parse CSV content
    const lines = fileContent.data.split('\n');
    const headers = lines[0].split(',');
    const staffData = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',');
        staffData.push({
          name: values[0]?.replace(/"/g, '') || '',
          email: values[1]?.replace(/"/g, '') || '',
          role: values[2]?.replace(/"/g, '') || '',
          status: values[3]?.replace(/"/g, '') || '',
          createdDate: values[4]?.replace(/"/g, '') || '',
          lastModified: values[5]?.replace(/"/g, '') || ''
        });
      }
    }
    
    return staffData;
  } catch (error) {
    console.error('Error reading staff access CSV:', error);
    return [];
  }
}
