import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { searchDocuments } from '../../lib/mongodb';
import { searchFiles } from '../../lib/googleDrive';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { q: query, entity, year, month } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Smart search logic
    let searchResults = [];

    // 1. Search in MongoDB (for OCR text, tags, descriptions, filenames)
    const filters = {};
    if (entity) filters.entityName = entity;
    if (year) filters.financialYear = year;
    if (month) filters.month = parseInt(month);

    const dbResults = await searchDocuments(query.trim(), filters);

    // 2. Also search Google Drive directly for filenames
    const driveResults = await searchFiles(query.trim(), entity);

    // 3. Combine and deduplicate results
    const combinedResults = new Map();

    // Add database results (priority since they have more metadata)
    dbResults.forEach(doc => {
      combinedResults.set(doc.googleDriveId, {
        id: doc.googleDriveId,
        name: doc.fileName,
        originalName: doc.originalFileName,
        path: doc.filePath,
        entityName: doc.entityName,
        category: doc.category,
        financialYear: doc.financialYear,
        month: doc.month,
        size: doc.fileSize,
        mimeType: doc.mimeType,
        createdTime: doc.createdAt,
        modifiedTime: doc.updatedAt,
        ocrText: doc.ocrText,
        tags: doc.tags,
        description: doc.description,
        webViewLink: `https://drive.google.com/file/d/${doc.googleDriveId}/view`,
        source: 'database'
      });
    });

    // Add Google Drive results that aren't in database yet
    driveResults.forEach(file => {
      if (!combinedResults.has(file.id)) {
        combinedResults.set(file.id, {
          id: file.id,
          name: file.name,
          path: file.name,
          size: parseInt(file.size) || 0,
          mimeType: file.mimeType,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          webViewLink: file.webViewLink,
          source: 'drive'
        });
      }
    });

    // Convert to array and sort by relevance/date
    searchResults = Array.from(combinedResults.values());

    // Smart ranking: prioritize results with OCR matches, then filename matches
    searchResults.sort((a, b) => {
      const queryLower = query.toLowerCase();
      
      // Score calculation
      let scoreA = 0, scoreB = 0;
      
      // OCR text match (highest priority)
      if (a.ocrText && a.ocrText.toLowerCase().includes(queryLower)) scoreA += 100;
      if (b.ocrText && b.ocrText.toLowerCase().includes(queryLower)) scoreB += 100;
      
      // Filename exact match
      if (a.name.toLowerCase().includes(queryLower)) scoreA += 50;
      if (b.name.toLowerCase().includes(queryLower)) scoreB += 50;
      
      // Tags match
      if (a.tags && a.tags.some(tag => tag.toLowerCase().includes(queryLower))) scoreA += 30;
      if (b.tags && b.tags.some(tag => tag.toLowerCase().includes(queryLower))) scoreB += 30;
      
      // Description match
      if (a.description && a.description.toLowerCase().includes(queryLower)) scoreA += 20;
      if (b.description && b.description.toLowerCase().includes(queryLower)) scoreB += 20;
      
      // Year/month match for time-based searches
      const yearMatch = query.match(/\d{4}[-/]\d{2}/);
      if (yearMatch) {
        if (a.financialYear && a.financialYear.includes(yearMatch[0])) scoreA += 40;
        if (b.financialYear && b.financialYear.includes(yearMatch[0])) scoreB += 40;
      }
      
      // Month name match
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                         'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = monthNames.findIndex(month => queryLower.includes(month));
      if (monthIndex >= 0) {
        if (a.month === monthIndex + 1) scoreA += 30;
        if (b.month === monthIndex + 1) scoreB += 30;
      }
      
      // If scores are equal, sort by date (newest first)
      if (scoreA === scoreB) {
        return new Date(b.createdTime || b.modifiedTime) - new Date(a.createdTime || a.modifiedTime);
      }
      
      return scoreB - scoreA;
    });

    // Limit results to top 50
    searchResults = searchResults.slice(0, 50);

    res.status(200).json(searchResults);

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      details: error.message 
    });
  }
}
