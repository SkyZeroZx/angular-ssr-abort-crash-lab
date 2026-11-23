# Angular SSR destroy hook exit, with #34768 and #72139

This branch runs the lab on what `main` has today in both repos: angular/angular-cli#34768 (merged as `59e3fd2a7`) and angular/angular#72139 (merged as `f3ea683dd`). A destroy hook that throws still ends the process on servers built on `AngularAppEngine`, with or without an aborted request. angular/angular-cli#34777 fixes it; the `destroy-hook-with-pr-34777` branch applies it on top of this one.

## Packages

Official snapshot builds from Angular's CI, vendored as downloaded (`vendor/SHA256SUMS`):

| Package | Snapshot | Built from |
| --- | --- | --- |
| `@angular/ssr` | `angular/angular-ssr-builds@66fc4762e` | angular-cli `de5620f18`, has #34768 |
| `@angular/core`, `common`, `compiler`, `compiler-cli`, `platform-browser`, `platform-server`, `router`, `forms` | `angular/<name>-builds` at `c069d3295`, `8bcb23a78`, `0210f44db`, `a98ee1709`, `34f91d0a2`, `7659e2791`, `e08c3129b`, `1d55dcd29` | angular `f3ea683dd`, has #72139 |

`@angular/build` and `@angular/cli` are the published 22.3.0. `.npmrc` sets `legacy-peer-deps` because the snapshots are 22.4.0-next.

## The app

`src/app/profile.ts`, routed at `/` and `/users/:id`. The subscription only exists once the API has answered:

```ts
ngOnInit() {
  this.http.get<{ name: string }>(`http://127.0.0.1:4400/api/users/${this.id}`).subscribe({
    next: ({ name }) => {
      this.name.set(name);
      this.subscription = this.updates.subscribe((next) => this.name.set(next));
    },
    error: () => this.name.set('User not found'),
  });
}

ngOnDestroy() {
  // undefined if the visitor left before the answer, or if the call failed
  this.subscription.unsubscribe();
}
```

`api.mjs` answers in 100 ms. `/api/users/alice` exists, any other user is a 404.

## Manual test

```sh
npm ci
npx ng build
node api.mjs &
node dist/aborted-render-process/server/server.mjs &
curl -s http://localhost:4000/ | grep -o '<p>[^<]*</p>'
curl -sS -m 0.05 http://localhost:4000/
curl -sS http://localhost:4000/
```

```text
<p>Alice</p>
curl: (28) Operation timed out after 60 milliseconds with 0 bytes received
curl: (7) Failed to connect to localhost:4000 after 1 ms: Could not connect to server
```

It doesn't need an abort. Start the server again and ask for a user that doesn't exist:

```sh
node dist/aborted-render-process/server/server.mjs &
curl -s http://localhost:4000/users/ghost | grep -o '<p>[^<]*</p>'
sleep 1
curl -sS http://localhost:4000/
```

```text
<p>User not found</p>
curl: (7) Failed to connect to localhost:4000 after 0 ms: Could not connect to server
```

Both times the server ends with `TypeError: Cannot read properties of undefined (reading 'unsubscribe')`, thrown by `ngOnDestroy`. `node tools/destroy-hook.mjs` runs the two cases on fresh processes:

| | `AngularAppEngine` on `node:http` | `ng new --ssr` Express server |
| --- | --- | --- |
| visitor leaves 50 ms into the render | exit 1 | alive, logs `uncaughtException` |
| `/users/ghost`, nothing aborted | exit 1 | alive, logs `uncaughtException` |

The Express row is `npx ng build --configuration production,node-engine --output-path dist/node-engine` and `SERVER=dist/node-engine/server/server.mjs node tools/destroy-hook.mjs`.

## Why

`renderAngular()` destroys the platform inside a `setTimeout` in `asyncDestroyPlatform()`. #34768 wrapped `platformRef.destroy()` in `try/finally`, so the promise resolves, but the hook's error still leaves the timer as an uncaught exception. `AngularAppEngine` installs no process handlers. `AngularNodeAppEngine` installs log-only ones, which is why Express survives.

Measured 2026-11-23 on Windows 11, Node 24.16.0. The original #34754 reproduction is on `main`.
