import { spawn } from 'node:child_process';
import { connect } from 'node:net';

export const ENTRY = 'dist/aborted-render-process/server/server.mjs';
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function request() {
  return new Promise((resolve) => {
    const socket = connect(4000, '127.0.0.1', () =>
      socket.write('GET / HTTP/1.1\r\nHost: localhost:4000\r\nConnection: close\r\n\r\n'),
    );
    let answer = '';
    socket.on('data', (chunk) => (answer += chunk));
    socket.on('end', () => resolve(answer.split(' ')[1] ?? 'nothing'));
    socket.on('error', (error) => resolve(error.code));
  });
}

export function abortedRequest(after) {
  return new Promise((resolve) => {
    const socket = connect(4000, '127.0.0.1', () => {
      socket.write('GET / HTTP/1.1\r\nHost: localhost:4000\r\n\r\n');
      setTimeout(() => {
        socket.destroy();
        resolve();
      }, after);
    });
    socket.on('error', () => resolve());
  });
}

export async function startServer() {
  const server = spawn(process.execPath, [ENTRY], { stdio: ['ignore', 'pipe', 'pipe'] });
  const state = { log: '', exit: null, stop: () => server.kill() };
  server.stdout.on('data', (chunk) => (state.log += chunk));
  server.stderr.on('data', (chunk) => (state.log += chunk));
  server.on('exit', (code) => (state.exit = code));
  for (let i = 0; !state.log.includes('listening') && state.exit === null && i < 200; i++) {
    await sleep(50);
  }

  return state;
}

export function build(configuration) {
  return new Promise((resolve, reject) => {
    const ng = 'node_modules/@angular/cli/bin/ng.js';
    const child = spawn(process.execPath, [ng, 'build', '--configuration', configuration], { stdio: 'ignore' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ng build ${configuration}`))));
  });
}
