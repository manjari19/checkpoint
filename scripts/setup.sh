#!/usr/bin/env bash
# Sets up and starts Checkpoint with one command:
#   1. checks that Docker is installed and running,
#   2. creates .env from .env.example if there isn't one yet,
#   3. builds and starts the stack, and waits until the API reports healthy,
#   4. prints the addresses and logins.
#
#   scripts/setup.sh
#
# Everything runs in Docker; no local Java, Node or Python is needed.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker isn't installed. Install Docker Desktop (or Docker Engine with Compose) and run this again." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Start Docker Desktop, wait until it says it's running, and run this again." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose v2 is missing ('docker compose' doesn't work). Update Docker and run this again." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example (development defaults)."
fi

echo "Building and starting Checkpoint. The first run downloads images and can take a few minutes..."
# --wait returns once every service is running and the API's health check passes.
docker compose up --build -d --wait --wait-timeout 600

# The web server has no health check of its own; give nginx a moment to answer.
if command -v curl >/dev/null 2>&1; then
  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null http://localhost:4300; then break; fi
    sleep 1
  done
fi

setting() { grep -E "^$1=" .env | tail -1 | cut -d= -f2- || true; }
admin_email="$(setting BOOTSTRAP_ADMIN_EMAIL)"
admin_password="$(setting BOOTSTRAP_ADMIN_PASSWORD)"
profiles="${CHECKPOINT_PROFILES:-$(setting CHECKPOINT_PROFILES)}"

cat <<INFO

Checkpoint is running.

  Web app           http://localhost:4300
  API and Swagger   http://localhost:8180/swagger-ui.html
  Email inbox       http://localhost:8025   (Mailpit catches every email; nothing is really sent)

  Your club         ${admin_email:-organizer@checkpoint.local} / ${admin_password:-checkpoint-demo}
INFO
if [[ ",$profiles," == *",demo,"* ]]; then
  echo "  Demo club         demo@checkpoint.local / checkpoint-demo   (120 made-up members, a term of events)"
fi
cat <<'INFO'

Stop it with: docker compose down        (your data is kept in a Docker volume)
INFO
