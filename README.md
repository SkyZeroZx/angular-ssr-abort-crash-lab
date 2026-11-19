# Angular SSR aborted-request crash

A client that closes the connection while a page is still rendering ends the Node process on servers built on `AngularAppEngine`, since `@angular/ssr` 22.2.6.

An `ng new --ssr` app on published `@angular/ssr` 22.2.7 and Angular 22.2.6, Node 24, with three changes: `provideHttpClient()`, `RenderMode.Server` on `**`, and a component that waits for its data while the server renders. `api.mjs` is the site's API and answers in 100 ms.

```ts
async ngOnInit() {
  const { name } = await firstValueFrom(
    this.http.get<{ name: string }>('http://127.0.0.1:4400/profile'),
  );
  this.profile.set(name);
}
```

[#34568](https://github.com/angular/angular-cli/pull/34568) destroys the platform as soon as `request.signal` aborts ([`ng.ts`](https://github.com/angular/angular-cli/blob/v22.2.7/packages/angular/ssr/src/utils/ng.ts#L126-L129)). The host still gets its `AbortError` from `handle()` and catches it. What ends the process is the work that was still running:

- A pending app initializer settles on the destroyed injector. [`bootstrap()`](https://github.com/angular/angular/blob/v22.2.6/packages/core/src/platform/bootstrap.ts#L143-L146) reads from it, gets `NG0205`, and core [rethrows it from a `setTimeout`](https://github.com/angular/angular/blob/v22.2.6/packages/core/src/error_handler.ts#L155-L160) because the injector is destroyed. Nothing can catch that.
- `FetchBackend` [completes without a value](https://github.com/angular/angular/blob/v22.2.6/packages/common/http/src/fetch.ts#L267-L270) once the app is destroyed, so a `firstValueFrom()` without a `catch` rejects with `EmptyError`.

`AngularNodeAppEngine`, the Express entry `ng new --ssr` generates, [installs process-wide handlers](https://github.com/angular/angular-cli/blob/v22.2.7/packages/angular/ssr/node/src/app-engine.ts#L48) and survives. `AngularAppEngine` installs none, and that function isn't exported.

## Manual test

```sh
npm ci
npx ng build
node api.mjs &
node dist/aborted-render-process/server/server.mjs &
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:4000/
curl -sS -m 0.05 http://localhost:4000/
curl -sS http://localhost:4000/
```

```text
200
curl: (28) Operation timed out after 55 milliseconds with 0 bytes received
curl: (7) Failed to connect to localhost:4000 after 0 ms: Could not connect to server
```

Expected: the server logs `host caught: AbortError`, then dies on an unhandled `EmptyError`. With `curl -m 0.15`, longer than the render, it stays up.

## Every entry

Each entry follows its own docs and logs what `handle()` rejects with as `host caught:`. `node tools/hosts.mjs` builds them one by one and aborts a request at 0 and at 50 ms:

| Entry | What it is | Aborted at 0 and 50 ms |
| --- | --- | --- |
| `src/server.ts` | `AngularAppEngine` on `node:http`, from the [SSR guide](https://angular.dev/guide/ssr#non-nodejs) | exits |
| `src/server.hono.ts` | Hono, from the [`createRequestHandler`](https://angular.dev/api/ssr/createRequestHandler) notes | exits |
| `src/server.h3.ts` | H3, the other example in those notes | exits |
| `src/server.srvx.ts` | srvx | exits |
| `src/server.node-engine.ts` | Express + `AngularNodeAppEngine`, as `ng new --ssr` generates it | survives |

## What app code it takes

`variants/` has one folder per pattern, and `docker/variants.sh` builds and sweeps each one:

| Pending when the client disconnects | Result |
| --- | --- |
| `provideAppInitializer`: the [usage notes example](https://github.com/angular/angular/blob/v22.2.6/packages/core/src/application/application_init.ts#L171-L187), the same in `try/catch`, one returning the Observable, one that only waits on a timer | exit 1, thrown by core |
| `firstValueFrom(http.get(...))` without a `catch`, in `ngOnInit`, a constructor, an effect or a service | exit 1, unhandled `EmptyError` |
| `subscribe()`, resolvers, guards, `httpResource`, `resource`, `toSignal` | alive |

The initializer rows don't depend on the app's code. This one catches everything and still takes the process down:

```ts
provideAppInitializer(async () => {
  const http = inject(HttpClient);
  try {
    await firstValueFrom(http.get('http://127.0.0.1:4400/api/user'));
  } catch {
    // start without the user
  }
}),
```

## In Docker

Linux, Node 24.22.3, and the client in its own container:

```sh
cd docker
docker compose build build
docker compose run --rm build
docker compose up -d app
docker compose run --rm client
```

```text
before           HTTP/1.1 200 OK
after one abort  ENOTFOUND
and again        ENOTFOUND
```

`docker compose ps -a app` shows `Exited (1)`. The same compose file has the other setups:

- `nginx`: only `proxy_pass`, everything else default. nginx logs a 499, closes the upstream connection, and the app exits the same way. `nginx-ignore-abort` adds `proxy_ignore_client_abort on` and stays up.
- `deno` and `bun`: the same handler built with `ssr.platform: 'neutral'` (`CONFIG=production,fetch`), on `Deno.serve` and `Bun.serve`. Both exit. `workerd-direct` runs it on workerd, which stays up.
- `site`: the app with `restart: always`. With `tools/traffic.mjs` running 10 visitors for 60 s and one aborted request every N seconds:

| One abort every | Answered pages | Restarts |
| --- | ---: | ---: |
| never | 5,584 | 0 |
| 1 s | 70 | 10 |
| 2 s | 312 | 10 |
| 5 s | 1,790 | 9 |
| 20 s | 4,645 | 3 |

## Timing

With the API latency anywhere from 1 ms to 1 s and each abort delay tried five times, every abort that arrived while the server was waiting on the API killed it, 310 out of 310. With a 1 ms API, sending the request and closing the socket right away is still enough. A few milliseconds after the API answers, nothing happens anymore.

How the client goes away doesn't matter either: a FIN, a half-close, a TCP reset, pipelined requests and `HEAD` all crash it. And one abort takes down every visitor that was rendering, 200 out of 200 in the largest run.

## Controls

- `npm i @angular/ssr@22.2.5`: alive at 0 and 50 ms, same app and same Angular core. The abort only rejects what `handle()` returns, and the render finishes in the background.
- `initializer-trycatch` on 22.2.5, or built with `--configuration production,node-engine`: alive.
- An abort at 150 ms, after the render: alive.
- A request whose headers never finish: alive, it never reaches Angular.
- `@angular/core` 22.3.0: same results.
- The two handlers `@angular/ssr/node` installs for its own engine, at the top of the entry: alive, and the error is logged instead. That's the workaround for now:

  ```ts
  process.on('unhandledRejection', (error) => console.error('unhandledRejection', error));
  process.on('uncaughtException', (error) => console.error('uncaughtException', error));
  ```

Measured 2026-11-18: `@angular/ssr` 22.2.7, `@angular/core` 22.2.6 and 22.3.0, Node 24.16.0 on Windows 11 and 24.22.3 in Docker, hono 4.13.19, h3 2.0.8, srvx 1.0.8, express 5.3.0, nginx 1.30.7 and 1.31.9, Deno 2.9.8, Bun 1.4.4, workerd 2026-11-18.
