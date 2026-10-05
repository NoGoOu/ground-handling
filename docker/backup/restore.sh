#!/bin/sh
# Restores one backup (CLAUDE.md, 13. mérföldkő): the database is dropped and
# loaded from the package, and the uploaded files become exactly the ones the
# package lists, from the shared store (/backups/files). An older package with
# all the files in it (uploads.tar) is restored as well.
# Runs in the backup container, called by ops/restore.sh, which asks for the
# confirmation and stops the app first. With --check it only checks that the
# backup is whole (the package and every listed file), and changes nothing.
#   restore.sh [--check] /backups/backup-....tar.gz
set -eu

CHECK_ONLY=""
if [ "${1:-}" = "--check" ]; then CHECK_ONLY=1; shift; fi
FILE="$1"
STORE=/backups/files
[ -f "$FILE" ] || { echo "Nincs ilyen mentés: $FILE" >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
tar -C "$WORK" -xzf "$FILE"
for part in database.dump manifest.txt; do
  [ -f "$WORK/$part" ] || { echo "Ez nem ennek az alkalmazásnak a mentése (hiányzik: $part): $FILE" >&2; exit 1; }
done
if [ ! -f "$WORK/uploads.tar" ] && [ ! -f "$WORK/files.txt" ]; then
  echo "Ez nem ennek az alkalmazásnak a mentése (hiányzik a fájllista): $FILE" >&2
  exit 1
fi

# Before anything changes: every listed file must be in the store.
if [ -f "$WORK/files.txt" ]; then
  MISSING=0
  while IFS= read -r NAME; do
    [ -f "$STORE/$NAME" ] || { echo "Hiányzik a mentésből: $NAME" >&2; MISSING=$((MISSING + 1)); }
  done < "$WORK/files.txt"
  [ "$MISSING" -eq 0 ] || { echo "$MISSING fájl hiányzik a tárból; a visszaállítás nem indul el, semmi sem változott." >&2; exit 1; }
fi
if [ -n "$CHECK_ONLY" ]; then
  echo "A mentés ép: $(basename "$FILE")"
  sed 's/^/  /' "$WORK/manifest.txt"
  exit 0
fi
echo "Visszaállítás: $(basename "$FILE")"

# The whole database anew, so nothing newer than the backup stays behind.
psql -h db -U ground_handling -d postgres -v ON_ERROR_STOP=1 -q \
  -c 'DROP DATABASE IF EXISTS ground_handling WITH (FORCE)' \
  -c 'CREATE DATABASE ground_handling OWNER ground_handling'
pg_restore -h db -U ground_handling -d ground_handling --no-owner --exit-on-error "$WORK/database.dump"

# The files: everything out, the backup's in.
find /uploads -mindepth 1 -maxdepth 1 -exec rm -rf {} +
if [ -f "$WORK/files.txt" ]; then
  while IFS= read -r NAME; do
    mkdir -p "/uploads/$(dirname "$NAME")"
    cp -p "$STORE/$NAME" "/uploads/$NAME"
  done < "$WORK/files.txt"
else
  tar -C /uploads -xf "$WORK/uploads.tar"
fi
echo "Visszaállítva: az adatbázis és $(find /uploads -type f | wc -l | tr -d ' ') feltöltött fájl."
