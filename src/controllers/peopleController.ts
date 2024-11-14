import { Request, Response, RequestHandler } from 'express';
import mongoose, { Schema, Document } from 'mongoose';

// Defining the IPerson interface
interface IPerson extends Document {
  car: number;
  bike: number;
  bus: number;
  human: number;
  truck: number;
  createdAt: Date;
}

// Mongoose Schema creation
const PeopleSchema: Schema = new Schema({
  car: { type: Number, required: true },
  bike: { type: Number, required: true },
  bus: { type: Number, required: true },
  human: { type: Number, required: true },
  truck: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

const People = mongoose.model<IPerson>('Peoples', PeopleSchema);

// Controller to get all data from the DB
export const getAllPeopleData = async (req: Request, res: Response) => {
  try {
    const allPeople = await People.find({});
    res.status(200).json(allPeople);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all people data', error });
  }
};

// Controller to get total people count
export const getAllPeopleCount = async (req: Request, res: Response) => {
  try {
    const count = await People.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all people count', error });
  }
};

// Controller to get recent people count
export const getRecentPeopleCount = async (req: Request, res: Response) => {
  try {
    const recentDays = parseInt(req.query.days as string, 10) || 7; // default to last 7 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - recentDays);

    const count = await People.countDocuments({ createdAt: { $gte: startDate } });
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent people count', error });
  }
};

// Controller to get filtered people count
export const getFilteredData = async (req: Request, res: Response) => {
  try {
    const filter: { [key: string]: string | number } = {};
    
    if (req.query.car) {
      filter['car'] = parseInt(req.query.car as string, 10);
    }

    const count = await People.find(filter);
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching filtered people count', error });
  }
};

// for counting the numeric fields
export const getCarFieldSum = async (req: Request, res: Response) => {
  try {
    // Use aggregation to sum the fields from all documents
    const result = await People.aggregate([
      {
        $group: {
          _id: null, // Group all documents together
          totalCarValue: { $sum: "$car" }, // Sum the 'car' field
          totalBikeValue: { $sum: "$bike" }, // Sum the 'bike' field
          totalBusValue: { $sum: "$bus" }, // Sum the 'bus' field
          totalHumanValue: { $sum: "$human" }, // Sum the 'human' field
          totalTruckValue: { $sum: "$truck" } // Sum the 'truck' field
        }
      }
    ]);

    // If no data is returned, the result will be an empty array
    // In that case, default all values to 0
    const aggregatedData = result.length > 0 ? result[0] : {
      totalCarValue: 0,
      totalBikeValue: 0,
      totalBusValue: 0,
      totalHumanValue: 0,
      totalTruckValue: 0
    };

    // Send the aggregated result as a JSON response
    res.status(200).json(aggregatedData);
  } catch (error) {
    res.status(500).json({ message: 'Error summing fields', error });
  }
};


export const getFieldSum: RequestHandler<{ field: string }> = async (req: Request, res: Response) => {
  try {
    const { field } = req.params;
    
    if (!field) {
      return res.status(400).json({ message: "Field parameter is required" });
    }

    const result = await People.aggregate([
      { $group: { _id: null, total: { $sum: ${field} } } }
    ]);

    if (result.length === 0) {
      return res.status(404).json({ message: "No documents found" });
    }

    res.json({ sum: result[0].total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};