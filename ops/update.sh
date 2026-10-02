#!/usr/bin/env bash
# Frissítés (CLAUDE.md, 13. mérföldkő):
#   ops/update.sh            # mentés, letöltés (git), építés, újraindítás, állapotellenőrzés
#   ops/update.sh --force    # akkor is újraépít, ha nincs új verzió
# Az első indításra is jó: ha még nem fut semmi, a mentést kihagyja.
# Ha az állapotellenőrzés hibát ad, megáll, és leírja, hogyan lehet
# visszaállni az előző verzióra és a frissítés előtti mentésre.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.prod.yml)
FORCE="${1:-}"

running_commit() {
  # The commit the running app reports, or nothing.
  "${COMPOSE[@]}" exec -T app node -e \
    'fetch("http://127.0.0.1:3000/api/health").then(r=>r.json()).then(h=>console.log(h.status==="ok"?h.version.commit:"")).catch(()=>{})' \
    2>/dev/null || true
}

PREVIOUS="$(git rev-parse --short HEAD)"
BACKUP=""

echo "== 1. Mentés a frissítés előtt"
if [ -n "$("${COMPOSE[@]}" ps -q --status running backup 2>/dev/null)" ]; then
  bash ops/backup.sh before-update
  BACKUP="$(ls -1t backups/backup-*.tar.gz | head -1 | xargs basename)"
else
  echo "Még nem fut a rendszer (első indítás?): a mentés kimarad."
fi

echo "== 2. Az új verzió letöltése"
if ! git pull --ff-only; then
  echo "A letöltés nem sikerült (helyi módosítás vagy eltérő ág?). Semmi sem változott." >&2
  exit 1
fi
NEW="$(git rev-parse --short HEAD)"
if [ "$NEW" = "$PREVIOUS" ] && [ "$FORCE" != "--force" ] && [ "$(running_commit)" = "$NEW" ]; then
  echo "Már ez a verzió fut ($NEW); nincs teendő. Újraépítés: ops/update.sh --force"
  exit 0
fi

echo "== 3. Építés: $NEW"
export APP_COMMIT="$NEW"
APP_BUILD_DATE="$(git show -s --format=%cI HEAD)"
export APP_BUILD_DATE
"${COMPOSE[@]}" build app

echo "== 4. Újraindítás (a migrációk induláskor lefutnak)"
"${COMPOSE[@]}" up -d

echo "== 5. Állapotellenőrzés"
for _ in $(seq 1 60); do
  if [ "$(running_commit)" = "$NEW" ]; then
    echo "Kész: a(z) $NEW verzió fut, az állapota rendben."
    exit 0
  fi
  sleep 5
done

cat >&2 <<EOF

A FRISSÍTÉS NEM SIKERÜLT: az alkalmazás 5 perc alatt sem lett egészséges a(z) $NEW verzióval.
A hiba oka a naplóban:
  docker compose -f docker-compose.prod.yml logs app --tail 100

Visszaállás az előző verzióra ($PREVIOUS):
  git reset --hard $PREVIOUS
  APP_COMMIT=$PREVIOUS docker compose -f docker-compose.prod.yml up -d --build
EOF
if [ -n "$BACKUP" ]; then
  cat >&2 <<EOF
Ha az új verzió migrációja már lefutott, az adatbázist is vissza kell állítani
a frissítés előtti mentésre (ehhez az előző verziónak kell futnia):
  ops/restore.sh $BACKUP
EOF
fi
exit 1
