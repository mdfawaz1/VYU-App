import { MongoClient, Db } from 'mongodb';

let db: Db | undefined;

export const connectToDatabase = async (): Promise<Db> => {
  if (!db) {
    try {
      const client = new MongoClient('mongodb://localhost:27017');
      const connection = await client.connect();
      db = connection.db('your-database-name');  // Ensure db is initialized
    } catch (error) {
      throw new Error('Failed to connect to database');
    }
  }
  return db!;
};

// Helper function to get the collection
export const getCollection = async (collectionName: string) => {
  const database = await connectToDatabase();
  return database.collection(collectionName);
};

