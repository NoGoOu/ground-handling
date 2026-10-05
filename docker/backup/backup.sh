#!/bin/sh
# One backup of the production server (CLAUDE.md, 13. mérföldkő, "Mentés";
# utómunka, "Növekményes fájlmentés"):
#   /backups/backup-YYYYMMDD-HHMMSS.tar.gz   (Budapest time)
# holds the whole database (database.dump, pg_dump custom format), the list of
# the uploaded files that exist at that moment (files.txt) and manifest.txt.
# The files themselves go to one shared store, /backups/files, each of them
# once: an uploaded file never changes (its name is ours, a UUID), so a file
# already in the store is not copied again. The package appears under its
# final name only when it is complete. Packages older than BACKUP_KEEP_DAYS
# are deleted, and then every stored file that no remaining package lists.
#
# Runs in the backup container: daily from run.sh, or by hand (ops/backup.sh).
set -eu

KIND="${1:-manual}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="/backups/backup-$STAMP.tar.gz"
STORE=/backups/files

# Work in the backup directory itself, so the final step is an atomic rename.
WORK="$(mktemp -d /backups/.work-XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

pg_dump -h db -U ground_handling -d ground_handling -Fc -f "$WORK/database.dump"

# The uploaded files of this moment; the health check's probe files are not ours to keep.
(cd /uploads && find . -type f ! -name '.*' | sed 's|^\./||' | sort) > "$WORK/files.txt"
mkdir -p "$STORE"
NEW=0
while IFS= read -r FILE; do
  if [ ! -f "$STORE/$FILE" ]; then
    mkdir -p "$STORE/$(dirname "$FILE")"
    cp -p "/uploads/$FILE" "$STORE/$FILE.part" && mv "$STORE/$FILE.part" "$STORE/$FILE"
    NEW=$((NEW + 1))
  fi
done < "$WORK/files.txt"

MIGRATION="$(psql -h db -U ground_handling -d ground_handling -tAc \
  'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name DESC LIMIT 1' || true)"
cat > "$WORK/manifest.txt" <<EOF
created=$(date -Iseconds)
kind=$KIND
format=2
last_migration=$MIGRATION
files=$(wc -l < "$WORK/files.txt" | tr -d ' ')
EOF
tar -C "$WORK" -czf "$WORK/package.tar.gz" manifest.txt files.txt database.dump
mv "$WORK/package.tar.gz" "$TARGET"
echo "Mentés kész: $(basename "$TARGET") ($(du -h "$TARGET" | cut -f1)), $(wc -l < "$WORK/files.txt" | tr -d ' ') fájl, ebből új a tárban: $NEW"

# Keep BACKUP_KEEP_DAYS days; never the one just made.
find /backups -maxdepth 1 -name 'backup-*.tar.gz' -mmin +"$((KEEP_DAYS * 1440))" ! -name "$(basename "$TARGET")" \
  -exec sh -c 'echo "Régi mentés törölve: $(basename "$1")"; rm -f "$1"' sh {} \;

# The store keeps only the files a remaining package lists (prune.sh), and
# deletes nothing while a package cannot be read.
sh /backup/prune.sh /backups
