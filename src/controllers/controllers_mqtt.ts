import { Request, Response, NextFunction } from 'express';
import mqtt, { MqttClient } from 'mqtt';
import { getCollection } from '../mongodb-connection';

let mqttClient: MqttClient | null = null;
let subscribedTopics: string[] = [];

// Helper function to handle MQTT subscription/unsubscription logic
const handleSubscription = (
  topic: string,
  action: 'subscribe' | 'unsubscribe',
  res: Response
): void => {
  if (!mqttClient) {
    res.status(400).send('MQTT client is not configured');
    return;
  }
  const callback = (err?: Error | null) => {
    if (err) {
      console.error(`${action} to topic ${topic} failed:`, err);
      res.status(500).send(`${action === 'subscribe' ? 'Subscription' : 'Unsubscription'} failed`);
    } else {
      if (action === 'subscribe' && !subscribedTopics.includes(topic)) {
        subscribedTopics.push(topic);
      } else if (action === 'unsubscribe') {
        subscribedTopics = subscribedTopics.filter((t) => t !== topic);
      }
      console.log(`${action.charAt(0).toUpperCase() + action.slice(1)} to topic: ${topic}`);
      res.send(`${action.charAt(0).toUpperCase() + action.slice(1)}d to ${topic}`);
    }
  };
  if (action === 'subscribe') {
    mqttClient.subscribe(topic, callback);
  } else if (action === 'unsubscribe') {
    mqttClient.unsubscribe(topic, callback);
  }
};

// Function to configure MQTT client
export const configureMqttClient = (req: Request, res: Response): void => {
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
      //console.log(`Raw message received on topic ${topic}: ${message.toString()}`);
      try {
        const parsedMessage = JSON.parse(message.toString());
        const { UtcTime, Source } = parsedMessage;

        if (!UtcTime || !Source || !Source.VideoSource || !Source.Rule) {
          console.error('Invalid message format:', parsedMessage);
          return;
        }

        const transformedData = {
          topic,
          TimeStamp: new Date(UtcTime),
          VideoSource: Source.VideoSource,
          Rule: Source.Rule,
        };

        const collection = await getCollection(topic);
        const result = await collection.insertOne(transformedData);

        if (result.acknowledged) {
          console.log(`Data successfully inserted for topic ${topic}:`, transformedData);
        } else {
          console.error('Failed to insert data into MongoDB:', transformedData);
        }
      } catch (err) {
        console.error('Error processing MQTT message or inserting into MongoDB:', err);
      }
    });
    mqttClient.on('error', (err: unknown) => {
      console.error('MQTT connection error:', err);
      if (!res.headersSent) {
        res.status(500).send('Failed to connect to MQTT broker');
      }
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
  handleSubscription(topic, 'subscribe', res);
};

// Function to unsubscribe from a topic
export const unsubscribeFromTopic = (req: Request, res: Response): void => {
  const { topic } = req.body;
  if (!topic) {
    res.status(400).send('Topic is required');
    return;
  }
  handleSubscription(topic, 'unsubscribe', res);
};

// Function to retrieve all subscribed topics
export const getSubscriptions = (req: Request, res: Response): void => {
  res.json(subscribedTopics);
};