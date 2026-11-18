#!/usr/bin/env bash
# Option A: open Checkpoint on your phone over HTTPS on your local Wi-Fi.
#
# 1. Finds this Mac's address on the local network.
# 2. Creates a self-signed HTTPS certificate for that address (in .certs/, ignored by git).
# 3. Starts the stack with an HTTPS proxy on port 4443, and makes email links point to it.
#
# Your phone must be on the same Wi-Fi as this Mac. Some campus networks (like eduroam) block
# device-to-device traffic; if the page doesn't load, use a phone hotspot or scripts/phone-tunnel.sh.
set -euo pipefail
cd "$(dirname "$0")/.."

IP="${LAN_IP:-$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)}"
if [ -z "$IP" ]; then
  echo "Couldn't find this Mac's local IP address. Set it yourself: LAN_IP=192.168.x.x $0" >&2
  exit 1
fi

mkdir -p .certs
if [ ! -f .certs/checkpoint-lan.crt ] || [ "$(cat .certs/ip 2>/dev/null)" != "$IP" ]; then
  echo "Creating a self-signed certificate for $IP ..."
  docker run --rm -v "$PWD/.certs":/certs alpine/openssl:3.5.9 req -x509 -newkey rsa:2048 -nodes \
    -days 30 -subj "/CN=Checkpoint dev ($IP)" \
    -addext "subjectAltName=IP:$IP" \
    -keyout /certs/checkpoint-lan.key -out /certs/checkpoint-lan.crt >/dev/null 2>&1
  echo "$IP" > .certs/ip
fi

PUBLIC_BASE_URL="https://$IP:4443" docker compose --profile phone up --build -d

cat <<MSG

Checkpoint is available on your local network at:

    https://$IP:4443

On your phone (same Wi-Fi as this Mac):
  1. Open that address.
  2. You'll see a certificate warning because the certificate is self-signed.
     iPhone (Safari): tap "Show Details", then "visit this website".
     Android (Chrome): tap "Advanced", then "Proceed".
  3. Log in, open Check-in, and allow camera access when asked.

Emails in Mailpit (http://localhost:8025) now link to this address too.
Stop with: docker compose --profile phone down
MSG
