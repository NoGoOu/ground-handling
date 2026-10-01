# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 34*

## Mi készült el

- **10. mérföldkő, 2. lépés:** tiszta függvények (`lib/exams/`), tesztekkel.
  - `snapshot.ts`: a vizsgakísérlet másolata (a kérdések és a válaszlehetőségek sorrendben, a sikerességi határral); a vizsgázónak szánt nézet a helyes válaszok nélkül; a ki nem tölthető vizsgalap felismerése.
  - `scoring.ts`: választós kérdés pontozása (egy helyes; több helyes a vizsgalap paramétere szerint: csak a teljesen helyes vagy arányos), a válaszok tisztítása, a megválaszolatlan kérdés 0 pont, az eredmény pontos összevetéssel és lefelé kerekített százalékkal, időkorlát és a kísérlet állapota.
  - `ojt.ts`: a gyakorlás részei (gyors fordulónál az érkezési gyakornoké az egész task), a mutatók (kötelező mérföldkövek teljessége, a gyakornok aránya, eltérések színenként), a megfelelő gyakorlás és a követelmény teljesülése a képzés paraméterei szerint.
  - `process.ts`: a folyamat részei és állapota („kibocsátható” számolt), a kibocsátás rekordja (a kibocsátás napja, érvényesség a jogosítás szerint, az utolsó sikeres e-vizsga eredménye).
  - `eligibility.ts`: mentor és vizsgáztató alkalmassága (jogosultság és a képzés jogosítása az adott napon; inaktív jogosítás nem számít, 33. szabály).
- 1. lépés (`db7c7e2`): adatmodell, migráció, jogosultságok, Mentor és Vizsgáztató szerepkör.

## Állapot

- Utolsó commit: `feat: score exams and judge practices in pure functions` (ez a commit; előtte `db7c7e2`)
- Tesztek: `npm test` → 736 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: a megválaszolatlan szöveges kérdés 0 pont, nem vár javításra; a kísérlet a sikerességi határt is lemásolja, hogy az eredmény később ne változzon.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 3. lépés: kérdésbank, vizsgalapok, gyakorlati szempontok és a képzés részeinek szerkesztése (`Képzések → Vizsgák`).
