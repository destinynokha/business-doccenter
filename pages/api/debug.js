// Simple diagnostic API to check what's failing
export default async function handler(req, res) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {}
    };

    // 1. Check environment variables
    diagnostics.checks.env_vars = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      MONGODB_URI: !!process.env.MONGODB_URI,
      MAIN_DRIVE_FOLDER_ID: !!process.env.MAIN_DRIVE_FOLDER_ID,
      MONGODB_URI_START: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 25) + '...' : 'MISSING'
    };

    // 2. Test MongoDB import
    try {
      const { connectToDatabase } = await import('../../lib/mongodb');
      diagnostics.checks.mongodb_import = 'SUCCESS';
      
      // Try to connect
      const { db } = await connectToDatabase();
      diagnostics.checks.mongodb_connection = 'SUCCESS';
      diagnostics.checks.database_name = db.databaseName;
      
    } catch (mongoError) {
      diagnostics.checks.mongodb_import = 'FAILED';
      diagnostics.checks.mongodb_error = mongoError.message;
    }

    // 3. Test Google Drive import
    try {
      const { drive } = await import('../../lib/googleDrive');
      diagnostics.checks.google_drive_import = 'SUCCESS';
      
      // Try a simple API call
      const about = await drive.about.get({ fields: 'user' });
      diagnostics.checks.google_drive_connection = 'SUCCESS';
      diagnostics.checks.google_user = about.data.user?.emailAddress;
      
    } catch (driveError) {
      diagnostics.checks.google_drive_import = 'FAILED';
      diagnostics.checks.google_drive_error = driveError.message;
    }

    // 4. Test NextAuth import
    try {
      const { getServerSession } = await import('next-auth/next');
      const { authOptions } = await import('./auth/[...nextauth]');
      diagnostics.checks.nextauth_import = 'SUCCESS';
      
      const session = await getServerSession(req, res, authOptions);
      diagnostics.checks.session_check = session ? 'AUTHENTICATED' : 'NOT_AUTHENTICATED';
      
    } catch (authError) {
      diagnostics.checks.nextauth_import = 'FAILED';
      diagnostics.checks.nextauth_error = authError.message;
    }

    res.status(200).json(diagnostics);

  } catch (error) {
    res.status(500).json({
      error: 'Diagnostic failed',
      message: error.message,
      stack: error.stack
    });
  }
}
