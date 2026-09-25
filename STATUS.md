# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 26*

## Mi készült el

- 6. mérföldkő, 3. lépés: koordinátori felület (`/training`, menü: „Képzések”). Jogosítások (név, kód, érvényesség, aktív), képzések (adott jogosítás – inaktív nem választható –, dolgozat és sikerességi határ), rekordok (az ügynök nem módosítható; dolgozatnál az eredményből számol a sikeresség, egyébként a koordinátor jelöli; az érvényesség vége számolt, kézzel felülírható), fájlok (PDF/JPG/PNG, 10 MB, a típust a fájl eleje dönti el; eltávolításkor a fájl törlődik, a naplósor megmarad; saját kötet Dockerben), letöltés a rekord megtekintésének jogosultságával és hatókörével, lejáró jogosítások (hamarosan lejár és lejárt, hatókör szerint). Az admin beállításoknál a „hamarosan lejár” napjai. A szabályok tiszta függvények (`lib/training.ts`), tesztekkel.
- 6. mérföldkő, 1–2. lépés: adatmodell és migráció; jogosítás-számítás tiszta függvényekként (`lib/qualifications.ts`).
- 5. mérföldkő (feladattípusok) kész; eltérései elfogadva (További eldöntött szabályok 27–32.).

## Állapot

- Utolsó commit: `ed5b07a` – feat: calculate the qualifications of an agent (a 3. lépés commitja ezt követi)
- Tesztek: `npm test` → 422 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. mérföldkő, 4. lépés: nézetek (ügynök: saját; csapatvezető: csapat-táblázat; koordinátor és admin: mindenki).
