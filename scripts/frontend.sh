#!/usr/bin/env bash
# Runs npm for the Angular app inside a Node 24 container, so no local Node upgrade is needed.
# node_modules lives in a Docker volume, separate from your machine's files.
#
#   scripts/frontend.sh ci            install exact dependencies from package-lock.json
#   scripts/frontend.sh test          run the unit tests once
#   scripts/frontend.sh run build     production build into frontend/dist
#   scripts/frontend.sh start         dev server on http://localhost:4300 (API must be running on 8180)
set -euo pipefail
cd "$(dirname "$0")/../frontend"

# Only the dev server needs a port (and it can't share 4300 with the web container from docker compose).
ports=()
if [ "${1:-}" = "start" ]; then ports=(-p 4300:4300); fi

docker run --rm \
  -v "$PWD":/app -w /app \
  -v checkpoint-node-modules:/app/node_modules \
  -e API_URL=http://host.docker.internal:8180 \
  --add-host=host.docker.internal:host-gateway \
  "${ports[@]+"${ports[@]}"}" \
  node:24-alpine \
  npm "$@"
