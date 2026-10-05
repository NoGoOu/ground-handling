#!/bin/sh
# Tidies the shared file store of the backups (CLAUDE.md, 13. mérföldkő,
# utómunka, "Növekményes fájlmentés"): a stored file goes once no remaining
# package lists it. Every package is read first: an older package without a
# file list (it holds its files itself) is fine, but if any package or its
# list cannot be read, nothing is deleted, since its files might be among
# the ones that look unlisted.
#   prune.sh [backup directory, /backups by default]
set -eu

DIR="${1:-/backups}"
STORE="$DIR/files"
[ -d "$STORE" ] || exit 0

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
: > "$WORK/keep.txt"
UNREADABLE=""
for PACKAGE in "$DIR"/backup-*.tar.gz; do
  [ -e "$PACKAGE" ] || continue
  if ! tar -tzf "$PACKAGE" > "$WORK/contents.txt" 2>/dev/null; then
    UNREADABLE="$UNREADABLE $(basename "$PACKAGE")"
    continue
  fi
  if grep -qx "files.txt" "$WORK/contents.txt"; then
    tar -xzOf "$PACKAGE" files.txt >> "$WORK/keep.txt" 2>/dev/null || UNREADABLE="$UNREADABLE $(basename "$PACKAGE")"
  fi
done

if [ -n "$UNREADABLE" ]; then
  echo "Figyelem: nem olvasható mentés:$UNREADABLE. A fájltár takarítása most elmarad, semmi sem törlődik belőle." >&2
  exit 0
fi

sort -u "$WORK/keep.txt" > "$WORK/keep.sorted"
(cd "$STORE" && find . -type f | sed 's|^\./||' | sort) > "$WORK/stored.txt"
GONE=0
for FILE in $(comm -23 "$WORK/stored.txt" "$WORK/keep.sorted"); do
  rm -f "$STORE/$FILE"
  GONE=$((GONE + 1))
done
find "$STORE" -mindepth 1 -type d -empty -delete
[ "$GONE" -eq 0 ] || echo "A tárból törölve $GONE fájl, amely már egyik megőrzött mentésben sincs."
