# STATUS

*Frissítve: 2026. október 24. · CLAUDE.md 46. verzió*

## Mi készült el

- Ikarus-import, 2. lépés: fordulók lajstrom alapján, tiszta függvényként (`lib/ikarus/pairing.ts`): az érkezés párja ugyanannak a lajstromnak az első, még szabad indulása az érkezés után, 24 órán belül, és a gép következő érkezése előtt; ami nem párosul, egyoldalú. Tesztek: a 24 órás határ, egy indulás nem jut két érkezésnek, a kimaradt indulás nem viszi el a következő fordulóét, lajstrom nélkül egyoldalú, éjszakázó gép.
- Próba a valódi mentésen (a repón kívül): 6543 rekordból 3003 forduló, 251 csak érkező, 286 csak induló; az érkezések 92%-a párosul. A földi idő mediánja 55 perc.
- (1. lépés: beolvasás és összefésülés, `lib/ikarus/`.)

## Állapot

- Utolsó commit: lásd `git log -1` (feat: pair the Ikarus flights by registration)
- Tesztek: 882 zöld; tsc és lint tiszta.

## Eltérések a CLAUDE.md-től

- A jóváhagyott terv szerint: a hárombetűs légitársaság-kódú járatok is bekerülnek (a légitársaság-űrlap formátum-ellenőrzése a 3. lépésben a 3 betűt is elfogadja); a forduló párja a gép következő érkezése előtti indulás lehet (2. lépés); az érkezési rész üzemnapja az STA budapesti napja (42. szabály szerint).
- A 14. mérföldkő 1. lépésének átmeneti BUD-alapértékei (`lib/stations.ts`) a 4. lépésig maradnak.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- Ikarus-import, 3. lépés: írás az adatbázisba (próbafuttatás, `--apply`, újrafuttatás az AODB-azonosítóval, `remove`, importnapló, tiltás éles módban).
