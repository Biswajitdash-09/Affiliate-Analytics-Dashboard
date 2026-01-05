import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

if (uri) {
  // Validation to prevent MongoParseError
  // This ensures the URI has the correct protocol prefix before attempting to connect
  if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
    if (process.env.NODE_ENV === 'development') {
      // In development mode, use a global variable so that the value
      // is preserved across module reloads caused by HMR (Hot Module Replacement).
      if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
      }
      clientPromise = global._mongoClientPromise;
    } else {
      // In production mode, it's best to not use a global variable.
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
  } else {
    console.error('Invalid MONGODB_URI: It must start with "mongodb://" or "mongodb+srv://"');
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

/**
 * Helper function to get the database instance directly.
 * Useful for cleaner code in API routes.
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDb() {
  if (!uri) {
    throw new Error('Please add your Mongo URI to .env');
  }

  if (!clientPromise) {
    throw new Error('MongoDB client is not initialized. Check your MONGODB_URI configuration.');
  }

  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB);
}