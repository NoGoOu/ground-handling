# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 30. · CLAUDE.md verzió: 31*

## Mi készült el

- **9. mérföldkő, 2. lépés:** `lib/staffing/` – az igény tiszta függvényei.
  - `dayBands`: a budapesti nap 15 perces sávjai a nap elejétől, valós időben (96; óraátállításkor 92 vagy 100).
  - `peakWithin`: a sávon belül a legtöbb egyszerre futó ablak, félig nyitott határokkal.
  - `demandOfBands`: sávonként az igény feladattípusonként és összesen; az összesen a minden ablakból együtt számolt csúcs.
  - Tesztek: félig nyitott határ, egyperces ablak, éjfélen átnyúló ablak, mindkét óraátállítási nap, törölt rész, „nincs teendő” task, késés, és hogy az összesen nem a típusok összege.
- 1. lépés (a 8. mérföldkő utómunkája, `4ffa147`, `24bf6f3`): késéskód-dokumentum légitársaságonként, megnyitás a járatról, az alapértelmezett tábla IATA-leírásai.

## Állapot

- Utolsó commit: `feat: count the staffing demand per 15-minute band` (ez a commit; előtte `24bf6f3`)
- Tesztek: `npm test` → 639 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 3. lépés: beosztás és hiány – operatív részek a blokkok nélkül, a sáv legkisebb értéke; hiány és többlet az összesített igényhez képest.
