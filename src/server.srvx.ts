// srvx, the UnJS universal server behind H3: https://srvx.h3.dev
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { serve } from 'srvx';

const angularApp = new AngularAppEngine();

async function handle(request: Request): Promise<Response> {
  try {
    return (await angularApp.handle(request)) ?? new Response(null, { status: 404 });
  } catch (error) {
    console.error('host caught:', error);

    return new Response(null, { status: 500 });
  }
}

serve({ fetch: handle, port: 4000, silent: true })
  .ready()
  .then(() => console.log('listening on 4000'));

export const reqHandler = createRequestHandler(handle);
