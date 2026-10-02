#!/bin/sh
# The daily backup (CLAUDE.md, 13. mérföldkő): the backup container runs this
# loop, so the server's crontab is not needed. Once a day at BACKUP_TIME
# (HH:MM, Budapest time, placeholder 03:30) it calls backup.sh.
set -eu

TIME="${BACKUP_TIME:-03:30}"
case "$TIME" in
  [0-2][0-9]:[0-5][0-9]) ;;
  *) echo "A BACKUP_TIME alakja ÓÓ:PP kell legyen, pl. 03:30 (most: $TIME)" >&2; exit 1 ;;
esac
case "${BACKUP_KEEP_DAYS:-14}" in
  ''|*[!0-9]*) echo "A BACKUP_KEEP_DAYS egész számú nap kell legyen" >&2; exit 1 ;;
esac

echo "Napi mentés $TIME-kor ($(date +%Z)), ${BACKUP_KEEP_DAYS:-14} napig őrizve, a /backups könyvtárba."
LAST=""
while true; do
  TODAY="$(date +%Y-%m-%d)"
  # The time has come today and this day has no backup yet: one per day,
  # also when the clock is changed (03:30 is clear of the change at 02:00-03:00).
  if [ "$(date +%H:%M)" = "$TIME" ] && [ "$LAST" != "$TODAY" ]; then
    LAST="$TODAY"
    sh /backup/backup.sh daily || echo "A mentés NEM sikerült: $(date -Iseconds)" >&2
  fi
  sleep 20
done
