#!/bin/bash
set -e

./start_all.sh
./novnc_startup.sh

echo "✨ Computer Use Demo is ready!"
# echo "➡️  Open http://localhost:8080 in your browser to begin"

# Keep the container running
tail -f /dev/null
