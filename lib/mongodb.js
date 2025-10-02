import { MongoClient, ObjectId } from 'mongodb';


// Direct connection approach - bypasses caching issues
let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  // Return cached connection if available
  if (cachedClient && cachedDb) {
    try {
      // Test if connection is still alive
      await cachedDb.admin().ping();
      return { client: cachedClient, db: cachedDb };
    } catch (e) {
      // Connection lost, reconnect
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    await client.connect();
    const db = client.db('business-docs');

    cachedClient = client;
    cachedDb = db;

    console.log('MongoDB connected successfully');
    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

export { ObjectId };

export async function saveDocument(documentData) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('documents').insertOne({
      ...documentData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return result;
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
}

export async function getDocuments(filters = {}) {
  try {
    const { db } = await connectToDatabase();
    const documents = await db.collection('documents')
      .find(filters)
      .sort({ createdAt: -1 })
      .toArray();
    return documents;
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
}

export async function searchDocuments(searchQuery, filters = {}) {
  try {
    const { db } = await connectToDatabase();
    
    const searchFilters = {
      ...filters,
      $or: [
        { fileName: { $regex: searchQuery, $options: 'i' } },
        { originalFileName: { $regex: searchQuery, $options: 'i' } },
        { ocrText: { $regex: searchQuery, $options: 'i' } },
        { tags: { $in: [new RegExp(searchQuery, 'i')] } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { entityName: { $regex: searchQuery, $options: 'i' } },
        { category: { $regex: searchQuery, $options: 'i' } }
      ]
    };

    const yearMatch = searchQuery.match(/(\d{4})-?(\d{2})?/);
    if (yearMatch) {
      searchFilters.$or.push({
        financialYear: { $regex: yearMatch[0], $options: 'i' }
      });
    }

    const monthNames = {
      'january': 1, 'jan': 1, 'february': 2, 'feb': 2, 'march': 3, 'mar': 3,
      'april': 4, 'apr': 4, 'may': 5, 'june': 6, 'jun': 6,
      'july': 7, 'jul': 7, 'august': 8, 'aug': 8, 'september': 9, 'sep': 9,
      'october': 10, 'oct': 10, 'november': 11, 'nov': 11, 'december': 12, 'dec': 12
    };

    const searchLower = searchQuery.toLowerCase();
    for (const [monthName, monthNum] of Object.entries(monthNames)) {
      if (searchLower.includes(monthName)) {
        searchFilters.$or.push({ month: monthNum });
        break;
      }
    }
    
    const documents = await db.collection('documents')
      .find(searchFilters)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
      
    return documents;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

export async function getDocumentById(documentId) {
  try {
    const { db } = await connectToDatabase();
    const document = await db.collection('documents').findOne({ 
      _id: new ObjectId(documentId) 
    });
    return document;
  } catch (error) {
    console.error('Error getting document by ID:', error);
    throw error;
  }
}

export async function updateDocument(documentId, updateData) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('documents').updateOne(
      { _id: new ObjectId(documentId) },
      { 
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      }
    );
    return result;
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
}

export async function getDocumentsByEntity(entityName, limit = 50) {
  try {
    const { db } = await connectToDatabase();
    const documents = await db.collection('documents')
      .find({ entityName })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return documents;
  } catch (error) {
    console.error('Error getting documents by entity:', error);
    throw error;
  }
}

export async function getDocumentStats() {
  try {
    const { db } = await connectToDatabase();
    
    const pipeline = [
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          entities: { $addToSet: '$entityName' }
        }
      },
      {
        $project: {
          totalDocuments: 1,
          totalSize: 1,
          activeEntities: { $size: '$entities' }
        }
      }
    ];
    
    const result = await db.collection('documents').aggregate(pipeline).toArray();
    
    if (result.length === 0) {
      return {
        totalDocuments: 0,
        totalSize: 0,
        activeEntities: 0
      };
    }
    
    return result[0];
  } catch (error) {
    console.error('Error getting document stats:', error);
    return {
      totalDocuments: 0,
      totalSize: 0,
      activeEntities: 0
    };
  }
}

export async function logActivity(activityData) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('activity_logs').insertOne({
      ...activityData,
      timestamp: new Date()
    });
    return result;
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export async function getActivityLogs(limit = 50) {
  try {
    const { db } = await connectToDatabase();
    const logs = await db.collection('activity_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    return logs;
  } catch (error) {
    console.error('Error getting activity logs:', error);
    return [];
  }
}

export async function saveStaffMember(staffData) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('staff').updateOne(
      { email: staffData.email },
      { 
        $set: {
          ...staffData,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    return result;
  } catch (error) {
    console.error('Error saving staff member:', error);
    throw error;
  }
}

export async function getStaffMembers() {
  try {
    const { db } = await connectToDatabase();
    const staff = await db.collection('staff')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return staff;
  } catch (error) {
    console.error('Error getting staff members:', error);
    return [];
  }
}

export async function updateStaffStatus(email, status) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('staff').updateOne(
      { email },
      { 
        $set: {
          status,
          updatedAt: new Date()
        }
      }
    );
    return result;
  } catch (error) {
    console.error('Error updating staff status:', error);
    throw error;
  }
}

export async function getEntityStats(entityName) {
  try {
    const { db } = await connectToDatabase();
    
    const pipeline = [
      { $match: { entityName } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalSize: { $sum: '$fileSize' },
          latestDocument: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1 } }
    ];
    
    const stats = await db.collection('documents').aggregate(pipeline).toArray();
    const totalDocuments = await db.collection('documents').countDocuments({ entityName });
    
    return {
      entityName,
      totalDocuments,
      categories: stats,
      lastActivity: stats.length > 0 ? Math.max(...stats.map(s => s.latestDocument)) : null
    };
  } catch (error) {
    console.error('Error getting entity stats:', error);
    return {
      entityName,
      totalDocuments: 0,
      categories: [],
      lastActivity: null
    };
  }
}

export async function saveEntity(entityData) {
  try {
    const { db } = await connectToDatabase();
    const result = await db.collection('entities').updateOne(
      { entityName: entityData.entityName },
      { 
        $set: { ...entityData, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    return result;
  } catch (error) {
    console.error('Error saving entity:', error);
    throw error;
  }
}

export async function getEntities() {
  try {
    const { db } = await connectToDatabase();
    return await db.collection('entities')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
  } catch (error) {
    console.error('Error getting entities:', error);
    return [];
  }
}
