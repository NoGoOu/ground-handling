# STATUS

*Frissítve: 2026. október 24. · CLAUDE.md 46. verzió*

## Mi készült el

- Ikarus-import, 3. lépés: írás az adatbázisba (`scripts/ikarus-import.ts`, `lib/data/ikarus.ts`, `lib/ikarus/convert.ts`). Alapból próbafuttatás összesítéssel; `--apply` ír az importnaplóba („Ikarus” profillal); `remove` eltávolít; éles módban megtagadja. Migráció: AODB-azonosító a járatrészeken, „Ikarus” ETA/ETD-forrás, „Ikarus-import” jelölés a légitársaságon.
- A járatrend-import próbafuttatását és mentését használja: a járatot először az AODB-azonosító találja meg; az Ikarus által írt becsült és tényleges idő az újrafuttatásnál nem számít üzemi adatnak, így a párosítás átrendeződhet (3. mérföldkő szabálya).
- Próba a valódi mentésen, a helyi fejlesztői példányban: 1082 pillanatkép, 6549 járatrész, 3543 járat (3005 forduló, 253 csak érkező, 285 csak induló; az érkezések 92%-a párosul). Az újrafuttatás nem duplikál; egy későbbi futás 1 járatot átpárosított, 1-et összevont, ütközés nélkül. A `remove` után csak a korábbi adatok maradnak.
- (1–2. lépés: beolvasás, összefésülés, fordulók lajstrom alapján, `lib/ikarus/`.)

## Állapot

- Utolsó commit: lásd `git log -1` (feat: write the Ikarus flights into the database)
- Tesztek: 896 zöld; tsc és lint tiszta; a migráció után a séma-eltérés üres.

## Eltérések a CLAUDE.md-től

- A jóváhagyott terv szerint: hárombetűs légitársaság-kód is (a légitársaság-űrlap formátum-ellenőrzése is elfogadja); a forduló párja a gép következő érkezése előtti indulás lehet; az érkezési rész üzemnapja az STA budapesti napja (42. szabály).
- A mentésben az útvonal több állomás is lehet, repülési sorrendben: a járatrész állomása az érkezésnél az utolsó, az indulásnál az első (a Budapest melletti). Az általános repülésnél az útvonal szám (pl. „016”), ez is bekerül.
- Az Ikarus-becslés csak akkor írja felül a kézi vagy üzenetből jött ETA/ETD-t, ha az régebbi a rekord utolsó pillanatképénél (a legutóbbi érték szabálya); az üzenetből jött ATA/ATD marad. Az állóhelyet felülírja, ha a mentés ad egyet.
- „Az utolsó importból hiányzik” jelölést az Ikarus-import nem állít: a mentés gördülő ablak, nem menetrend.
- A `remove` a járatokhoz párosított üzeneteket párosítatlanná teszi (nem törli), az importnaplót megtartja; ha Ikarus-járat taskján gyakorlati vizsga van, semmit nem távolít el.
- Az új „Ikarus” forrás a késésrekordokkal közös felsorolásba került (a késésrekord forrása sosem Ikarus).
- A 14. mérföldkő 1. lépésének átmeneti BUD-alapértékei (`lib/stations.ts`) a 4. lépésig maradnak.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- Ikarus-import, 4. lépés: kiértékelő riport a repón kívülre; a tervező és a létszámigény kipróbálása néhány valós napon.
