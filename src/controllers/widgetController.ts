import { Request, Response } from 'express';  // Import types for req and res
import { randomBytes } from 'crypto'; // For generating 16-character UUID
import { getCollection } from '../mongodb-connection'; // MongoDB helper

// Define a type for the fields (dynamic object)
type Fields = {
  [key: string]: string | string[] | undefined | null;
};

export const createWidget = async (req: Request, res: Response): Promise<Response> => {
  const { widget_name, fields }: { widget_name: string; fields: Fields } = req.body;

  // Validate input
  if (!widget_name || typeof widget_name !== 'string' || !fields || typeof fields !== 'object') {
    return res.status(400).json({
      error: "Invalid request body. 'widget_name' and 'fields' are required.",
    });
  }

  // Generate a 16-character UUID
  const uuid = randomBytes(8).toString('hex');

  // Remove any fields that are undefined or null (if any) to make it dynamic
  const cleanedFields = Object.keys(fields).reduce((acc: { [key: string]: any }, key: string) => {
    if (fields[key] !== undefined && fields[key] !== null) {
      acc[key] = fields[key]; // Only add non-null, non-undefined fields
    }
    return acc;
  }, {});

  // Structure the widget object dynamically
  const widget = {
    uuid,  // Set uuid as the widgetId
    widget_name,
    fields: cleanedFields,  // Only include the provided fields
    createdAt: new Date(),  // Add timestamp for tracking
  };

  try {
    // Get the `widgets` collection
    const collection = await getCollection('widgets');

    // Save the widget to the database
    const result = await collection.insertOne(widget);

    // Send the response back to the client without uuid in the response widget object
    return res.status(201).json({
      message: 'Widget successfully created and saved to database',
      widgetId: widget.uuid,  // Use uuid as the widgetId in response (to keep it in the response header)
      widget: {
        widget_name,
        fields: cleanedFields,  // Only include the provided fields, without uuid
        createdAt: widget.createdAt,  // Include the timestamp
      },
    });
  } catch (error) {
    console.error('Error saving widget to database:', error);
    return res.status(500).json({ error: 'Failed to save widget to database' });
  }
};
