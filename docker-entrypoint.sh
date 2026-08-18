#!/bin/sh
set -e

# Migrations are the ONLY path to schema in this project — payload.config.ts
# sets `push: false` deliberately, so a container that starts without running
# them serves a site whose database is a version behind its code. Running them
# here rather than as a separate deploy step means the two can never drift.
#
# `set -e` matters: if a migration fails the container must NOT go on to serve
# traffic against a half-migrated database. Failing to start is the safe
# outcome — the platform keeps the previous healthy version live.
echo "→ applying database migrations"
node_modules/.bin/payload migrate

echo "→ starting FAMPIRE Media Center on :${PORT:-3000}"
exec node server.js
