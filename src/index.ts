import express from 'express';
import { connectToDatabase } from './mongodb-connection'; // Import your MongoDB connection logic
import { createMQTTBroker } from './mqtt-aedes-project/aedes-broker'; // Assuming this is where the MQTT broker is defined
import cors from 'cors';

import {
    getAllCollections,
    getAllDataFromCollection,
    getRecentDocCount,
    getFieldSums,
    getFieldCounts,
    getDataByDateRange,
    getAvailableVideoSources,
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

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Add your frontend URLs
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true, // Enable credentials (cookies, authorization headers, etc)
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

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

    app.get('/api/v1/Collection/filtered/count', getFieldCounts);

    app.get('/api/v1/Collection/field/sum', getFieldSums);

    app.get('/api/v1/Collection/data/timeStamp', async (req, res) => {
      try {
        await getDataByDateRange(req, res); 
      } catch (error) {
        res.status(500).json({ message: 'Error handling the request', error });
      }
    });

    app.get('/api/v1/Collection/videoSources', async (req, res) => {
      try {
        await getAvailableVideoSources(req, res);
      } catch (error) {
        res.status(500).json({ 
          message: 'Error getting video sources', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // MQTT Routes
    app.post('/api/v1/configure-mqtt', configureMqttClient);
    app.post('/api/v1/subscribe/topic', ensureMqttConfigured, subscribeToTopic);
    app.post('/api/v1/unsubscribe/topic', ensureMqttConfigured, unsubscribeFromTopic);
    app.get('/api/v1/subscriptions/list', ensureMqttConfigured, getSubscriptions);

    // Add preflight handler for CORS
    app.options('*', cors());

    // Start server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });

  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1); 
  });