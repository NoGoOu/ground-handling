# STATUS

*Frissítve: 2026. október 24. · CLAUDE.md 46. verzió*

## Mi készült el

- Ikarus-import, 4. lépés: kiértékelő riport (`scripts/ikarus-report.ts`, `lib/ikarus/report.ts`): CSV naponként (járatok, gyors, hosszú és egyoldalú fordulók, a tervező pozíciószáma és munkaórája a mostani beállításokkal, betölthetőség nélkül, a létszámigény csúcsa és ideje) és szöveges összefoglaló (hétköznapi és hétvégi átlag, a beállítások). Csak a repón kívülre ír; a hiányos napokat (hézag a mentésben, vagy a nap még nem ért véget) jelöli, és kihagyja az átlagból. Futása kb. 2 perc a 27 napra, főleg a napi járatlista lekérdezései miatt (a 15. mérföldkő gyorsítja).
- Az eredmény a valódi mentésen (27 nap, ebből 22 teljes): hétköznap átlagosan 167 járat, 29,2 pozíció, 241 munkaóra, a létszámigény csúcsa 16,6; hétvégén 149 járat, 27,3 pozíció, 219 munkaóra, csúcs 15,8. A valóság hétköznap kb. 20–40 ügynök: a pozíciószám ezen belül van, a mostani sablon- és tervezési paraméterekkel.
- A tervező és a létszámigény felülete valós napokon kipróbálva (háromnapos terv, napi nézet, heti áttekintés): működik, a számok egyeznek a riporttal. A betölthetőségi figyelmeztetés várható, mert a demo adatbázisban kevés az ügynök.
- (1–3. lépés: beolvasás, összefésülés, fordulók lajstrom alapján, írás az adatbázisba.)

## Állapot

- Utolsó commit: lásd `git log -1` (feat: report the planner and the staffing demand on the real days)
- Tesztek: 902 zöld; tsc és lint tiszta.

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

- Ikarus-import, 5. lépés: README (rövid leírás a forrás címe nélkül), STATUS.md. Utána a 14. mérföldkő a 2. lépéssel.
