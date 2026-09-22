#!/bin/sh
set -e

npx prisma migrate deploy
# Loads the demo data on the first start only.
npx tsx prisma/seed.ts --if-empty
exec npm start
