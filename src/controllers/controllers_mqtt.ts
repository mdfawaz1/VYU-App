import { Request, Response, NextFunction } from 'express';
import { Schema, connection, Model, Document } from 'mongoose';
import mqtt, { MqttClient } from 'mqtt';

// Define the interface for the schema document
interface IMessage extends Document {
  topic: string;
  message: string;
  timestamp: Date;
}

// Define a map to store dynamically created models
const topicModels: { [key: string]: Model<IMessage> } = {};

let mqttClient: MqttClient | null = null;
let subscribedTopics: string[] = [];

// Function to dynamically get or create a model for a topic
const getModelForTopic = (topic: string): Model<IMessage> => {
  if (!topicModels[topic]) {
    const topicSchema = new Schema<IMessage>(
      {
        topic: { type: String, required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
      { collection: topic }
    );

    topicModels[topic] = connection.model<IMessage>(topic, topicSchema);
  }
  return topicModels[topic];
};

// Function to configure MQTT client
export const configureMqttClient = (req: Request, res: Response): void => {
  // Check if an MQTT client is already connected
  if (mqttClient && mqttClient.connected) {
    res.status(400).send('MQTT client is already configured and connected');
    return;
  }

  const { brokerUrl, options } = req.body;

  if (!brokerUrl) {
    res.status(400).send('Broker URL is required');
    return;
  }

  try {
    mqttClient = mqtt.connect(brokerUrl, options);

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      if (!res.headersSent) {
        res.send('MQTT client configured and connected successfully');
      }
    });

    mqttClient.on('message', async (topic: string, message: Buffer) => {
      console.log(`Received message on ${topic}: ${message.toString()}`);
      try {
        const topicModel = getModelForTopic(topic);
        const cameraData = new topicModel({
          topic,
          message: message.toString(),
        });
        await cameraData.save();
      } catch (err) {
        console.error('Error saving data:', err);
      }
    });

    mqttClient.on('error', (err: unknown) => {
      console.error('MQTT connection error:', err);
      if (!res.headersSent) {
        res.status(500).send('Failed to connect to MQTT broker');
      }
    });

    mqttClient.on('offline', () => {
      console.warn('MQTT client went offline');
    });

    mqttClient.on('reconnect', () => {
      console.info('MQTT client is reconnecting...');
    });

    mqttClient.on('close', () => {
      console.warn('MQTT connection closed');
    });
  } catch (err) {
    console.error('MQTT configuration error:', err);
    if (!res.headersSent) {
      res.status(500).send('Error configuring MQTT client');
    }
  }
};

// Middleware to check if MQTT client is configured
export const ensureMqttConfigured = (req: Request, res: Response, next: NextFunction): void => {
  if (!mqttClient || !mqttClient.connected) {
    if (!res.headersSent) {
      res.status(400).send('MQTT client is not configured or connected');
    }
  } else {
    next();
  }
};

// Function to subscribe to a topic
export const subscribeToTopic = (req: Request, res: Response): void => {
  const { topic } = req.body;

  if (!topic) {
    res.status(400).send('Topic is required');
    return;
  }

  try {
    if (!mqttClient) {
      res.status(400).send('MQTT client is not configured');
      return;
    }

    mqttClient!.subscribe(topic, (err: Error | null) => {
      if (err) {
        console.error(`Subscription to topic ${topic} failed:`, err);
        res.status(500).send('Subscription failed');
      } else {
        if (!subscribedTopics.includes(topic)) {
          subscribedTopics.push(topic);
        }
        console.log(`Subscribed to topic: ${topic}`);
        res.send(`Subscribed to ${topic}`);
      }
    });
  } catch (err) {
    console.error('Error during subscription:', err);
    res.status(500).send('Subscription error');
  }
};

// Function to unsubscribe from a topic
export const unsubscribeFromTopic = (req: Request, res: Response): void => {
  const { topic } = req.body;

  if (!topic) {
    res.status(400).send('Topic is required');
    return;
  }

  try {
    if (!mqttClient) {
      res.status(400).send('MQTT client is not configured');
      return;
    }

    mqttClient!.unsubscribe(topic, undefined, (error: Error | undefined) => {
      if (error) {
        console.error(`Unsubscription from topic ${topic} failed:`, error);
        res.status(500).send('Unsubscription failed');
      } else {
        subscribedTopics = subscribedTopics.filter((t) => t !== topic);
        console.log(`Unsubscribed from topic: ${topic}`);
        res.send(`Unsubscribed from ${topic}`);
      }
    });
  } catch (err) {
    console.error('Error during unsubscription:', err);
    res.status(500).send('Unsubscription error');
  }
};

// Function to retrieve all subscribed topics
export const getSubscriptions = (req: Request, res: Response): void => {
  res.json(subscribedTopics);
};