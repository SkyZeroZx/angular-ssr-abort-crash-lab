// Serves tools/baseline-handler.mjs, which has no Angular in it, with the
// runtime's own server: Deno.serve, Bun.serve, or node:http on Node.
import { handler } from './baseline-handler.mjs';

const port = 4000;

if (globalThis.Deno) {
  Deno.serve({ port, onListen: () => console.log(`listening on ${port}`) }, handler);
} else if (globalThis.Bun) {
  Bun.serve({ port, fetch: handler });
  console.log(`listening on ${port}`);
} else {
  const { createServer } = await import('node:http');
  createServer(async (req, res) => {
    const controller = new AbortController();
    res.on('close', () => !res.writableFinished && controller.abort());
    try {
      const request = new Request(`http://${req.headers.host}${req.url}`, { signal: controller.signal });
      const response = await handler(request);
      res.writeHead(response.status).end(await response.text());
    } catch (error) {
      console.error('handler rejected:', error.name);
      res.destroy();
    }
  }).listen(port, () => console.log(`listening on ${port}`));
}
