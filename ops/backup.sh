#!/usr/bin/env bash
# Kézi mentés (CLAUDE.md, 13. mérföldkő), pl. frissítés előtt:
#   ops/backup.sh
# Ugyanaz, mint a napi mentés: az adatbázis egy időbélyeges csomagba, a
# feltöltött fájlok növekményesen a közös tárba (./backups, ./backups/files).
set -euo pipefail
cd "$(dirname "$0")/.."

docker compose -f docker-compose.prod.yml exec -T backup sh /backup/backup.sh "${1:-manual}" < /dev/null
