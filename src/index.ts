// import express from 'express';
// import { connectToDatabase } from './mongodb-connection'; // MongoDB connection logic
// import { createMQTTBroker } from './mqtt-aedes-project/aedes-broker'; // MQTT broker
// import cors from 'cors';
// import http from 'http';
// import { Server as SocketIOServer, Socket } from 'socket.io';
// import { pollKpisAndSendUpdates } from './pollingManager';

// import {
//   getAllCollections,
//   getAllDataFromCollection,
//   getRecentDocCount,
//   getFieldSums,
//   getFieldCounts,
//   getDataByDateRange,
//   getAvailableVideoSources,
//   getFieldAggregates,
// } from './controllers/Controller_data';

// import {
//   configureMqttClient,
//   subscribeToTopic,
//   unsubscribeFromTopic,
//   getSubscriptions,
//   ensureMqttConfigured,
// } from './controllers/controllers_mqtt';

// import { createWidget } from './controllers/widgetController';
// import { getKpiCards, createKpiCard } from './controllers/kpiController';

// // Fetch and recreate KPI cards on server startup
// async function fetchAndRecreateKpiCardsOnStartup(io: SocketIOServer): Promise<void> {
//   try {
//     const kpiCards = await getKpiCards();
//     if (!kpiCards || kpiCards.length === 0) {
//       console.log('No KPI cards found to recreate.');
//       return;
//     }

//     console.log(`Recreating ${kpiCards.length} KPI cards and emitting to the frontend.`);
//     io.emit('kpiCardsUpdated', kpiCards); // Send to frontend
//   } catch (error) {
//     console.error('Error fetching KPI cards on startup:', error);
//   }
// }

// const app = express();
// const port = process.env.PORT || 8080;

// // Set up the HTTP server
// const httpServer = http.createServer(app);

// // Set up Socket.IO
// const io = new SocketIOServer(httpServer, {
//   cors: {
//     origin: ['http://localhost:3000', 'http://localhost:3001'],
//     methods: ['GET', 'POST'],
//   },
// });

// // Handle WebSocket connections
// io.on('connection', (socket: Socket) => {
//   console.log('Frontend connected:', socket.id);

//   socket.on('disconnect', () => {
//     console.log('Frontend disconnected:', socket.id);
//   });
// });

// // Configure CORS
// app.use(
//   cors({
//     origin: ['http://localhost:3000', 'http://localhost:3001'],
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
//     credentials: true,
//     optionsSuccessStatus: 200,
//   })
// );

// app.use(express.json());

// // MQTT Setup
// const mqtt_port = 1883;
// createMQTTBroker(mqtt_port); // Initialize MQTT broker

// // Connect to MongoDB once before starting the Express server
// connectToDatabase()
//   .then(() => {
//     console.log('MongoDB Connected');

//     // Define routes
//     app.get('/api/v1/allCollections', getAllCollections);

//     app.get('/api/v1/Collection/data', async (req, res) => {
//       try {
//         await getAllDataFromCollection(req, res);
//       } catch (error) {
//         res.status(500).json({ message: 'Something went wrong.', error });
//       }
//     });

//     app.get('/api/v1/Collection/data/allRecent', async (req, res) => {
//       try {
//         await getRecentDocCount(req, res);
//       } catch (error) {
//         res.status(500).json({ message: 'Something went wrong.', error });
//       }
//     });

//     app.get('/api/v1/Collection/filtered/count', getFieldCounts);
//     app.get('/api/v1/Collection/field/sum', getFieldSums);
//     app.get('/api/v1/Collection/field/sumAvg', getFieldAggregates);

//     app.get('/api/v1/Collection/data/timeStamp', async (req, res) => {
//       try {
//         await getDataByDateRange(req, res);
//       } catch (error) {
//         res.status(500).json({ message: 'Error handling the request', error });
//       }
//     });

//     app.get('/api/v1/Collection/videoSources', async (req, res) => {
//       try {
//         await getAvailableVideoSources(req, res);
//       } catch (error) {
//         res.status(500).json({ message: 'Error getting video sources', error });
//       }
//     });

//     // Widget Routes
//     app.post('/api/v1/widgets', async (req, res) => {
//       try {
//         await createWidget(req, res);
//       } catch (error) {
//         res.status(500).json({ message: 'Error creating widget', error });
//       }
//     });

//     // KPI Card Routes
//     app.post('/api/v1/kpiCards', async (req, res) => {
//       try {
//         const newKpiCard = await createKpiCard(req);

//         // Emit the new KPI card to all connected clients
//         io.emit('kpiCardsUpdated', [newKpiCard.kpiCard]);

//         res.status(201).json({ message: 'KPI Card created successfully', data: newKpiCard });
//       } catch (error) {
//         console.error('Error creating KPI card:', error);
//         res.status(500).json({ message: 'Error creating KPI card', error });
//       }
//     });

//     // MQTT Routes
//     app.post('/api/v1/configure-mqtt', configureMqttClient);
//     app.post('/api/v1/subscribe/topic', ensureMqttConfigured, subscribeToTopic);
//     app.post('/api/v1/unsubscribe/topic', ensureMqttConfigured, unsubscribeFromTopic);
//     app.get('/api/v1/subscriptions/list', ensureMqttConfigured, getSubscriptions);

//     // Start the HTTP server
//     httpServer.listen(port, async () => {
//       console.log(`Server is running on http://localhost:${port}`);

//       // Fetch and recreate KPI cards only on server start
//       await fetchAndRecreateKpiCardsOnStartup(io);
//     });
//   })
//   .catch((err) => {
//     console.error('Failed to connect to MongoDB:', err);
//     process.exit(1);
//   });

// above code is just for safety reason, if something happens then we can re-use the old codes

import express from 'express';
import { connectToDatabase } from './mongodb-connection'; // MongoDB connection logic
import { createMQTTBroker } from './mqtt-aedes-project/aedes-broker'; // MQTT broker
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { pollKpisAndSendUpdates } from './pollingManager';

import {
  getAllCollections,
  getAllDataFromCollection,
  getRecentDocCount,
  getFieldSums,
  getFieldCounts,
  getDataByDateRange,
  getAvailableVideoSources,
  getFieldAggregates,
} from './controllers/Controller_data';

import {
  configureMqttClient,
  subscribeToTopic,
  unsubscribeFromTopic,
  getSubscriptions,
  ensureMqttConfigured,
} from './controllers/controllers_mqtt';

import { createWidget } from './controllers/widgetController';
import { getKpiCards, createKpiCard, deleteKpiCard } from './controllers/kpiController';

// Global KPI registry
const kpiRegistry: Record<string, any> = {};

// Fetch and recreate KPI cards on server startup
async function fetchAndRecreateKpiCardsOnStartup(io: SocketIOServer): Promise<void> {
  try {
    const kpiCards = await getKpiCards();
    if (!kpiCards || kpiCards.length === 0) {
      console.log('No KPI cards found to recreate.');
      return;
    }

    console.log(`Recreating ${kpiCards.length} KPI cards and emitting to the frontend.`);
    
    // Populate KPI registry for polling
    kpiCards.forEach((kpi) => {
      const { kpi_name, fields } = kpi;
      kpiRegistry[kpi_name] = {
        apiUrl: fields.apiUrl,
        requestParams: fields.requestParams,
      };
    });

    // Emit KPI cards to the frontend
    io.emit('kpiCardsUpdated', kpiCards);
  } catch (error) {
    console.error('Error fetching KPI cards on startup:', error);
  }
}

const app = express();
const port = process.env.PORT || 8080;

// Set up the HTTP server
const httpServer = http.createServer(app);

// Set up Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
  },
});

// Start polling for KPI updates
pollKpisAndSendUpdates(io, kpiRegistry);

// Handle WebSocket connections
io.on('connection', (socket: Socket) => {
  console.log('Frontend connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Frontend disconnected:', socket.id);
  });
});

// Configure CORS
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());

// MQTT Setup
const mqtt_port = 1883;
createMQTTBroker(mqtt_port); // Initialize MQTT broker

// Connect to MongoDB once before starting the Express server
connectToDatabase()
  .then(() => {
    console.log('MongoDB Connected');

    // Define routes
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
    app.get('/api/v1/Collection/field/sumAvg', getFieldAggregates);

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
        res.status(500).json({ message: 'Error getting video sources', error });
      }
    });

    // Widget Routes
    app.post('/api/v1/widgets', async (req, res) => {
      try {
        await createWidget(req, res);
      } catch (error) {
        res.status(500).json({ message: 'Error creating widget', error });
      }
    });

    // KPI Card Routes
    app.post('/api/v1/kpiCards', async (req, res) => {
      try {
        const newKpiCard = await createKpiCard(req);

        // Update the KPI registry for polling
        const { kpi_name, fields } = newKpiCard.kpiCard;
        kpiRegistry[kpi_name] = {
          apiUrl: fields.apiUrl,
          requestParams: fields.requestParams,
        };

        // Emit the new KPI card to all connected clients
        io.emit('kpiCardsUpdated', [newKpiCard.kpiCard]);

        res.status(201).json({ message: 'KPI Card created successfully', data: newKpiCard });
      } catch (error) {
        console.error('Error creating KPI card:', error);
        res.status(500).json({ message: 'Error creating KPI card', error });
      }
    });

    app.delete('/api/v1/kpiCards', async (req, res) => {
      try {
        await deleteKpiCard(req, res);
    
        // Emit the updated KPI cards to the frontend after deletion
        const updatedKpiCards = await getKpiCards();
        io.emit('kpiCardsUpdated', updatedKpiCards);
      } catch (error) {
        console.error('Error deleting KPI card:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error deleting KPI card', error });
        }
      }
    });
    

    // MQTT Routes
    app.post('/api/v1/configure-mqtt', configureMqttClient);
    app.post('/api/v1/subscribe/topic', ensureMqttConfigured, subscribeToTopic);
    app.post('/api/v1/unsubscribe/topic', ensureMqttConfigured, unsubscribeFromTopic);
    app.get('/api/v1/subscriptions/list', ensureMqttConfigured, getSubscriptions);

    // Start the HTTP server
    httpServer.listen(port, async () => {
      console.log(`Server is running on http://localhost:${port}`);

      // Fetch and recreate KPI cards only on server start
      await fetchAndRecreateKpiCardsOnStartup(io);
    });

  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });