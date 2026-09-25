# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 26*

## Mi készült el

- 6. mérföldkő, 5. lépés: a légitársaság feladattípus-táblázatában típusonként az érkezés és az indulás követelménye (az aktív jogosítások jelölőnégyzetei; egy inaktív jogosítás meglévő követelményéhez a mentés nem nyúl, és az ellenőrzés sem veszi figyelembe).
- 6. mérföldkő, 1–4. lépés: adatmodell és migráció; jogosítás-számítás (`lib/qualifications.ts`); koordinátori felület; nézetek (ügynök, csapatvezető, koordinátor és admin).
- 5. mérföldkő (feladattípusok) kész; eltérései elfogadva (További eldöntött szabályok 27–32.).

## Állapot

- Utolsó commit: `e3b443d` – feat: show qualifications to agents, team leaders and the coordinator (az 5. lépés commitja ezt követi)
- Tesztek: `npm test` → 423 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. mérföldkő, 6. lépés: figyelmeztetések (napi lista, sávos nézet, „Kiosztás átvétele”, tervezői névadás).
