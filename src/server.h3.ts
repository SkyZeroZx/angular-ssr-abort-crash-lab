// H3, the other example in the same usage notes: https://angular.dev/api/ssr/createRequestHandler
import { AngularAppEngine, createRequestHandler } from '@angular/ssr';
import { H3, serve, toWebHandler } from 'h3';

const angularApp = new AngularAppEngine();
const app = new H3();

app.all('/**', async (event) => {
  try {
    return (await angularApp.handle(event.req)) ?? new Response(null, { status: 404 });
  } catch (error) {
    console.error('host caught:', error);

    return new Response(null, { status: 500 });
  }
});

serve(app, { port: 4000, silent: true })
  .ready()
  .then(() => console.log('listening on 4000'));

export const reqHandler = createRequestHandler(toWebHandler(app));
