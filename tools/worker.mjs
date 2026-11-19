// Cloudflare Workers module around the fetch-only build (ng build --configuration production,fetch).
// workerd doesn't print console output, so GET /__events lists what happened in this isolate.
import { reqHandler } from '../dist/aborted-render-process/server/server.mjs';

const events = [];

addEventListener('unhandledrejection', (event) => {
  events.push(`unhandledrejection: ${event.reason?.name}: ${event.reason?.message}`);
});

export default {
  async fetch(request) {
    if (new URL(request.url).pathname === '/__events') return new Response(events.join('\n'));

    request.signal.addEventListener('abort', () => events.push('request.signal aborted'));
    const response = await reqHandler(request);
    events.push(`response ${response.status}`);

    return response;
  },
};
