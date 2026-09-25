# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 26*

## Mi készült el

- 6. mérföldkő, 7. lépés: a tervező a követelményekkel számol (`lib/planning/staffing.ts`). Az ablak a saját részének követelményét kapja, a pozícióé a taskjaié együtt. A betölthetőséget párosítás dönti el (pozíció ↔ különböző aktív ügynök, akinél a pozíció minden jogosítása érvényes aznap), nem jogosításonkénti számolás; a 3 PRM / 3 DG / 1 mindkettő eset tesztelve. A mohó lépés lefedő pozíciót keres, és nem bővít úgy, hogy több pozíció maradjon betölthetetlen; a kiegyenlítés sem ronthat rajta. Hiánynál a terv elkészül, és jelzi a betölthetetlen pozíciókat és jogosításonként a „kell / van” számokat; a névadás listája elöl a megfelelő ügynököket mutatja, a többit a hiányzó jogosítással. Követelmények nélkül a számolás változatlan.
- 6. mérföldkő, 1–6. lépés: adatmodell és migráció; jogosítás-számítás; koordinátori felület; nézetek; követelmények a légitársaság feladattípusainál; figyelmeztetések (napi lista, sávos nézet, „Kiosztás átvétele”, tervezői névadás).
- 5. mérföldkő (feladattípusok) kész; eltérései elfogadva (További eldöntött szabályok 27–32.).

## Állapot

- Utolsó commit: `5a36498` – feat: warn when an agent lacks a required qualification (a 7. lépés commitja ezt követi)
- Tesztek: `npm test` → 437 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. mérföldkő, 8. lépés: seed (oktatási koordinátor, helyőrző jogosítások és képzések, minden állapot a demo ügynököknél), README, STATUS.md, indítás tiszta állapotból.
