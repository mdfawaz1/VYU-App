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
    app.get('/api/allCollections', getAllCollections);

    app.get('/api/Collection/data', async (req, res) => {
      try {
        await getAllDataFromCollection(req, res);  // Call the controller
      } catch (error) {
        res.status(500).json({ message: 'Something went wrong.', error });
      }
    });

    app.get('/api/Collection/data/allRecent', async (req, res) => {
      try {
        await getRecentDocCount(req, res);  // Call the controller
      } catch (error) {
        res.status(500).json({ message: 'Something went wrong.', error });
      }
    });

    app.get('/api/Collection/filtered/count', getFilteredDataCount);

    app.get('/api/Collection/field/sum', getFieldSums);

    app.get('/api/Collection/data/timeStamp', async (req, res) => {
      try {
        await getDataByDateRange(req, res);  // Call the controller
      } catch (error) {
        res.status(500).json({ message: 'Error handling the request', error });
      }
    });

    // MQTT Routes
    app.post('/api/configure-mqtt', configureMqttClient);
    app.post('/api/subscribe/topic', ensureMqttConfigured, subscribeToTopic);
    app.post('/api/unsubscribe/topic', ensureMqttConfigured, unsubscribeFromTopic);
    app.get('/api/subscriptions/list', ensureMqttConfigured, getSubscriptions);

    // Start server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });

  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1); // Exit the process if MongoDB connection fails
  });