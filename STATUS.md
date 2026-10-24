# STATUS

*Frissítve: 2026. október 24. · CLAUDE.md 46. verzió*

## Mi készült el

- Közbeiktatva, Ikarus-import, 1. lépés: beolvasás és összefésülés tiszta függvényként (`lib/ikarus/`): a napi mappák és a fájlnevek (UTC), BOM, a menetrendi idő UTC-ben, a nap nélküli idők a menetrendi időhöz legközelebbi napra (51. szabály), rekordonkénti összefésülés (irány + AODB-azonosító; a tényleges idő és a lajstrom megmarad). Tesztek kitalált mintákkal.
- Próbaolvasás a valódi mentésen (a repón kívül): 26 napi mappa, 1080 pillanatkép, 6541 rekord (3253 érkezés, 3288 indulás), olvashatatlan fájl és rekord nincs.

## Állapot

- Utolsó commit: lásd `git log -1` (feat: read and merge the Ikarus snapshots)
- Tesztek: 874 zöld; tsc és lint tiszta.

## Eltérések a CLAUDE.md-től

- A jóváhagyott terv szerint: a hárombetűs légitársaság-kódú járatok is bekerülnek (a légitársaság-űrlap formátum-ellenőrzése a 3. lépésben a 3 betűt is elfogadja); a forduló párja a gép következő érkezése előtti indulás lehet (2. lépés); az érkezési rész üzemnapja az STA budapesti napja (42. szabály szerint).
- A 14. mérföldkő 1. lépésének átmeneti BUD-alapértékei (`lib/stations.ts`) a 4. lépésig maradnak.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- Ikarus-import, 2. lépés: fordulók lajstrom alapján, tiszta függvényként, tesztekkel.
