// Serves the fetch-only build (ng build --configuration production,fetch)
// with the runtime's own server: Deno.serve or Bun.serve.
import { reqHandler } from '../dist/aborted-render-process/server/server.mjs';

const port = 4000;

if (globalThis.Deno) {
  Deno.serve({ port, onListen: () => console.log(`listening on ${port}`) }, reqHandler);
} else if (globalThis.Bun) {
  Bun.serve({ port, fetch: reqHandler });
  console.log(`listening on ${port}`);
} else {
  throw new Error('run this with deno or bun');
}
