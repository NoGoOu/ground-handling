# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 26*

## Mi készült el

- 6. mérföldkő, 4. lépés: nézetek. Ügynök: saját jogosítások (állapot, érvényesség) és képzések a letölthető fájlokkal, telefonon egy oszlopban (`/training/me`). Csapatvezető: ember × jogosítás táblázat állapotszínekkel (`/training/team`), a csapat lejáró jogosításai. Koordinátor és admin: mindenki, személyenkénti oldal (`/training/people`), a rekordok szerkesztésére mutató linkekkel. A személyoldal hatókörön kívül „nem található”.
- 6. mérföldkő, 1–3. lépés: adatmodell és migráció; jogosítás-számítás (`lib/qualifications.ts`); koordinátori felület (jogosítások, képzések, rekordok, fájlok, lejáró jogosítások).
- 5. mérföldkő (feladattípusok) kész; eltérései elfogadva (További eldöntött szabályok 27–32.).

## Állapot

- Utolsó commit: `dc1a765` – feat: let the coordinator manage qualifications, trainings and records (a 4. lépés commitja ezt követi)
- Tesztek: `npm test` → 422 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. mérföldkő, 5. lépés: admin – követelmények a légitársaság feladattípusainál, részenként.
