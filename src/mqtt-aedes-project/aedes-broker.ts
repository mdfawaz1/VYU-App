import Aedes from 'aedes';
import { createServer } from 'net';

const broker: Aedes = new Aedes();
const port = 1883;

const server = createServer(broker.handle);

server.listen(port, () => {
  console.log(`Aedes MQTT broker running on port ${port}`);
});

broker.on('client', (client) => {
  console.log(`Client connected: ${client?.id}`);
});

broker.on('publish', (packet, client) => {
  console.log(`Message published on topic ${packet.topic}: ${packet.payload.toString()}`);
});

broker.on('subscribe', (subscriptions, client) => {
  console.log(`Client subscribed to topics: ${subscriptions.map((s) => s.topic).join(', ')}`);
});

broker.on('unsubscribe', (subscriptions, client) => {
  console.log(`Client unsubscribed from topics: ${subscriptions.join(', ')}`);
});

export default broker;
