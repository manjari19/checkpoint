#!/usr/bin/env bash
# Imports RSVPs from a Google Forms CSV export into an event, using Python inside Docker
# (never a local Python install). The stack must be running (docker compose up).
#
#   scripts/import-rsvps.sh --event <event id> path/to/responses.csv --dry-run
#   scripts/import-rsvps.sh --event <event id> path/to/responses.csv
#
# The event id is the last part of the event's RSVP link (/e/<id>). Try it with the sample:
#   scripts/import-rsvps.sh --event <event id> scripts/samples/google-forms-rsvps.csv --dry-run
set -euo pipefail
cd "$(dirname "$0")/.."

# The CSV can be anywhere on this machine: mount its folder read-only and point the script at it.
args=()
mounts=()
for arg in "$@"; do
  if [ -f "$arg" ]; then
    dir="$(cd "$(dirname "$arg")" && pwd)"
    mounts=(-v "$dir":/data:ro)
    args+=("/data/$(basename "$arg")")
  else
    args+=("$arg")
  fi
done

# Joins the stack's network, so the API is reachable by its service name.
docker run --rm \
  --network checkpoint_default \
  -v "$PWD/scripts":/scripts:ro \
  "${mounts[@]+"${mounts[@]}"}" \
  python:3.13.18-alpine \
  python /scripts/import_rsvps.py --api http://api:8180 "${args[@]+"${args[@]}"}"
