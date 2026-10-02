#!/bin/sh
# Restores one backup (CLAUDE.md, 13. mérföldkő): the database is dropped and
# loaded from the package, the uploaded files are replaced by the package's.
# Runs in the backup container, called by ops/restore.sh, which asks for the
# confirmation and stops the app first.
set -eu

FILE="$1"
[ -f "$FILE" ] || { echo "Nincs ilyen mentés: $FILE" >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
tar -C "$WORK" -xzf "$FILE"
for part in database.dump uploads.tar manifest.txt; do
  [ -f "$WORK/$part" ] || { echo "Ez nem ennek az alkalmazásnak a mentése (hiányzik: $part): $FILE" >&2; exit 1; }
done
echo "Visszaállítás: $(basename "$FILE")"
sed 's/^/  /' "$WORK/manifest.txt"

# The whole database anew, so nothing newer than the backup stays behind.
psql -h db -U ground_handling -d postgres -v ON_ERROR_STOP=1 -q \
  -c 'DROP DATABASE IF EXISTS ground_handling WITH (FORCE)' \
  -c 'CREATE DATABASE ground_handling OWNER ground_handling'
pg_restore -h db -U ground_handling -d ground_handling --no-owner --exit-on-error "$WORK/database.dump"

# The files: everything out, the package's in.
find /uploads -mindepth 1 -maxdepth 1 -exec rm -rf {} +
tar -C /uploads -xf "$WORK/uploads.tar"
echo "Visszaállítva: az adatbázis és $(find /uploads -type f | wc -l) feltöltött fájl."
