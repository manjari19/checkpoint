#!/usr/bin/env bash
# Option B: a temporary public HTTPS address for Checkpoint, through a Cloudflare quick tunnel.
#
# Use this when your phone can't reach this Mac over Wi-Fi (for example on eduroam), or if the
# self-signed certificate from phone-https.sh gives you trouble. The phone gets a real certificate.
#
# Privacy: while this runs, anyone who knows the random trycloudflare.com address can open the app.
# Use made-up data only, and press Ctrl+C to close the tunnel when you're done.
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose up --build -d

echo
echo "Starting the tunnel. Look for a line with https://<random-words>.trycloudflare.com"
echo "Open that address on your phone. Press Ctrl+C here to close the tunnel."
echo "Note: links inside emails still point to localhost; open tickets on the phone after RSVPing there."
echo
docker run --rm --network checkpoint_default cloudflare/cloudflared:2026.11.1 \
  tunnel --no-autoupdate --url http://web:80
