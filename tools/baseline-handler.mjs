// No Angular anywhere. What the runtime itself does with an aborted request,
// an error that stays inside the handler's promise, a rejection nobody
// handles, and an exception thrown from a timer. Web APIs only, so the same
// handler runs on Node, Deno, Bun (tools/baseline.mjs) and workerd
// (tools/baseline-worker.mjs). GET /__events lists what happened, for
// runtimes that don't print console output.
const events = [];
const note = (line) => {
  events.push(line);
  console.log(line);
};

export async function handler(request) {
  const { pathname } = new URL(request.url);
  if (pathname === '/__events') return new Response(events.join('\n'));
  request.signal.addEventListener('abort', () => note(`${pathname}: request.signal aborted`));

  switch (pathname) {
    case '/slow':
      await new Promise((resolve) => setTimeout(resolve, 100));
      return new Response('slow');
    case '/inside': {
      // Rejects with an AbortError when the client goes away, inside the promise the server awaits.
      const response = await fetch('http://127.0.0.1:4400/profile', { signal: request.signal });
      return new Response(await response.text());
    }
    case '/reject':
      Promise.reject(new Error('rejection nobody handles, no Angular'));
      return new Response('reject');
    case '/throw':
      setTimeout(() => {
        throw new Error('thrown from a timer, no Angular');
      });
      return new Response('throw');
    default:
      return new Response('ok');
  }
}
