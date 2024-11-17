import { Request, Response } from 'express';
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'VYU';
const client = new MongoClient(mongoURI);

// Utility Function to Connect to MongoDB
const connectToCollection = async (collectionName: string) => {
  await client.connect();
  const db = client.db(dbName);
  return db.collection(collectionName);
};

// Utility Function to Validate Query Parameters
const validateQueryParams = (params: string[], req: Request, res: Response): boolean => {
  for (const param of params) {
    const value = req.query[param];
    if (!value || typeof value !== 'string') {
      res.status(400).json({ message: `${param} is required and must be a string.` });
      return false;
    }
  }
  return true;
};

// Helper function to format date in IST
const formatDateInIST = (dateStr: string): Date => {
  // Create date object from the incoming date string (in IST)
  const date = new Date(dateStr);

  // Set the date to IST (UTC +5:30)
  const offset = 5.5 * 60 * 60 * 1000; // IST is UTC +5:30 (in milliseconds)
  date.setTime(date.getTime() + offset);

  // Return the date in IST
  return date;
};

// 1. Get All Collection Names
export const getAllCollections = async (req: Request, res: Response): Promise<void> => {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((collection) => collection.name);
    res.status(200).json({ collections: collectionNames });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching collections', error });
  } finally {
    await client.close();
  }
};

// 2. Get All Data from a Collection
export const getAllDataFromCollection = async (req: Request, res: Response): Promise<void> => {
  if (!validateQueryParams(['collectionName'], req, res)) return;
  const collectionName = req.query.collectionName as string;
  try {
    const collection = await connectToCollection(collectionName);
    const allData = await collection.find({}).toArray();
    res.status(200).json(allData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching data from collection', error });
  } finally {
    await client.close();
  }
};

// 3. Get Total Document Count of a Collection
export const getDocCountFromCollection = async (req: Request, res: Response): Promise<void> => {
  if (!validateQueryParams(['collectionName'], req, res)) return;
  const collectionName = req.query.collectionName as string;
  try {
    const collection = await connectToCollection(collectionName);
    const count = await collection.countDocuments();
    res.status(200).json({ collection: collectionName, count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching document count', error });
  } finally {
    await client.close();
  }
};

// 4. Get Recent Document Count
export const getRecentDocCount = async (req: Request, res: Response): Promise<void> => {
  if (!validateQueryParams(['collection'], req, res)) return;
  const collectionName = req.query.collection as string;
  const daysParam = req.query.days as string | undefined;
  const recentDays = parseInt(daysParam || '7', 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - recentDays);
  try {
    const collection = await connectToCollection(collectionName);
    const count = await collection.countDocuments({ createdAt: { $gte: startDate } });
    res.status(200).json({ collection: collectionName, recentDays, count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent documents count', error });
  } finally {
    await client.close();
  }
};
export const getFilteredDataCount = async (req: Request, res: Response): Promise<void> => {
  if (!validateQueryParams(['collection', 'rule'], req, res)) return;

  const collectionName = req.query.collection as string;
  const rule = req.query.rule as string;

  try {
      const collection = mongoose.connection.collection(collectionName);
      
      const pipeline = [
          {
              $match: {
                  topic: collectionName
              }
          },
          {
              $addFields: {
                  parsedMessage: {
                      $let: {
                          vars: {
                              jsonString: {
                                  $rtrim: {
                                      input: "$message",
                                      chars: "\n"
                                  }
                              }
                          },
                          in: { 
                              $getField: {
                                  field: "Source",
                                  input: { $parse: "$$jsonString" }
                              }
                          }
                      }
                  }
              }
          },
          {
              $match: {
                  "parsedMessage.Rule": rule
              }
          },
          {
              $count: "total"
          }
      ];

      const result = await collection.aggregate(pipeline).toArray();
      
      res.status(200).json({
          collection: collectionName,
          rule,
          count: result[0]?.total || 0
      });

  } catch (error) {
      // Try an alternative approach if the first one fails
      try {
          const collection = mongoose.connection.collection(collectionName);
          const documents = await collection.find({ topic: collectionName }).toArray();
          
          // Manual counting by parsing JSON
          const count = documents.reduce((acc, doc) => {
              try {
                  const parsed = JSON.parse(doc.message);
                  if (parsed.Source && parsed.Source.Rule === rule) {
                      return acc + 1;
                  }
              } catch (e) {
                  // Skip invalid JSON
              }
              return acc;
          }, 0);

          res.status(200).json({
              collection: collectionName,
              rule,
              count
          });

      } catch (fallbackError) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          res.status(500).json({
              message: 'Error fetching filtered data count',
              error: errorMessage
          });
      }
  }
};

// 6. Perform Addition of a Given Field
export const getFieldSums = async (req: Request, res: Response): Promise<void> => {
  const collectionName = req.query.collection as string;
  const fieldsToSumParam = req.query.field;
  if (!collectionName || typeof collectionName !== 'string') {
    res.status(400).json({ message: "Collection name is required and must be a string." });
    return;
  }
  const fieldsToSum: string[] = Array.isArray(fieldsToSumParam)
    ? (fieldsToSumParam as string[]).map((field) => String(field))
    : fieldsToSumParam
    ? [String(fieldsToSumParam)]
    : [];
  if (fieldsToSum.length === 0) {
    res.status(400).json({ message: "Field is required and must be a string or an array of strings." });
    return;
  }
  try {
    const collection = await connectToCollection(collectionName);
    const projectionStage = fieldsToSum.reduce((acc, field) => {
      acc[field] = { $toDouble: `$${field}` };
      return acc;
    }, {} as Record<string, any>);
    const groupStage = fieldsToSum.reduce((acc, field) => {
      acc[field] = { $sum: `$${field}` };
      return acc;
    }, {} as Record<string, any>);
    const result = await collection
      .aggregate([
        { $project: projectionStage },
        { $group: { _id: null, ...groupStage } },
      ])
      .toArray();
    const fieldSums = result.length > 0 ? result[0] : {};
    delete fieldSums._id;
    res.status(200).json({ collection: collectionName, fieldSums });
  } catch (error) {
    res.status(500).json({ message: 'Error summing the fields', error });
  } finally {
    await client.close();
  }
};

// 7. controller for fetching the data w.r.t start and end time stamp (YYYY-MM-DDTHH:MM) format
export const getDataByDateRange = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { collectionName, startDate, endDate } = req.query;

    // Validate input parameters
    if (!collectionName || typeof collectionName !== 'string') {
      return res.status(400).json({ message: "A valid 'collectionName' parameter is required." });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "'startDate' and 'endDate' parameters are required." });
    }

    // Format the dates to Indian Standard Time (IST)
    const formattedStartDate = formatDateInIST(startDate as string);
    const formattedEndDate = formatDateInIST(endDate as string);

    // Connect to the MongoDB client
    await client.connect();
    const db = client.db(dbName);

    // Access the specified collection
    const collection = db.collection(collectionName);

    // Query the collection for documents within the date range
    const data = await collection.find({
      createdAt: {
        $gte: formattedStartDate,
        $lte: formattedEndDate,
      },
    }).toArray();

    // Return the filtered data
    return res.status(200).json({ count: data.length, data });
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching data for the given date range', error });
  } finally {
    await client.close(); // Ensure the MongoDB client is closed after the query
  }
};
