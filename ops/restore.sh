#!/usr/bin/env bash
# Visszaállítás egy kiválasztott mentésből (CLAUDE.md, 13. mérföldkő):
#   ops/restore.sh                                  # a mentések listája
#   ops/restore.sh backup-20261002-033000.tar.gz    # visszaállítás
# Megerősítést kér, előtte a mostani állapotról is mentést készít, leállítja
# az alkalmazást, visszaállítja az adatbázist és a feltöltött fájlokat, majd
# újraindítja az alkalmazást (az induláskor a migrációk lefutnak).
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.prod.yml)

if [ $# -lt 1 ]; then
  echo "Használat: ops/restore.sh <mentés neve>. A mentések, a legújabb elöl:"
  ls -1t backups/backup-*.tar.gz 2>/dev/null | head -20 | xargs -r -n1 basename || true
  exit 1
fi
NAME="$(basename "$1")"
if [ ! -f "backups/$NAME" ]; then
  echo "Nincs ilyen mentés: backups/$NAME" >&2
  exit 1
fi

# The backup must be whole before anything stops or changes. (The commands in
# the containers get no input: they must not eat the answers typed here.)
"${COMPOSE[@]}" exec -T backup sh /backup/restore.sh --check "/backups/$NAME" < /dev/null

echo "FIGYELEM: a mostani adatbázis és a feltöltött fájlok helyére a(z) $NAME tartalma kerül."
echo "Ami a mentés óta történt, elvész (előtte a mostani állapotról mentés készül)."
read -r -p "A folytatáshoz írd be: VISSZAÁLLÍT  > " ANSWER
if [ "$ANSWER" != "VISSZAÁLLÍT" ]; then
  echo "Megszakítva, semmi sem változott."
  exit 1
fi

echo "== Mentés a mostani állapotról"
if ! "${COMPOSE[@]}" exec -T backup sh /backup/backup.sh pre-restore < /dev/null; then
  read -r -p "A mostani állapotot nem sikerült menteni. Folytatod mégis? (igen/nem) > " AGAIN
  [ "$AGAIN" = "igen" ] || { echo "Megszakítva."; exit 1; }
fi

echo "== Az alkalmazás leállítása"
"${COMPOSE[@]}" stop app

echo "== Visszaállítás"
if ! "${COMPOSE[@]}" exec -T backup sh /backup/restore.sh "/backups/$NAME" < /dev/null; then
  echo "A visszaállítás NEM sikerült. Az alkalmazás újraindul; ha az adatbázis közben sérült, állítsd vissza a fenti, mostani állapotról készült mentést." >&2
  "${COMPOSE[@]}" start app
  exit 1
fi

echo "== Az alkalmazás indítása"
"${COMPOSE[@]}" start app
for _ in $(seq 1 60); do
  STATUS="$(docker inspect -f '{{.State.Health.Status}}' "$("${COMPOSE[@]}" ps -q app)" 2>/dev/null || true)"
  if [ "$STATUS" = "healthy" ]; then
    echo "Kész: az alkalmazás fut, a(z) $NAME állapotával."
    exit 0
  fi
  sleep 5
done
echo "Az alkalmazás 5 perc alatt sem lett egészséges. Napló: docker compose -f docker-compose.prod.yml logs app" >&2
exit 1
