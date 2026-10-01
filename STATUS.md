# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 34*

## Mi készült el

- **A 10. mérföldkő (oktatás: e-vizsga, OJT, kibocsátás) kész.**
- 9. lépés: seed – Kiss Péter mentor is (Ügynök + Mentor), új Vizsgáztató felhasználó (Vizsga Vera, érvényes HA és HC jogosítással); a „Helyőrző A” képzés két résszel (OJT-követelmény a demóban 2), a „Helyőrző C” csak elmélettel; öt kérdés, két vizsgalap, három szempont. Nagy Eszter „Helyőrző A” folyamata félúton (sikertelen kísérlet visszajelzéssel és belső megjegyzéssel, nyitott kísérlet, egy értékelt megfelelő gyakorlás), a „Helyőrző C” folyamata kibocsátható. README (10. mérföldkő, kipróbálás, demo felhasználók); tiszta Docker-indítás rendben (18 migráció).
- 1–8. lépés: adatmodell (`db7c7e2`), tiszta függvények (`95ae671`), szerkesztőfelületek (`2e1c820`), e-vizsga (`1a90dbd`), képzési folyamat (`2d3010d`), OJT a taskon (`283f5e6`), gyakorlati vizsga (`c1fdb81`), kibocsátás (`0876b9c`).

## Állapot

- Utolsó commit: `feat: seed exams, a mentor, an examiner and two processes` (ez a commit; előtte `0876b9c`)
- Tesztek: `npm test` → 754 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Minden lépés adatbázison végigpróbálva; a kitöltő nézetet telefonméretben statikusan renderelve néztem meg. Bejelentkezve nem néztem meg (jelszót nem írok be).

## Eltérések a CLAUDE.md-től

- Nincs. A jóváhagyott 14 döntés szerint készült (felvehetők a szabályok közé). Megvalósításban, a terven felül:
  - a megválaszolatlan szöveges kérdés 0 pont, nem vár javításra; a kísérlet a sikerességi határt is lemásolja;
  - az időkorlát a vizsgázó Kezdés gombjától fut; megszakításkor a nyitott e-vizsga a mentett válaszokkal beadásra kerül;
  - ha a képzésnek dolgozata van, a gyakorlati rész mellé az elméleti rész is kell (a rekordba a dolgozat eredménye kerül), és elméleti résszel a dolgozat nem kapcsolható ki;
  - az OJT-értékelés egyszeri, csak futó folyamatban; a gyakorlati vizsga rögzítés után nem módosítható, a végeredményt a vizsgáztató adja a szempontoktól függetlenül;
  - a seedben Kiss Péter kapta a Mentor szerepkört (külön mentor-ügynök helyett, hogy a beosztás és a létszámigény demója ne változzon).

## Kérdések a tervezéshez

- A demóban az OJT-követelmény 2 gyakorlás (a helyőrző alapérték 10); a valós értékek és a küszöbök a projekt gazdájától jönnek.
- A gyakorlati vizsga végeredménye legyen-e automatikusan sikertelen, ha valamelyik szempont nem felelt meg (most a vizsgáztató dönt)?

## Következő lépés

- A tervezés döntése szerint.
