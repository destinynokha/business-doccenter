// Simplified dashboard API to test basic functionality
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Return mock data to test if the basic API works
    const dashboardData = {
      entities: ['Test Entity 1', 'Test Entity 2'],
      latestFiles: {
        'Test Entity 1': [
          {
            id: 'test1',
            name: 'test-file1.pdf',
            path: 'Test Entity 1/test-file1.pdf',
            size: 1024,
            mimeType: 'application/pdf',
            createdTime: new Date().toISOString(),
            webViewLink: 'https://drive.google.com/file/d/test1/view'
          }
        ],
        'Test Entity 2': []
      },
      stats: {
        totalDocuments: 1,
        activeEntities: 2,
        totalSize: 1024
      }
    };

    res.status(200).json(dashboardData);

  } catch (error) {
    console.error('Simple dashboard error:', error);
    res.status(500).json({ 
      error: 'Dashboard failed', 
      details: error.message,
      stack: error.stack
    });
  }
}
