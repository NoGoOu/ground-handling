#!/usr/bin/env bash
# Próba-visszaállítás (CLAUDE.md, 13. mérföldkő): egy mentést egy ideiglenes,
# üres adatbázisba tölt, és kiírja, mi van benne, így kiderül, hogy a mentés
# használható-e. Az éles rendszerhez nem nyúl; a végén minden törlődik.
#   ops/restore-test.sh                                  # a legújabb mentés
#   ops/restore-test.sh backup-20261002-033000.tar.gz
set -euo pipefail
cd "$(dirname "$0")/.."

NAME="${1:-}"
if [ -z "$NAME" ]; then
  NAME="$(ls -1t backups/backup-*.tar.gz 2>/dev/null | head -1 | xargs -r basename)"
  [ -n "$NAME" ] || { echo "Nincs mentés a backups könyvtárban." >&2; exit 1; }
fi
NAME="$(basename "$NAME")"
[ -f "backups/$NAME" ] || { echo "Nincs ilyen mentés: backups/$NAME" >&2; exit 1; }

CONTAINER="gh-restore-test-$$"
cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "== Próba-visszaállítás: $NAME, egy ideiglenes, üres adatbázisba"
docker run -d --name "$CONTAINER" \
  -e POSTGRES_USER=ground_handling -e POSTGRES_PASSWORD=restore-test -e POSTGRES_DB=ground_handling \
  -v "$(pwd)/backups:/backups:ro" postgres:17-alpine >/dev/null

# The image starts a temporary server first; wait for the real one.
for _ in $(seq 1 60); do
  if docker logs "$CONTAINER" 2>&1 | grep -q "PostgreSQL init process complete" &&
     docker exec "$CONTAINER" pg_isready -U ground_handling -d ground_handling >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec -e NAME="$NAME" "$CONTAINER" sh -eu -c '
  WORK="$(mktemp -d)"
  tar -C "$WORK" -xzf "/backups/$NAME"
  echo "A mentés adatai:"; sed "s/^/  /" "$WORK/manifest.txt"
  pg_restore -U ground_handling -d ground_handling --no-owner --exit-on-error "$WORK/database.dump"
  q() { psql -U ground_handling -d ground_handling -tAc "$1"; }
  echo "Az adatbázisban:"
  echo "  táblák: $(q "SELECT count(*) FROM information_schema.tables WHERE table_schema = '"'"'public'"'"'")"
  echo "  utolsó migráció: $(q "SELECT migration_name FROM _prisma_migrations ORDER BY migration_name DESC LIMIT 1")"
  echo "  felhasználók: $(q "SELECT count(*) FROM \"User\"") (aktív admin: $(q "SELECT count(*) FROM \"User\" u JOIN \"UserRole\" ur ON ur.\"userId\" = u.id JOIN \"Role\" r ON r.id = ur.\"roleId\" WHERE u.active AND r.\"builtIn\""))"
  echo "  járatok: $(q "SELECT count(*) FROM \"Flight\""), taskok: $(q "SELECT count(*) FROM \"Task\""), műszakok: $(q "SELECT count(*) FROM \"Shift\"")"
  echo "  képzési rekordok: $(q "SELECT count(*) FROM \"TrainingRecord\""), eszközök: $(q "SELECT count(*) FROM \"Equipment\""), hibajegyek: $(q "SELECT count(*) FROM \"Fault\"")"
  echo "Feltöltött fájlok a mentésben: $(tar -tf "$WORK/uploads.tar" | grep -vc "/$" || true)"
'
echo "== A próba sikerült: a mentés visszaállítható. Az ideiglenes adatbázis törlődik."
