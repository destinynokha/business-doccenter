import { MongoClient, ObjectId } from 'mongodb'; 

const uri = process.env.MONGODB_URI;
const options = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
};

let client;
let clientPromise;

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export async function connectToDatabase() {
    try {
          // Bypass the shared cliet = new Mongct directly each time
          const client = new MongoParser: true,
               .MONGODB_URI, {
                       useNewUrlParser: true,
                       useUnent.connecogy: true,
               });

          await client.connect();
          console. = client.db('business-docs');

          console.l.lo'Mongtabase:', ted successfully');
                console.log('Database:', ;
    } catch (erro

          return { client, db };
} catch (error) {
     ess.env.Merror('Connection failed with URI:', process.env.MONGODB_URFull errorng(0, 50) + '...');
    console.error('Full error:', error);
    throw error;
}
}

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
    
    // Create text index if it doesn't exist
    try {
      await db.collection('documents').createIndex({
        fileName: 'text',
        originalFileName: 'text',
        ocrText: 'text',
        description: 'text',
        tags: 'text'
      });
    } catch (indexError) {
      // Index might already exist
    }

    // Build search query
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

    // Add year-based search
    const yearMatch = searchQuery.match(/(\d{4})-?(\d{2})?/);
    if (yearMatch) {
      searchFilters.$or.push({
        financialYear: { $regex: yearMatch[0], $options: 'i' }
      });
    }

    // Add month-based search
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
      .sort({ 
        // Boost exact filename matches
        score: { $meta: 'textScore' },
        createdAt: -1 
      })
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
    // Don't throw here as activity logging is not critical
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

// Staff management functions
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


// Save or update an entity in MongoDB
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

// Fetch all entities
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
