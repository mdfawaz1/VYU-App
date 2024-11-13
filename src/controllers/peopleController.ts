import { Request, Response } from 'express';
import mongoose, { Schema, Document } from 'mongoose';

// Defining the IPerson interface
interface IPerson extends Document {
  name: string;
  age: number;
  createdAt: Date;
}

// Mongoose Schema creation
const PeopleSchema: Schema = new Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
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
export const getFilteredPeopleCount = async (req: Request, res: Response) => {
  try {
    const filter: { [key: string]: string | number } = {};
    
    if (req.query.age) {
      filter['age'] = parseInt(req.query.age as string, 10);
    }

    const count = await People.countDocuments(filter);
    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching filtered people count', error });
  }
};