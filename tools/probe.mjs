// node tools/probe.mjs <host> <port> <path> [abort-after-ms]
// Waits until GET / answers 200, sends <path> (closing the socket after
// [abort-after-ms] when given), waits 1.5 s, then checks GET / again.
import { connect } from 'node:net';

const [host, port, path, abortAfter] = process.argv.slice(2);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const head = (target) => `GET ${target} HTTP/1.1\r\nHost: localhost:${port}\r\n`;

function request(target) {
  return new Promise((resolve) => {
    const socket = connect(port, host, () => socket.write(`${head(target)}Connection: close\r\n\r\n`));
    let answer = '';
    socket.on('data', (chunk) => (answer += chunk));
    socket.on('end', () => resolve(answer.split('\r\n')[0] || 'nothing'));
    socket.on('error', (error) => resolve(error.code));
  });
}

function aborted(target, after) {
  return new Promise((resolve) => {
    const socket = connect(port, host, () => {
      socket.write(`${head(target)}\r\n`);
      setTimeout(() => {
        socket.destroy();
        resolve(`closed after ${after} ms`);
      }, after);
    });
    socket.on('error', (error) => resolve(error.code));
  });
}

for (let i = 0; i < 60; i++) {
  if ((await request('/')).includes('200')) break;
  await sleep(500);
}

console.log('before  ', await request('/'));
console.log(path.padEnd(8), abortAfter ? await aborted(path, Number(abortAfter)) : await request(path));
await sleep(1500);
console.log('after   ', await request('/'));
