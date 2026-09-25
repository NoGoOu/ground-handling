# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 25*

## Mi készült el

- 5. mérföldkő, 2. lépés: időszámítás taskonként (`lib/turnaround.ts`). A task részei a sablonja és a járata közös, meglévő részei (`partsKind`; ha nincs közös rész, a tasknak nincs teendője); csak ezek mérföldkövei és foglaltsági ablakai tartoznak hozzá. A horgonyok a járatból számolnak, a task sablonjának paramétereivel (pl. a csak indulási sablon indulási horgonya a késve érkező gép miatt kitolódik). A járat hatályos ATA/ATD-je a rendszerérték, ennek hiányában az elsődleges task rögzítése; a többi task ATA/ATD sora ezt mutatja, a saját rögzítés látszik, de nem hatályos, és ott hiányzóként sem jelölődik. A lezárt task pillanatképe a sablon részeit is tárolja (a régi pillanatkép kétrészesként olvasódik). A TaskView-ban a feladattípus, az elsődleges jelölés és a sablon részei. Tesztekkel.
- 5. mérföldkő, 1. lépés: adatmodell és migráció. Új: `TaskType` (név, kód), `AirlineTaskType` (légitársaság, feladattípus, sablon, aktív, elsődleges; légitársaságonként legfeljebb egy elsődleges). A sablon feladattípushoz tartozik, és jelöli a részeit (érkezési, indulási; legalább az egyik). A task feladattípust, saját sablont és elsődleges jelölést kap; járatonként feladattípusonként egy task, legfeljebb egy elsődleges. A migráció létrehozza az „Alap” típust: minden sablon és task ez alá kerül, minden task elsődleges, és a légitársaság alapértelmezett sablonjából az egyetlen, elsődleges, aktív „Alap” típus lesz. A `Flight.templateId` és az `Airline.defaultTemplateId` megszűnt (a taskra, illetve a légitársaság feladattípusaiba költözött). A kód ennek megfelelően: a járat űrlapja az elsődleges task sablonját állítja, a 3. mérföldkő „alapértelmezett sablon” űrlapja az elsődleges típusét, az import az elsődleges típus sablonjával hozza létre a taskot. A viselkedés változatlan.
- 4. mérföldkő, utómunka 1: „Kiosztás átvétele” a teljes tervre is (`2a28aaa`).

## Állapot

- Utolsó commit: `d537069` – feat: add task types and move the template onto the task (a 2. lépés commitja ezt követi)
- Tesztek: `npm test` → 377 teszt, mind zöld; meglévő tesztet nem kellett módosítani (a pillanatkép és az időszámítás tesztjei új esetekkel bővültek)
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A migráció ellenőrzése a fejlesztői adatbázison (56 járat, 10 rögzítés): mind az 56 task pontosan azt a sablont kapta, amit a járata használt, a két légitársaság alapértelmezett sablonja lett az elsődleges, aktív „Alap” típus sablonja, és a séma és az adatbázis között nincs eltérés. A migrált és a tiszta seedelt adatokon is működik a napi taskok számolása, az import és az újraimport (50 új, majd 50 változatlan), a terv és a kiosztás átvétele.

## Eltérések a CLAUDE.md-től

- A CLAUDE.md adatmodellje a Flightnál még „template”-et említ; a jóváhagyott terv szerint a sablon a taskra költözött.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 5. mérföldkő, 3. lépés: járat létrehozása és import, a taskok a légitársaság aktív feladattípusai szerint.
