# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 34*

## Mi készült el

- **10. mérföldkő, 1. lépés:** adatmodell és migráció.
  - Képzés: elméleti és gyakorlati rész; OJT-követelmény három paraméterrel (megfelelő gyakorlások száma, kötelező mérföldkövek teljessége, zöld vagy sárga rögzítések aránya). A helyőrző alapértékek (10, 100%, 0%) egy helyen, konstansként (`lib/exams/defaults.ts`); teszt őrzi, hogy az adatbázis alapértékei ugyanezek.
  - Kérdésbank válaszlehetőségekkel; vizsgalap a kérdések sorrendjével, időkorláttal és a többválaszos pontozás módjával (paraméter, alapból „csak a teljesen helyes”).
  - Képzési folyamat; vizsgakísérlet a vizsgalap másolatával és a válaszokkal; OJT-gyakorlás a task részén, értékeléssel és rögzített mutatókkal; gyakorlati szempontok és gyakorlati vizsga; a rögzítésen a „gyakornok rögzítette” jelölés; a képzési rekord hivatkozik a kibocsátó folyamatra.
  - Az adatbázis kikényszeríti: egy nyitott folyamat ügynökönként és képzésenként, egy nyitott kísérlet folyamatonként, az elméleti rész csak dolgozattal és határral, a paraméterek tartományai.
  - Új jogosultságok („Vizsgák szerkesztése”, „Mentorálás”, „Vizsgáztatás”, „Kibocsátás”), új alapértelmezett Mentor és Vizsgáztató szerepkör; az Oktatási koordinátor megkapja a vizsgák szerkesztését, a vizsgáztatást és a kibocsátást. Tesztekkel.
  - A meglévő működés nem változott; a seed az új táblákat is üríti újratöltéskor.

## Állapot

- Utolsó commit: `feat: add the data model of exams, OJT and release` (ez a commit; előtte `188e974`)
- Tesztek: `npm test` → 703 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- Nincs. A jóváhagyott döntések szerint készül (14 pont, a terv szerint).

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. lépés: tiszta függvények (`lib/exams/`) – az e-vizsga pontozása és eredménye, az OJT-mutatók és a követelmény, a folyamat állapota, a mentor és a vizsgáztató alkalmassága; tesztekkel.
