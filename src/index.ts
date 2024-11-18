import express from 'express';
import { connectToDatabase } from './mongodb-connection'; // Import your MongoDB connection logic
import { createMQTTBroker } from './mqtt-aedes-project/aedes-broker'; // Assuming this is where the MQTT broker is defined

import {
    getAllCollections,
    getAllDataFromCollection,
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

// MQTT Setup
const mqtt_port = 1883;
const server = createMQTTBroker(mqtt_port);

// Connect to MongoDB once before starting the Express server
connectToDatabase()
  .then(() => {
    console.log('MongoDB Connected');

    // Define the Express routes
    app.get('/api/v1/allCollections', getAllCollections);

    app.get('/api/v1/Collection/data', async (req, res) => {
      try {
        await getAllDataFromCollection(req, res);
      } catch (error) {
        res.status(500).json({ message: 'Something went wrong.', error });
      }
    });

    app.get('/api/v1/Collection/data/allRecent', async (req, res) => {
      try {
        await getRecentDocCount(req, res); 
      } catch (error) {
        res.status(500).json({ message: 'Something went wrong.', error });
      }
    });

    app.get('/api/v1/Collection/filtered/count', getFilteredDataCount);

    app.get('/api/v1/Collection/field/sum', getFieldSums);

    app.get('/api/v1/Collection/data/timeStamp', async (req, res) => {
      try {
        await getDataByDateRange(req, res); 
      } catch (error) {
        res.status(500).json({ message: 'Error handling the request', error });
      }
    });

    // MQTT Routes
    app.post('/api/v1/configure-mqtt', configureMqttClient);
    app.post('/api/v1/subscribe/topic', ensureMqttConfigured, subscribeToTopic);
    app.post('/api/v1/unsubscribe/topic', ensureMqttConfigured, unsubscribeFromTopic);
    app.get('/api/v1/subscriptions/list', ensureMqttConfigured, getSubscriptions);

    // Start server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });

  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1); 
  });