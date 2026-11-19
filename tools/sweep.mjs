// node tools/sweep.mjs [delays] [--log]       TARGET=/path picks the URL (default /)
// Like tools/attacker.mjs, plus the URL and how many aborts the host caught,
// which shows whether the abort landed while the page was still rendering.
import { spawn } from 'node:child_process';
import { connect } from 'node:net';

const TARGET = process.env.TARGET ?? '/';
const delays = (process.argv[2] ?? '0,25,50,75,95,150').split(',').map(Number);
const withLog = process.argv.includes('--log');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function request() {
  return new Promise((resolve) => {
    const socket = connect(4000, '127.0.0.1', () =>
      socket.write(`GET ${TARGET} HTTP/1.1\r\nHost: localhost:4000\r\nConnection: close\r\n\r\n`),
    );
    let answer = '';
    socket.on('data', (chunk) => (answer += chunk));
    socket.on('end', () => resolve(answer.split(' ')[1] ?? 'nothing'));
    socket.on('error', (error) => resolve(error.code));
  });
}

function abortedRequest(after) {
  return new Promise((resolve) => {
    const socket = connect(4000, '127.0.0.1', () => {
      socket.write(`GET ${TARGET} HTTP/1.1\r\nHost: localhost:4000\r\n\r\n`);
      setTimeout(() => {
        socket.destroy();
        resolve();
      }, after);
    });
    socket.on('error', () => resolve());
  });
}

async function startServer() {
  const server = spawn(process.execPath, ['dist/aborted-render-process/server/server.mjs'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const state = { log: '', exit: null, stop: () => server.kill() };
  server.stdout.on('data', (chunk) => (state.log += chunk));
  server.stderr.on('data', (chunk) => (state.log += chunk));
  server.on('exit', (code) => (state.exit = code));
  for (let i = 0; !state.log.includes('listening') && state.exit === null && i < 200; i++) {
    await sleep(50);
  }

  return state;
}

for (const delay of delays) {
  const server = await startServer();
  const warmup = [await request(), await request()];
  await abortedRequest(delay);
  await sleep(1500);
  const next = server.exit === null ? await request() : 'ECONNREFUSED';
  const caught = server.log.split('host caught').length - 1;

  console.log(
    `abort after ${String(delay).padStart(3)} ms   warmup ${warmup.join(' ')}   ` +
      `server ${server.exit === null ? 'alive ' : 'exit ' + server.exit}   next GET ${next}   host caught ${caught}`,
  );

  if (server.exit === null) server.stop();
  else if (withLog) console.log('\n' + server.log.trim() + '\n');
  await sleep(300);
}
