// The non-Node.js entry, with no third-party host: https://angular.dev/guide/ssr#non-nodejs
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import {
  createWebRequestFromNodeRequest,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { createServer } from 'node:http';

const angularApp = new AngularAppEngine();

async function handle(request: Request): Promise<Response> {
  try {
    return (await angularApp.handle(request)) ?? new Response(null, { status: 404 });
  } catch (error) {
    console.error('host caught:', error);

    return new Response(null, { status: 500 });
  }
}

createServer(async (req, res) => {
  try {
    await writeResponseToNodeResponse(await handle(createWebRequestFromNodeRequest(req)), res);
  } catch (error) {
    console.error('host caught:', error);
    res.destroy();
  }
}).listen(Number(process.env['PORT'] ?? 4000), () => console.log(`listening on ${process.env['PORT'] ?? 4000}`));

export const reqHandler = createRequestHandler(handle);
