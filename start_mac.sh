#!/usr/bin/env bash
cd "$(dirname "$0")"

echo "========================================================"
echo "      BUYUK BASKAN: FUTBOL KULUBU YONETIM SIMULATORU"
echo "========================================================"
echo ""
echo "Yerel Sunucu Linki:"
echo "http://localhost:5055"
echo ""

if [ -f ".venv/bin/python" ]; then
    .venv/bin/python server.py
else
    python3 server.py
fi
