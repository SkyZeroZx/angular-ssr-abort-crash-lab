import { abortedRequest, request, sleep, startServer } from './lab.mjs';

const delays = (process.argv[2] ?? '0,25,50,75,95,150').split(',').map(Number);
const withLog = process.argv.includes('--log');

for (const delay of delays) {
  const server = await startServer();
  const warmup = [await request(), await request()];
  await abortedRequest(delay);
  await sleep(1500);
  const next = server.exit === null ? await request() : 'ECONNREFUSED';

  console.log(
    `abort after ${String(delay).padStart(3)} ms   warmup ${warmup.join(' ')}   ` +
      `server ${server.exit === null ? 'alive ' : 'exit ' + server.exit}   next GET ${next}`,
  );

  if (server.exit === null) server.stop();
  else if (withLog) console.log('\n' + server.log.trim() + '\n');
  await sleep(300);
}
