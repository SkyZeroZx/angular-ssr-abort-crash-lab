import { connect } from 'node:net';

const [host = 'app', port = 4000, hostHeader = `${host}:${port}`] = process.argv.slice(2);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function request() {
  return new Promise((resolve) => {
    const socket = connect(port, host, () =>
      socket.write(`GET / HTTP/1.1\r\nHost: ${hostHeader}\r\nConnection: close\r\n\r\n`),
    );
    let answer = '';
    socket.on('data', (chunk) => (answer += chunk));
    socket.on('end', () => resolve(answer.split('\r\n')[0] || 'nothing'));
    socket.on('error', (error) => resolve(error.code));
  });
}

function abortedRequest(after) {
  return new Promise((resolve) => {
    const socket = connect(port, host, () => {
      socket.write(`GET / HTTP/1.1\r\nHost: ${hostHeader}\r\n\r\n`);
      setTimeout(() => {
        socket.destroy();
        resolve();
      }, after);
    });
    socket.on('error', () => resolve());
  });
}

for (let i = 0; i < 40; i++) {
  if ((await request()).includes('200')) break;
  await sleep(500);
}

console.log('before          ', await request());
await abortedRequest(50);
await sleep(2000);
console.log('after one abort ', await request());
console.log('and again       ', await request());
