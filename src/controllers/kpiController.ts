import { Request,Response } from 'express'; // Import Request type
import { randomBytes } from 'crypto'; // For generating 16-character UUID
import { getCollection } from '../mongodb-connection';

// Define a type for the fields (dynamic object)
type Fields = {
  [key: string]: string | string[] | undefined | null;
};

// In-memory object to store KPI data (kpiRegistry)
export const kpiRegistry: Record<
  string,
  { apiUrl: string; requestParams?: any }
> = {};

// Function to fetch all KPI cards
export const getKpiCards = async () => {
  try {
    const collection = await getCollection('kpiCards'); // Use getCollection helper
    const kpiCards = await collection.find({}).toArray();

    // Update kpiRegistry with the fetched data
    kpiCards.forEach((kpi: any) => {
      kpiRegistry[kpi.kpi_name] = {
        apiUrl: kpi.fields.apiUrl,
        requestParams: kpi.fields.requestParams || {},
      };
    });

    return kpiCards;
  } catch (error) {
    console.error('Failed to fetch KPI cards:', error);
    throw error;
  }
};

// Function to create a new KPI card
export const createKpiCard = async (req: Request): Promise<any> => {
  const { kpi_name, fields }: { kpi_name: string; fields: Fields } = req.body;

  // Validate input
  if (!kpi_name || typeof kpi_name !== 'string' || !fields || typeof fields !== 'object') {
    throw new Error("Invalid request body. 'kpi_name' and 'fields' are required.");
  }

  // Generate a 16-character UUID
  const uuid = randomBytes(8).toString('hex');

  // Remove any fields that are undefined or null
  const cleanedFields = Object.keys(fields).reduce((acc: { [key: string]: any }, key: string) => {
    if (fields[key] !== undefined && fields[key] !== null) {
      acc[key] = fields[key];
    }
    return acc;
  }, {});

  // Structure the KPI card object dynamically
  const kpiCard = {
    uuid, // Set uuid as the kpiId
    kpi_name,
    fields: cleanedFields, // Only include the provided fields
    createdAt: new Date(), // Add timestamp for tracking
  };

  try {
    // Get the `kpiCards` collection
    const collection = await getCollection('kpiCards');

    // Save the KPI card to the database
    await collection.insertOne(kpiCard);

    // Add the API to kpiRegistry for dynamic tracking
    if (cleanedFields.apiUrl) {
      kpiRegistry[kpi_name] = {
        apiUrl: cleanedFields.apiUrl,
        requestParams: cleanedFields.requestParams || {},
      };
    }

    // Return the created KPI card
    return {
      kpiId: uuid, // Use uuid as the kpiId
      kpiCard: {
        kpi_name,
        fields: cleanedFields,
        createdAt: kpiCard.createdAt,
      },
    };
  } catch (error) {
    console.error('Error saving KPI card to database:', error);
    throw new Error('Failed to save KPI card to database');
  }
};

// deleting of kpi
export const deleteKpiCard = async (req: Request, res: Response): Promise<Response> => {
  const { kpi_name } = req.query;

  if (!kpi_name || typeof kpi_name !== 'string') {
    return res.status(400).json({ error: "'kpi_name' is required as a query parameter and must be a string." });
  }

  try {
    const collection = await getCollection('kpiCards');
    const result = await collection.deleteOne({ kpi_name });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: `No KPI card found with the name '${kpi_name}'.` });
    }

    if (kpiRegistry[kpi_name]) {
      delete kpiRegistry[kpi_name];
    }

    return res.status(200).json({ message: `KPI card '${kpi_name}' successfully deleted.` });
  } catch (error) {
    console.error('Error deleting KPI card:', error);
    return res.status(500).json({ error: 'Failed to delete KPI card. Please try again later.' });
  }
};