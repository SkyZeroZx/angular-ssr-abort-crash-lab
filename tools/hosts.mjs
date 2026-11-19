import { abortedRequest, build, request, sleep, startServer } from './lab.mjs';

const ENTRIES = [
  ['src/server.ts', 'node:http + @angular/ssr/node helpers', 'production'],
  ['src/server.hono.ts', 'Hono + @hono/node-server', 'production,hono'],
  ['src/server.h3.ts', 'H3', 'production,h3'],
  ['src/server.srvx.ts', 'srvx', 'production,srvx'],
  ['src/server.node-engine.ts', 'Express + AngularNodeAppEngine', 'production,node-engine'],
];

for (const [file, what, configuration] of ENTRIES) {
  await build(configuration);
  const results = [];

  for (const delay of [0, 50]) {
    const server = await startServer();
    const warm = (await request()) === '200';
    await abortedRequest(delay);
    await sleep(1500);
    results.push(`abort@${delay} ${!warm ? 'NOT SERVING' : server.exit === null ? 'alive' : 'dead, exit ' + server.exit}`);
    if (server.exit === null) server.stop();
    await sleep(300);
  }

  const dead = results.some((result) => result.includes('dead'));
  console.log(
    `${file.padEnd(26)} ${what.padEnd(38)} ${results.join('   ').padEnd(30)} ${dead ? 'VULNERABLE' : 'survives'}`,
  );
}
