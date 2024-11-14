import express from 'express';
import mongoose from 'mongoose';
import {
    getAllPeopleData,
    getAllPeopleCount,
    getRecentPeopleCount,
    getFilteredData,
    getCarFieldSum,
    getFieldSum
  } from './controllers/peopleController';
  
const app = express();
const port = 3000;

app.use(express.json());

// Connect to MongoDB
const mongoURI = 'mongodb://localhost:27017/VYU';
mongoose.connect(mongoURI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

// Endpoints directly in index.ts
app.get('/api/v1/people', getAllPeopleData);
app.get('/api/v1/people/count', getAllPeopleCount);
app.get('/api/v1/people/count/find', getFilteredData);
app.get('/api/v1/people/count/recent', getRecentPeopleCount);
app.get('/api/v1/people/count/field', getCarFieldSum);
app.get('/api/v1/people/counts/:field', getFieldSum);

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});