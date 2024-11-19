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

interface FieldCounts {
  [key: string]: number;  // Define a dictionary type for field counts
}

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
export const getFieldCounts = async (req: Request, res: Response): Promise<void> => {
  const collectionName = req.query.collection as string; // Get collection name
  const filtersParam = req.query; // Get all query parameters for filtering
  const rulesParam = req.query.Rule; // Specifically for 'Rule' field

  if (!collectionName || typeof collectionName !== 'string') {
    res.status(400).json({ message: "Collection name is required and must be a string." });
    return;
  }

  try {
    // Get collection reference
    const collection = await getCollection(collectionName);

    // Prepare filter object
    const filter: Record<string, any> = {};

    // Add all filters from query parameters (excluding collection and Rule)
    Object.keys(filtersParam).forEach((key) => {
      if (key !== 'collection' && key !== 'Rule') {
        const value = filtersParam[key];
        if (Array.isArray(value)) {
          filter[key] = { $in: value };  // Handle multiple values for the field
        } else {
          filter[key] = value;
        }
      }
    });

    // Handle Rule filter separately
    let ruleFilter: Record<string, any> = {};
    if (rulesParam) {
      let rules: string[] = [];

      // Handle 'Rule' query parameter whether it's a single string or an array of strings
      if (typeof rulesParam === 'string') {
        rules = rulesParam.split(','); // Split string by commas if it's a single string
      } else if (Array.isArray(rulesParam)) {
        rules = rulesParam.filter((r) => typeof r === 'string') as string[]; // Ensure it's an array of strings
      }

      ruleFilter['Rule'] = { $in: rules };  // Match any of the rules in the array
    }

    // Combine the filter (rule filter + other filters)
    const combinedFilter = { ...filter, ...ruleFilter };

    // Query the database with the filter and project relevant fields
    const result = await collection.find(combinedFilter).toArray();

    // Initialize the field counts object to store counts for each field
    const fieldCounts: FieldCounts = {};

    // Process the documents to count occurrences for the fields
    result.forEach((doc) => {
      // Handle counting for 'Rule' field (which can have multiple values)
      if (doc.Rule) {
        const rules = Array.isArray(doc.Rule) ? doc.Rule : doc.Rule.split(','); // Ensure it's an array
        rules.forEach((rule: string) => {
          fieldCounts[rule] = (fieldCounts[rule] || 0) + 1; // Count each rule occurrence
        });
      }

      // Handle counting for numeric fields like 'car', 'bike', etc.
      Object.keys(doc).forEach((key) => {
        if (typeof doc[key] === 'number') {
          const value = doc[key];
          // Only count if this field is part of the filter or matches the value (e.g., car = 2)
          if (filtersParam[key] === undefined || filtersParam[key] === value.toString()) {
            fieldCounts[key] = (fieldCounts[key] || 0) + 1;
          }
        }
      });
    });

    // Return the result
    res.status(200).json({
      collection: collectionName,
      filter: combinedFilter,
      fieldCounts,
    });
  } catch (error: unknown) {
    res.status(500).json({
      message: 'Error processing the data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
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

// Add this new function to get available VideoSources
export const getAvailableVideoSources = async (req: Request, res: Response): Promise<void> => {
  try {
    const { collection } = req.query;

    if (!collection || typeof collection !== 'string') {
      res.status(400).json({ message: "Collection name is required and must be a string." });
      return;
    }

    const col = await getCollection(collection);

    // Find all documents in the collection
    const documents = await col.find({}).toArray();

    // Extract unique VideoSource values
    const videoSources = new Set<string>();
    documents.forEach(doc => {
      if (doc.VideoSource) {
        videoSources.add(doc.VideoSource);
      }
    });

    // Convert to array and sort
    const sortedSources = Array.from(videoSources).sort();

    // Count documents for each source
    const sourceCounts = await Promise.all(
      sortedSources.map(async (source) => {
        const count = await col.countDocuments({ VideoSource: source });
        return { source, count };
      })
    );

    console.log(`Available VideoSources for ${collection}:`, sourceCounts);

    res.status(200).json({
      collection,
      videoSources: sourceCounts,
      total: sourceCounts.length
    });

  } catch (error) {
    console.error('Error getting video sources:', error);
    res.status(500).json({
      message: 'Error getting video sources',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};