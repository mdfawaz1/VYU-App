// import { Request, Response, NextFunction } from 'express';
// import { Schema, connection, Model, Document } from 'mongoose';
// import mqtt, { MqttClient } from 'mqtt';
// import fs from 'fs';
// import path from 'path';

// // Define the interface for the schema document
// interface IMessage extends Document {
//   topic: string;
//   message: string;
//   timestamp: Date;
// }

// // Define a map to store dynamically created models
// const topicModels: { [key: string]: Model<IMessage> } = {};
// let mqttClient: MqttClient | null = null;
// let subscribedTopics: string[] = [];

// // Path to the file that stores the topics
// const topicsFilePath = path.join(__dirname, 'subscribedTopics.json');

// // Function to dynamically get or create a model for a topic
// const getModelForTopic = (topic: string): Model<IMessage> => {
//   if (!topicModels[topic]) {
//     const topicSchema = new Schema<IMessage>(
//       {
//         topic: { type: String, required: true },
//         message: { type: String, required: true },
//         timestamp: { type: Date, default: Date.now },
//       },
//       { collection: topic }
//     );
//     topicModels[topic] = connection.model<IMessage>(topic, topicSchema);
//   }
//   return topicModels[topic];
// };

// // Helper function to handle MQTT subscription/unsubscription logic
// const handleSubscription = (
//   topic: string,
//   action: 'subscribe' | 'unsubscribe',
//   res: Response
// ): void => {
//   if (!mqttClient) {
//     res.status(400).send('MQTT client is not configured');
//     return;
//   }
//   const callback = (err?: Error | null) => {
//     if (err) {
//       console.error(`${action} to topic ${topic} failed:`, err);
//       res.status(500).send(`${action === 'subscribe' ? 'Subscription' : 'Unsubscription'} failed`);
//     } else {
//       if (action === 'subscribe' && !subscribedTopics.includes(topic)) {
//         subscribedTopics.push(topic);
//         // Save the subscribed topics to the JSON file
//         fs.writeFileSync(topicsFilePath, JSON.stringify(subscribedTopics, null, 2));
//       } else if (action === 'unsubscribe') {
//         subscribedTopics = subscribedTopics.filter((t) => t !== topic);
//         // Save the updated list of subscribed topics
//         fs.writeFileSync(topicsFilePath, JSON.stringify(subscribedTopics, null, 2));
//       }
//       console.log(`${action.charAt(0).toUpperCase() + action.slice(1)} to topic: ${topic}`);
//       res.send(`${action.charAt(0).toUpperCase() + action.slice(1)}d to ${topic}`);
//     }
//   };
//   if (action === 'subscribe') {
//     mqttClient.subscribe(topic, callback);
//   } else if (action === 'unsubscribe') {
//     mqttClient.unsubscribe(topic, callback);
//   }
// };

// // Function to configure MQTT client
// export const configureMqttClient = (req: Request, res: Response): void => {
//   if (mqttClient && mqttClient.connected) {
//     res.status(400).send('MQTT client is already configured and connected');
//     return;
//   }
//   const { brokerUrl, options } = req.body;
//   if (!brokerUrl) {
//     res.status(400).send('Broker URL is required');
//     return;
//   }
//   try {
//     mqttClient = mqtt.connect(brokerUrl, options);
//     mqttClient.on('connect', () => {
//       console.log('Connected to MQTT broker');
//       // Read the topics from the JSON file and subscribe to them
//       if (fs.existsSync(topicsFilePath)) {
//         const storedTopics = JSON.parse(fs.readFileSync(topicsFilePath, 'utf-8'));
//         storedTopics.forEach((topic: string) => {
//           mqttClient!.subscribe(topic, (err) => {
//             if (err) {
//               console.error(`Failed to resubscribe to ${topic}:`, err);
//             } else {
//               console.log(`Resubscribed to ${topic}`);
//             }
//           });
//         });
//       }
//       if (!res.headersSent) {
//         res.send('MQTT client configured and connected successfully');
//       }
//     });
//     mqttClient.on('message', async (topic: string, message: Buffer) => {
//       console.log(`Received message on ${topic}: ${message.toString()}`);
//       try {
//         const topicModel = getModelForTopic(topic);
//         const cameraData = new topicModel({
//           topic,
//           message: message.toString(),
//         });
//         await cameraData.save();
//       } catch (err) {
//         console.error('Error saving data:', err);
//       }
//     });
//     mqttClient.on('error', (err: unknown) => {
//       console.error('MQTT connection error:', err);
//       if (!res.headersSent) {
//         res.status(500).send('Failed to connect to MQTT broker');
//       }
//     });
//     mqttClient.on('offline', () => {
//       console.warn('MQTT client went offline');
//     });
//     mqttClient.on('reconnect', () => {
//       console.info('MQTT client is reconnecting...');
//     });
//     mqttClient.on('close', () => {
//       console.warn('MQTT connection closed');
//     });
//   } catch (err) {
//     console.error('MQTT configuration error:', err);
//     if (!res.headersSent) {
//       res.status(500).send('Error configuring MQTT client');
//     }
//   }
// };

// // Middleware to check if MQTT client is configured
// export const ensureMqttConfigured = (req: Request, res: Response, next: NextFunction): void => {
//   if (!mqttClient || !mqttClient.connected) {
//     if (!res.headersSent) {
//       res.status(400).send('MQTT client is not configured or connected');
//     }
//   } else {
//     next();
//   }
// };

// // Function to subscribe to a topic
// export const subscribeToTopic = (req: Request, res: Response): void => {
//   const { topic } = req.body;
//   if (!topic) {
//     res.status(400).send('Topic is required');
//     return;
//   }
//   handleSubscription(topic, 'subscribe', res);
// };

// // Function to unsubscribe from a topic
// export const unsubscribeFromTopic = (req: Request, res: Response): void => {
//   const { topic } = req.body;
//   if (!topic) {
//     res.status(400).send('Topic is required');
//     return;
//   }
//   handleSubscription(topic, 'unsubscribe', res);
// };

// // Function to retrieve all subscribed topics
// export const getSubscriptions = (req: Request, res: Response): void => {
//   res.json(subscribedTopics);
// };