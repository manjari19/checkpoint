#!/usr/bin/env bash
# Adds or removes the demo club: 120 made-up members and a term of events with RSVPs, waitlists,
# check-ins, no-shows and sponsors. It lives in its own club with its own login, so your real
# club's events and members are never changed.
#
#   scripts/demo-data.sh          add the demo club (does nothing if it already exists)
#   scripts/demo-data.sh remove   delete the demo club and everything in it
#
# Log in at http://localhost:4300 as demo@checkpoint.local / checkpoint-demo.
# Card numbers in the demo are fake (29999000000001 and up); only their hashes are stored.
set -euo pipefail
cd "$(dirname "$0")/.."

wait_for_api() {
  for _ in $(seq 1 60); do
    if curl -fsS http://localhost:8180/actuator/health >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "The API didn't become healthy. Check: docker compose logs api" >&2
  exit 1
}

if [ "${1:-}" = "remove" ]; then
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -U checkpoint -d checkpoint <<'SQL'
begin;
-- Deleting the events also deletes their sponsors, RSVPs and sponsor contacts (on delete cascade).
delete from event where club_id in (select club_id from organizer where email = 'demo@checkpoint.local');
delete from member where club_id in (select club_id from organizer where email = 'demo@checkpoint.local');
create temp table demo_club as select club_id from organizer where email = 'demo@checkpoint.local';
delete from organizer where club_id in (select club_id from demo_club);
delete from club where id in (select club_id from demo_club);
commit;
SQL
  echo "Demo club removed."
  exit 0
fi

# Restart the API once with the demo profile. It seeds on startup, then keeps running normally.
CHECKPOINT_PROFILES=demo docker compose up --build -d api
wait_for_api
docker compose logs api | grep -E "Seeded demo club|Demo club already exists" | tail -1 || true
echo
echo "Open http://localhost:4300 and log in as demo@checkpoint.local / checkpoint-demo"
