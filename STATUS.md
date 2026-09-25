# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 26*

## Mi készült el

- 6. mérföldkő, 6. lépés: figyelmeztetések a hiányzó vagy lejárt jogosítás megnevezésével (pl. „Kiss Péter: hiányzó vagy lejárt jogosítás: HA (lejárt)”): a napi lista kiosztásánál, a sávos nézetben új ütközéstípusként (a dobozon és a húzás utáni figyelmeztetésben), a „Kiosztás átvételénél” és a tervezői névadásnál (a pozíció követelménye a taskjai követelményeinek uniója, a terv napján). Az ablakot végző ügynöknek az ablak kezdőnapján kell érvényes jogosítással rendelkeznie; gyors fordulón a két rész követelménye együtt (`taskShortfalls`, tesztekkel). Mindegyik csak figyelmeztet.
- 6. mérföldkő, 1–5. lépés: adatmodell és migráció; jogosítás-számítás; koordinátori felület; nézetek; követelmények a légitársaság feladattípusainál.
- 5. mérföldkő (feladattípusok) kész; eltérései elfogadva (További eldöntött szabályok 27–32.).

## Állapot

- Utolsó commit: `2028cb8` – feat: set the qualifications each part of a task type needs (a 6. lépés commitja ezt követi)
- Tesztek: `npm test` → 428 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. mérföldkő, 7. lépés: tervező – követelmények a számolásban, betölthetőség párosítással, hiányjelzés, a névadás sorrendje.
