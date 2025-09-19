export default async function handler(req, res) {
  try {
    const env = {
      NODE_ENV: process.env.NODE_ENV,
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'MISSING',
      MONGODB_URI_PREFIX: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + '...' : 'MISSING',
      GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'SET' : 'MISSING',
      GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? 'SET' : 'MISSING',
      MAIN_DRIVE_FOLDER_ID: process.env.MAIN_DRIVE_FOLDER_ID ? 'SET' : 'MISSING',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'MISSING',
    };

    // Test MongoDB connection
    let mongoTest = 'NOT_TESTED';
    try {
      const { connectToDatabase } = await import('../../lib/mongodb');
      mongoTest = 'IMPORT_SUCCESS';
      
      const { db } = await connectToDatabase();
      mongoTest = `CONNECTION_SUCCESS: ${db.databaseName}`;
    } catch (mongoError) {
      mongoTest = `ERROR: ${mongoError.message}`;
    }

    res.status(200).json({
      timestamp: new Date().toISOString(),
      environment: env,
      mongodb: mongoTest
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
