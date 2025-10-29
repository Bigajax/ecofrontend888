#!/usr/bin/env bash
set -euo pipefail
B="${VITE_API_URL:-https://ecobackend888.onrender.com}"
F="https://ecofrontend888.vercel.app"
echo "[ENV] VITE_API_URL=$B"
echo "[OPTIONS]"; curl -sS -i -X OPTIONS "$B/api/ask-eco" \
 -H "Origin: $F" \
 -H "Access-Control-Request-Method: POST" \
 -H "Access-Control-Request-Headers: content-type,x-client-id,x-eco-guest-id,x-eco-session-id" | sed -n '1,20p'
echo
echo "[POST]"; curl -sS -i -X POST "$B/api/ask-eco" \
 -H "Origin: $F" -H "Content-Type: application/json" \
 -d '{"mensagem":"front smoke"}' | sed -n '1,20p'
