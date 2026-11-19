import { connect } from 'node:net';
import { request, sleep, startServer } from './lab.mjs';

const server = await startServer();
await request();

const socket = connect(4000, '127.0.0.1', () => {
  socket.write('GET / HTTP/1.1\r\nHost: localhost:4000\r\n\r\n');
  setTimeout(() => socket.destroy(), 10);
});
socket.on('error', () => {});

await sleep(60);
const visitors = await Promise.all([request(), request(), request()]);
await sleep(1500);

console.log(`3 visitors mid-render   ${visitors.join(' ')}`);
console.log(`server                 ${server.exit === null ? 'alive' : 'exit ' + server.exit}`);
if (server.exit === null) server.stop();
