#!/usr/bin/env bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Install Node.js LTS from https://nodejs.org first."; exit 1; }
if [ ! -d server/node_modules ] || [ ! -f client/dist/index.html ]; then npm run setup || exit 1; fi
npm run doctor || exit 1
npm start
