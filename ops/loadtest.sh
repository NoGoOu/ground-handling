#!/usr/bin/env bash
# Terhelési próba az éles összeállításon, élesítés előtt (CLAUDE.md, 13.
# mérföldkő, utómunka, "Terhelési próba"):
#   ops/loadtest.sh [ügynökök száma, alapból 200] [a terhelő további kapcsolói]
#   pl. ops/loadtest.sh 1000 --stages 50,100,200,400,800
# Létrehozza a próbaadatokat (ügynökök, műszakvezetők, mai járatok, beosztás),
# lefuttatja a terhelőt az alkalmazás konténeréből a nyilvános címre, a végén
# pedig mindent eltávolít (hiba vagy megszakítás esetén is). Valódi járatok
# mellett nem fut. Pontosabb eredményhez a terhelőt egy másik gépről futtasd,
# lásd a README „Terhelési próba” részét.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.prod.yml)
AGENTS="${1:-200}"
shift || true
URL="${LOADTEST_URL:-$(grep -E '^APP_PUBLIC_URL=' .env | cut -d= -f2- | tr -d '"')}"

echo "== Próbaadatok létrehozása ($AGENTS ügynök)"
OUT="$("${COMPOSE[@]}" exec -T app npx tsx scripts/loadtest-data.ts create --agents "$AGENTS" < /dev/null)"
cleanup() {
  echo "== Próbaadatok eltávolítása"
  "${COMPOSE[@]}" exec -T app npx tsx scripts/loadtest-data.ts remove < /dev/null || true
}
trap cleanup EXIT
echo "$OUT" | grep -v "jelszava" || true
PASSWORD="$(echo "$OUT" | sed -nE 's/.*jelszava \(csak most látszik\): (.*)$/\1/p')"

echo "== Terhelés: $URL"
"${COMPOSE[@]}" exec -T -e LOADTEST_PASSWORD="$PASSWORD" app \
  npx tsx scripts/loadtest.ts --url "$URL" --agents "$AGENTS" "$@" < /dev/null
