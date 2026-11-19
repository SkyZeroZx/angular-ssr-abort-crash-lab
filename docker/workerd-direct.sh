#!/bin/sh
# Runs a Worker on workerd itself, without wrangler dev's proxy in front.
# WORKER picks the module (tools/worker.mjs is the Angular app, tools/baseline-worker.mjs has no Angular).
# COMPAT_DATE 2026-11-17 or later turns on enable_request_signal by default.
set -e
WORKERD=/usr/local/lib/node_modules/wrangler/node_modules/@cloudflare/workerd-linux-64/bin/workerd
DATE="${COMPAT_DATE:-2026-11-17}"
MODULE="${WORKER:-tools/worker.mjs}"
NAME="$(basename "$MODULE" .mjs)"

# wrangler only bundles here; the compatibility date that matters is the one in config.capnp.
cat > /tmp/wrangler.toml <<EOF
name = "$NAME"
main = "/app/$MODULE"
compatibility_date = "$DATE"

[alias]
"xhr2" = "/app/tools/xhr2-stub.mjs"
EOF
wrangler deploy --dry-run --outdir /tmp/out -c /tmp/wrangler.toml > /tmp/bundle.log 2>&1 || { cat /tmp/bundle.log; exit 1; }

cat > /tmp/out/config.capnp <<EOF
using Workerd = import "/workerd/workerd.capnp";

const config :Workerd.Config = (
  services = [
    (name = "main", worker = .main),
    (name = "internet", network = (allow = ["public", "private", "local"])),
  ],
  sockets = [(name = "http", address = "*:4000", http = (), service = "main")],
);

const main :Workerd.Worker = (
  modules = [(name = "worker.js", esModule = embed "$NAME.js")],
  compatibilityDate = "$DATE",
  globalOutbound = "internet",
);
EOF

node api.mjs &
echo "$($WORKERD --version), compatibility date $DATE, $MODULE"
exec "$WORKERD" serve --verbose /tmp/out/config.capnp
