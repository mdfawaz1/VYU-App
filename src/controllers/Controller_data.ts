import { Request, Response } from 'express';
import { MongoClient, Db, Collection } from 'mongodb';

// MongoDB client setup and connection management
let db: Db | undefined;

const connectToDatabase = async (): Promise<Db> => {
  if (!db) {
    try {
      const client = new MongoClient('mongodb://localhost:27017');
      const connection = await client.connect();
      db = connection.db('VYU');
    } catch (error) {
      throw new Error('Failed to connect to database');
    }
  }
  return db!;
};

// Helper function to get the collection
const getCollection = async (collectionName: string): Promise<Collection> => {
  const database = await connectToDatabase();
  return database.collection(collectionName);
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
  const date = new Date(dateStr);
  const offset = 5.5 * 60 * 60 * 1000;
  date.setTime(date.getTime() + offset);
  return date;
};

// 1. Get All Collection Names
export const getAllCollections = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await connectToDatabase();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((collection) => collection.name);
    res.status(200).json({ collections: collectionNames });
  } catch (error: unknown) {
    res.status(500).json({ message: 'Error fetching collections', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// 2. Get All Data from a Collection
export const getAllDataFromCollection = async (req: Request, res: Response): Promise<void> => {
  if (!validateQueryParams(['collectionName'], req, res)) return;
  const collectionName = req.query.collectionName as string;
  try {
    const collection = await getCollection(collectionName);
    const allData = await collection.find({}).toArray();
    const count_doc = await collection.countDocuments({});
    res.status(200).json({ count: count_doc, allData });
  } catch (error: unknown) {
    res.status(500).json({ message: 'Error fetching data from collection', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// 3. Get Recent Document Count
export const getRecentDocCount = async (req: Request, res: Response): Promise<void> => {
  if (!validateQueryParams(['collection'], req, res)) return;
  const collectionName = req.query.collection as string;
  const daysParam = req.query.days as string | undefined;
  const recentDays = parseInt(daysParam || '7', 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - recentDays);
  try {
    const collection = await getCollection(collectionName);
    const count = await collection.countDocuments({ createdAt: { $gte: startDate } });
    res.status(200).json({ collection: collectionName, recentDays, count });
  } catch (error: unknown) {
    res.status(500).json({ message: 'Error fetching recent documents count', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// 4. Get Filtered Data Count for cameras
export const getFilteredDataCount = async (req: Request, res: Response): Promise<void> => {
  const collectionName = req.query.collection as string;
  const videoSource = req.query.VideoSource as string;
  const ruleQuery = req.query.Rule as string;
  const startTime = req.query.startTime as string;
  const endTime = req.query.endTime as string;
  if (!videoSource || !ruleQuery) {
    res.status(400).json({ message: "VideoSource and Rule should be mentioned together in query parameters" });
    return;
  }
  const timestampFilter: Record<string, any> = {};
  if (startTime) {
    timestampFilter.$gte = new Date(startTime);
  }
  if (endTime) {
    timestampFilter.$lte = new Date(endTime);
  }
  try {
    const collection = await getCollection(collectionName);
    const documents = await collection
      .find(timestampFilter.$gte || timestampFilter.$lte ? { timestamp: timestampFilter } : {})
      .toArray();
    const requestedRules = ruleQuery.split(',').map((rule) => rule.trim().toLowerCase());
    const ruleCounts: Record<string, number> = {};
    requestedRules.forEach((rule) => {
      ruleCounts[rule] = 0;
    });
    documents.forEach((doc) => {
      try {
        const parsedMessage = JSON.parse(doc.message);
        const videoSourceMatch = parsedMessage.Source?.VideoSource === videoSource;
        const ruleSet = new Set(
          parsedMessage.Source?.Rule?.split(',').map((r: string) => r.trim().toLowerCase()) || []
        );
        requestedRules.forEach((rule) => {
          if (videoSourceMatch && ruleSet.has(rule)) {
            ruleCounts[rule] += 1;
          }
        });
      } catch (error: unknown) {
        console.error("Error parsing message:", error);
      }
    });
    const response: Record<string, any> = {
      collection: collectionName,
      VideoSource: videoSource,
      RuleCounts: ruleCounts,
    };
    if (startTime) {
      response.startTime = startTime;
    }
    if (endTime) {
      response.endTime = endTime;
    }
    res.status(200).json(response);
  } catch (error: unknown) {
    console.error("Error fetching filtered data count:", error);
    res.status(500).json({ message: "Error fetching filtered data count", error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// 5. Perform Addition of a Given Field
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
    const collection = await getCollection(collectionName);
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
  } catch (error: unknown) {
    res.status(500).json({ message: 'Error summing the fields', error: error instanceof Error ? error.message : 'Unknown error' });
  }
};

// 6. Controller for fetching the data with start and end time range
export const getDataByDateRange = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { collectionName, startDate, endDate } = req.query;
    if (!collectionName || typeof collectionName !== 'string') {
      return res.status(400).json({ message: "A valid 'collectionName' parameter is required." });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "'startDate' and 'endDate' parameters are required." });
    }
    const formattedStartDate = formatDateInIST(startDate as string);
    const formattedEndDate = formatDateInIST(endDate as string);
    const collection = await getCollection(collectionName);
    const data = await collection.find({
      createdAt: {
        $gte: formattedStartDate,
        $lte: formattedEndDate,
      },
    }).toArray();
    return res.status(200).json({ count: data.length, data });
  } catch (error: unknown) {
    return res.status(500).json({
      message: 'Error fetching data for the given date range',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};