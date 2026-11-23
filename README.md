# Angular SSR destroy hook exit, with #34768, #72139 and #34777

This branch is `destroy-hook-after-fixes` with angular/angular-cli#34777 applied to `@angular/ssr`. On that branch, a destroy hook that throws ends the process on servers built on `AngularAppEngine`, even with angular/angular-cli#34768 and angular/angular#72139 merged. Here the same app and the same two requests leave the server running, and the error is logged.

## Packages

Official snapshot builds from Angular's CI, vendored as downloaded (`vendor/SHA256SUMS`):

| Package | Snapshot | Built from |
| --- | --- | --- |
| `@angular/ssr` | `angular/angular-ssr-builds@66fc4762e` + #34777 | angular-cli `de5620f18`, has #34768 |
| `@angular/core`, `common`, `compiler`, `compiler-cli`, `platform-browser`, `platform-server`, `router`, `forms` | `angular/<name>-builds` at `c069d3295`, `8bcb23a78`, `0210f44db`, `a98ee1709`, `34f91d0a2`, `7659e2791`, `e08c3129b`, `1d55dcd29` | angular `f3ea683dd`, has #72139 |

`@angular/build` and `@angular/cli` are the published 22.3.0. `.npmrc` sets `legacy-peer-deps` because the snapshots are 22.4.0-next.

## Applying #34777

#34777 adds a `catch` to `asyncDestroyPlatform()` in `packages/angular/ssr/src/utils/ng.ts`. Built with bazel from the PR's tree (`835b6a4b2f`), its `fesm2022/ssr.mjs` differs from the snapshot above by these two lines and nothing else:

```js
      } catch (error) {
        console.error('An error occurred while destroying the platform.', error);
```

`tools/apply-pr-34777.mjs` adds them to the installed snapshot. It runs as `postinstall`, but npm skips that with `ignore-scripts`, so run it yourself after `npm ci`. `tools/destroy-hook.mjs` prints whether the build carries it.

## The app

Same as on `destroy-hook-after-fixes`: `src/app/profile.ts`, routed at `/` and `/users/:id`, creates its subscription once the API answers and releases it in `ngOnDestroy`. `api.mjs` answers in 100 ms; `/api/users/alice` exists, any other user is a 404.

## Manual test

```sh
npm ci
node tools/apply-pr-34777.mjs
npx ng build
node api.mjs &
node dist/aborted-render-process/server/server.mjs &
curl -s http://localhost:4000/ | grep -o '<p>[^<]*</p>'
curl -sS -m 0.05 http://localhost:4000/
curl -s http://localhost:4000/ | grep -o '<p>[^<]*</p>'
curl -s http://localhost:4000/users/ghost | grep -o '<p>[^<]*</p>'
sleep 1
curl -s http://localhost:4000/ | grep -o '<p>[^<]*</p>'
```

```text
<p>Alice</p>
curl: (28) Operation timed out after 56 milliseconds with 0 bytes received
<p>Alice</p>
<p>User not found</p>
<p>Alice</p>
```

The server logs the hook's error twice and keeps answering:

```text
An error occurred while destroying the platform. TypeError: Cannot read properties of undefined (reading 'unsubscribe')
```

`node tools/destroy-hook.mjs` runs the two cases on fresh processes:

| | `destroy-hook-after-fixes` | this branch |
| --- | --- | --- |
| visitor leaves 50 ms into the render, `AngularAppEngine` on `node:http` | exit 1 | alive, logs the error |
| `/users/ghost`, nothing aborted, `node:http` | exit 1 | alive, logs the error |
| both, `ng new --ssr` Express server | alive, logs `uncaughtException` | alive, logs the error |

The Express rows are `npx ng build --configuration production,node-engine --output-path dist/node-engine` and `SERVER=dist/node-engine/server/server.mjs node tools/destroy-hook.mjs`.

The fix stops the exit only. The teardown still stops at the hook that threw, so each of these requests keeps its application in memory: about 84 KB per dropped request here (1,000 drops, heap after a forced GC). That part is in `@angular/core`.

Measured 2026-11-23 on Windows 11, Node 24.16.0. The original #34754 reproduction is on `main`.
