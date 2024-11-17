import express from 'express';
import mongoose from 'mongoose';

import {
    getAllCollections,
    getAllDataFromCollection,
    getDocCountFromCollection,
    getRecentDocCount,
    getFilteredDataCount,
    getFieldSums,
    getDataByDateRange,
  } from './controllers/Controller_data';

  import {
    configureMqttClient,
    subscribeToTopic,
    unsubscribeFromTopic,
    getSubscriptions,
    ensureMqttConfigured,
  } from './controllers/controllers_mqtt';
  
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Connect to MongoDB
const mongoURI = 'mongodb://localhost:27017/VYU';
mongoose.connect(mongoURI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

// Endpoints directly in index.ts
// 1. api for collection names
app.get('/api/v1/vehicel/collection', getAllCollections);

// 2. api for data from collection
app.get('/api/v1/vehicel/collection/data',async (req, res) => {
  try {
    await getAllDataFromCollection(req, res);  // Call the controller
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.', error });
  }
});

//3. api for counting the doc of the collection
app.get('/api/v1/vehicel/collection/count/doc', async (req, res) => {
  try {
    await getDocCountFromCollection(req, res);  // Calling the controller
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.', error });
  }
});

// 4. api for fetching the data of specified collection name and days
app.get('/api/v1/vehicel/collection/count/recent', async (req, res) => {
  try {
    await getRecentDocCount(req, res);  // Calling the controller
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.', error });
  }
});

// 5. api for fetching the count of the specified field and the collection name
app.get('/api/v1/vehicel/collection/field/count', getFilteredDataCount);

//6. api for fetching the sum of the specified collection name and field
app.get('/api/v1/vehicel/collection/field/sum', getFieldSums);

// 7. api for timestamp data
app.get('/api/v1/vehicel/collection/data/timeStamp', async (req, res) => {
  try {
    // Call the controller function and await its result
    await getDataByDateRange(req, res);
  } catch (error) {
    res.status(500).json({ message: 'Error handling the request', error });
  }
});

// for mqtt
app.post('/configure-mqtt', configureMqttClient);
app.post('/subscribe', ensureMqttConfigured, subscribeToTopic);
app.post('/unsubscribe', ensureMqttConfigured, unsubscribeFromTopic);
app.get('/subscriptions', ensureMqttConfigured, getSubscriptions);

// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});