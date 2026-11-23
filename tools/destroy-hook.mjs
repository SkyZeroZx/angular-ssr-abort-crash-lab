// Runs the two cases of this branch against the built server, each on a fresh process:
//   1. a visitor closes the connection 50 ms into the render (the API answers in 100 ms)
//   2. a page for an unknown user, nothing aborted (the API answers 404 and the app handles it)
// Usage: npx ng build && node tools/destroy-hook.mjs   (PORT defaults to 4000, the API uses 4400;
// SERVER points at another build, e.g. the Express one from --configuration production,node-engine)
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { connect } from 'node:net';

const port = Number(process.env.PORT ?? 4000);
const serverFile = process.env.SERVER ?? 'dist/aborted-render-process/server/server.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const api = spawn(process.execPath, ['api.mjs'], { stdio: 'ignore' });

function startServer() {
  const child = spawn(process.execPath, [serverFile], {
    env: { ...process.env, PORT: String(port) },
  });
  const state = { child, log: [], exit: null };
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (d) => state.log.push(...d.toString().split(/\r?\n/).filter(Boolean)));
  }
  child.on('exit', (code) => (state.exit = code));
  return state;
}

async function listening(state) {
  for (let i = 0; i < 200 && state.exit === null; i++) {
    const ok = await new Promise((r) => connect(port, '127.0.0.1', function () { this.destroy(); r(true); }).on('error', () => r(false)));
    if (ok) return;
    await sleep(50);
  }
}

const get = (path) =>
  new Promise((resolve) => {
    request({ host: '127.0.0.1', port, path, headers: { host: `localhost:${port}` } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve(`${res.statusCode} ${body.match(/<p>([^<]*)<\/p>/)?.[1] ?? ''}`));
    }).on('error', (e) => resolve(e.code)).end();
  });

function drop(path, after) {
  const socket = connect(port, '127.0.0.1', () => socket.write(`GET ${path} HTTP/1.1\r\nHost: localhost:${port}\r\n\r\n`));
  socket.on('error', () => {});
  setTimeout(() => socket.destroy(), after);
}

function outcome(state) {
  const error = state.log.find((l) => /^TypeError|destroying the platform|uncaughtException/.test(l.trim()));
  const process = state.exit === null ? 'server alive' : `server EXITED, code ${state.exit}`;
  return `${process}${error ? `\n      ${error.trim()}` : ''}`;
}

await sleep(300);

let server = startServer();
await listening(server);
const first = await get('/');
drop('/', 50);
await sleep(1500);
console.log(`1. GET / -> ${first}; then a GET / closed after 50 ms\n   ${outcome(server)}`);
server.child.kill();

server = startServer();
await listening(server);
const ghost = await get('/users/ghost');
await sleep(1500);
console.log(`2. GET /users/ghost -> ${ghost}, nothing aborted\n   ${outcome(server)}`);
server.child.kill();

api.kill();
