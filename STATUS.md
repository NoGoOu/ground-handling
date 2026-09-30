# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 30. · CLAUDE.md verzió: 31*

## Mi készült el

- **9. mérföldkő, 4. lépés:** adatréteg és jogosultság.
  - `lib/data/staffing.ts`: az időszak napjaira betölti minden task foglaltsági ablakát (az előző és a következő nap listájával együtt, így a nappal átfedő ablakok mind megvannak, nem csak az aznap kezdődők) és a valós réteg műszakjait a részeikkel.
  - `lib/staffing/day.ts`: egy nap összeállítása (sávok, feladattípusok, beosztás, van-e valós beosztás), tesztekkel; a másik napról átnyúló blokk utazási ideje is számít.
  - Új, hatókör nélküli jogosultság: „Létszámigény megtekintése” (Tervező, Műszakvezető, Admin), migrációval; a `/staffing` útvonalat a proxy is védi.
- 3. lépés (`2def19f`): beosztás és hiány. 2. lépés (`8fda5cb`): sávok és igény. 1. lépés (`4ffa147`, `24bf6f3`): késéskód-dokumentum.

## Állapot

- Utolsó commit: `feat: load the staffing of a period and add its permission` (ez a commit; előtte `2def19f`)
- Tesztek: `npm test` → 658 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Adatbázison ellenőrizve a demo napon: az igény feladattípusonként és összesen, a beosztás 06:00–19:00 között, több hiányos sáv (pl. 16:15: igény 4, beosztás 1). 31 nap betöltése fél másodperc alatt.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 5. lépés: napi nézet – lépcsős grafikon és sávonkénti táblázat a `Létszámigény` oldalon.
