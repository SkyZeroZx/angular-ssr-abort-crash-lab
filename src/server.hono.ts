// Hono, from the createRequestHandler usage notes: https://angular.dev/api/ssr/createRequestHandler
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const angularApp = new AngularAppEngine();
const app = new Hono();

app.all('*', async (c) => {
  try {
    return (await angularApp.handle(c.req.raw)) ?? c.notFound();
  } catch (error) {
    console.error('host caught:', error);

    return c.body(null, 500);
  }
});

serve({ fetch: app.fetch, port: 4000 }, () => console.log('listening on 4000'));

export const reqHandler = createRequestHandler(app.fetch);
