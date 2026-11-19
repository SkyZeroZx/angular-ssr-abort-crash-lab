#!/usr/bin/env bash
# Builds each folder in variants/ on top of src/app inside the build container,
# then sweeps it with tools/sweep.mjs. From the docker/ folder: sh variants.sh [name ...]
# On Git Bash, run it with MSYS_NO_PATHCONV=1.
set -u
cd "$(dirname "$0")"
ROOT="$(cd .. && (pwd -W 2> /dev/null || pwd))"
NAMES="${*:-$(ls ../variants)}"

for name in $NAMES; do
  target="$(cat "../variants/$name/.target" 2> /dev/null || echo /)"
  echo "######## $name   (GET $target)"
  docker compose run --rm -v "$ROOT/variants/$name:/variant:ro" build sh -c \
    "node api.mjs > /dev/null & sleep 1; cp -r /variant/. src/app/ && rm -f src/app/.target && node node_modules/@angular/cli/bin/ng.js build --configuration production > /tmp/build.log 2>&1 || tail -20 /tmp/build.log" 2> /dev/null
  docker compose run --rm -v "$ROOT/tools:/app/tools:ro" -e TARGET="$target" hosts \
    sh -c "node api.mjs > /dev/null & sleep 1; node tools/sweep.mjs 0,25,50,75,95,150" 2> /dev/null
done
