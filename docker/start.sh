#!/bin/sh
set -e

if [ "$APP_ENV" = "production" ]; then
  # Production (CLAUDE.md, 13. mérföldkő): the settings first, then the
  # migrations; either failing stops the start. No demo data, ever.
  npx tsx scripts/check-config.ts
  npx prisma migrate deploy
else
  npx prisma migrate deploy
  # Loads the demo data on the first start only.
  npx tsx prisma/seed.ts --if-empty
fi
exec npm start
