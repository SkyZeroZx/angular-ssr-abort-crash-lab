// A fetch handler and nothing else, built with `platform: 'neutral'`.
// tools/serve.mjs runs it with Deno.serve or Bun.serve.
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';

const angularApp = new AngularAppEngine();

async function handle(request: Request): Promise<Response> {
  try {
    return (await angularApp.handle(request)) ?? new Response(null, { status: 404 });
  } catch (error) {
    console.error('host caught:', error);

    return new Response(null, { status: 500 });
  }
}

export const reqHandler = createRequestHandler(handle);
