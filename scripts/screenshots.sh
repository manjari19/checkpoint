#!/usr/bin/env bash
# Runs the headless browser layout check against the running stack (docker compose up first).
# Screenshots go to the folder given as the first argument (default: screenshots/ at the repo root).
# Remaining arguments: name=path pairs; a path starting with "!" is a public page (no login).
# Optional environment: ORGANIZER_EMAIL and ORGANIZER_PASSWORD (which account to log in as), WIDTHS (e.g. 1440,390).
#   scripts/screenshots.sh /tmp/shots overview=/overview rsvp='!/e/<event id>'
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="$(cd "$(dirname "${1:-screenshots}")" && pwd)/$(basename "${1:-screenshots}")"; shift || true
mkdir -p "$OUT"

pages="["
for pair in "$@"; do
  name="${pair%%=*}"; path="${pair#*=}"; auth=true
  if [[ "$path" == !* ]]; then auth=false; path="${path#!}"; fi
  pages+="{\"name\":\"$name\",\"path\":\"$path\",\"auth\":$auth},"
done
pages="${pages%,}]"

docker run --rm --ipc=host \
  --add-host=host.docker.internal:host-gateway \
  -v "$PWD/scripts/screenshots":/work -w /work \
  -v checkpoint-playwright-modules:/work/node_modules \
  -v "$OUT":/out \
  -e PAGES="$pages" -e TARGET_URL=http://host.docker.internal:4300 \
  -e ORGANIZER_EMAIL -e ORGANIZER_PASSWORD -e WIDTHS \
  mcr.microsoft.com/playwright:v1.65.1-noble \
  sh -c "npm install --silent --no-audit --no-fund >/dev/null && node capture.mjs"
