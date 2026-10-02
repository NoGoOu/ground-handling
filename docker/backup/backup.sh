#!/bin/sh
# One backup of the production server (CLAUDE.md, 13. mérföldkő, "Mentés"):
# the database and the uploaded files in one timestamped package,
#   /backups/backup-YYYYMMDD-HHMMSS.tar.gz   (Budapest time)
# holding database.dump (pg_dump, custom format), uploads.tar and manifest.txt.
# The package appears under its final name only when it is complete, so a
# half-made backup is never taken for a good one. Older ones than
# BACKUP_KEEP_DAYS are deleted afterwards.
#
# Runs in the backup container: daily from run.sh, or by hand (ops/backup.sh).
set -eu

KIND="${1:-manual}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="/backups/backup-$STAMP.tar.gz"

# Work in the backup directory itself, so the final step is an atomic rename.
WORK="$(mktemp -d /backups/.work-XXXXXX)"
trap 'rm -rf "$WORK"' EXIT

pg_dump -h db -U ground_handling -d ground_handling -Fc -f "$WORK/database.dump"
tar -C /uploads -cf "$WORK/uploads.tar" .
MIGRATION="$(psql -h db -U ground_handling -d ground_handling -tAc \
  'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name DESC LIMIT 1' || true)"
cat > "$WORK/manifest.txt" <<EOF
created=$(date -Iseconds)
kind=$KIND
last_migration=$MIGRATION
EOF
tar -C "$WORK" -czf "$WORK/package.tar.gz" database.dump uploads.tar manifest.txt
mv "$WORK/package.tar.gz" "$TARGET"
echo "Mentés kész: $(basename "$TARGET") ($(du -h "$TARGET" | cut -f1))"

# Keep BACKUP_KEEP_DAYS days; never the one just made.
find /backups -maxdepth 1 -name 'backup-*.tar.gz' -mmin +"$((KEEP_DAYS * 1440))" ! -name "$(basename "$TARGET")" \
  -exec sh -c 'echo "Régi mentés törölve: $(basename "$1")"; rm -f "$1"' sh {} \;
