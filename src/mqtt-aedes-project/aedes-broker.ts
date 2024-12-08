// broker.ts
import Aedes, { Client, Subscription, PublishPacket } from 'aedes';
import { createServer, Server } from 'net';

export const createMQTTBroker = (port: number): Server => {
  const broker: Aedes = new Aedes();

  // Create the server
  const server = createServer(broker.handle);

  // Attach events
  broker.on('client', (client: Client) => {
    console.log(`Client connected: ${client?.id}`);
  });

  broker.on('publish', (packet: PublishPacket, client: Client | null) => {
    //console.log(`Message published on topic ${packet.topic}: ${packet.payload.toString()}`);
  });

  broker.on('subscribe', (subscriptions: Subscription[], client: Client) => {
    console.log(`Client subscribed to topics: ${subscriptions.map((s) => s.topic).join(', ')}`);
  });

  broker.on('unsubscribe', (subscriptions: string[], client: Client) => {
    console.log(`Client unsubscribed from topics: ${subscriptions.join(', ')}`);
  });

  // Start the server
  server.listen(port, () => {
    console.log(`Aedes MQTT broker running on port ${port}`);
  });

  return server;
};