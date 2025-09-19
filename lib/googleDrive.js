// Replace your lib/googleDrive.js with this OAuth-based version

import { google } from 'googleapis';
import { getServerSession } from 'next-auth/next';

// Create OAuth2 client using the same credentials as NextAuth
function createDriveClient(accessToken) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

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
export async function createEntityFolderStructure(entityName, entityType, accessToken) {
  try {
    const drive = createDriveClient(accessToken);
    const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID;
    
    // Create entity folder
    const entityFolder = await createOrGetFolder(entityName, mainFolderId, drive);
    
    // Define folder structure based on entity type
    let categories = [];
    
    if (entityType === 'business') {
      categories = [
        'GST', 'Income Tax', 'ROC', 'TDS', 'Accounts',
        'Bank Statements', 'Agreements', 'Licenses', 'Others'
      ];
    } else if (entityType === 'personal') {
      categories = [
        'Identity Documents', 'Income Tax', 'Investments', 'Bank Statements', 
        'Property Documents', 'Medical Records', 'Educational', 'Others'
      ];
    }
    
    // Create category folders and their subfolders
    const categoryFolders = {};
    for (const category of categories) {
      const categoryFolder = await createOrGetFolder(category, entityFolder.id, drive);
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
          const yearFolder = await createOrGetFolder(fy, categoryFolder.id, drive);
          
          // For GST and TDS, create month folders
          if (['GST', 'TDS'].includes(category)) {
            const monthNames = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ];
            
            for (const month of monthNames) {
              await createOrGetFolder(month, yearFolder.id, drive);
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

async function createOrGetFolder(name, parentId, drive) {
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
export async function getTargetFolder(entityName, category = null, financialYear = null, month = null, accessToken) {
  try {
    const drive = createDriveClient(accessToken);
    const mainFolderId = process.env.MAIN_DRIVE_FOLDER_ID;
    
    // Start with entity folder
    let currentFolder = await createOrGetFolder(entityName, mainFolderId, drive);
    
    // If category is specified, create category folder
    if (category) {
      currentFolder = await createOrGetFolder(category, currentFolder.id, drive);
      
      // If financial year is specified and category is not Others
      if (financialYear && category !== 'Others') {
        currentFolder = await createOrGetFolder(financialYear, currentFolder.id, drive);
        
        // If month is specified for relevant categories
        if (month && ['GST', 'TDS'].includes(category)) {
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          const monthName = monthNames[parseInt(month) - 1];
          currentFolder = await createOrGetFolder(monthName, currentFolder.id, drive);
        }
      }
    }
    
    return currentFolder;
  } catch (error) {
    console.error('Error getting target folder:', error);
    throw error;
  }
}

// Upload file to Google Drive using OAuth
export async function uploadFileToGoogleDrive(fileBuffer, fileName, mimeType, parentFolderId, accessToken) {
  try {
    console.log('Starting OAuth Google Drive upload:', {
      fileName,
      mimeType,
      bufferSize: fileBuffer?.length,
      parentFolderId
    });

    const drive = createDriveClient(accessToken);
    
    // Convert buffer to base64 for reliable upload
    const base64Data = fileBuffer.toString('base64');

    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentFolderId],
      },
      media: {
        mimeType: mimeType,
        body: Buffer.from(base64Data, 'base64')
      },
      fields: 'id, name, size, createdTime, mimeType'
    });
    
    console.log('OAuth Google Drive upload successful:', file.data);
    return file.data;
  } catch (error) {
    console.error('OAuth Google Drive upload error:', error);
    throw error;
  }
}

// Get file metadata
export async function getFileMetadata(fileId, accessToken) {
  try {
    const drive = createDriveClient(accessToken);
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
export async function listFilesInFolder(folderId, pageSize = 50, pageToken = null, accessToken) {
  try {
    const drive = createDriveClient(accessToken);
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
export async function getEntityFolderStructure(entityName, accessToken) {
  try {
    const drive = createDriveClient(accessToken);
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
    const structure = await buildFolderTree(entityFolder.id, drive);
    
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
async function buildFolderTree(folderId, drive, level = 0) {
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
        const subStructure = await buildFolderTree(item.id, drive, level + 1);
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

// Search files across Google Drive
export async function searchFiles(query, entityName = null, accessToken) {
  try {
    const drive = createDriveClient(accessToken);
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

// Helper function to get access token from session
export async function getAccessToken(req, res) {
  try {
    const { authOptions } = await import('../pages/api/auth/[...nextauth]');
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || !session.accessToken) {
      throw new Error('No valid session or access token found');
    }
    
    return session.accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}
