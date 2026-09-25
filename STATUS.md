# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 25*

## Mi készült el

- 5. mérföldkő, 4. lépés: admin. Feladattípusok oldala (`/admin/task-types`, a légitársaság- és sablonkezelési jogosultsággal): felvétel és átnevezés (név, kód), törlés nincs. A légitársaság oldalán a feladattípusok táblázata (típusonként sablon, aktív, elsődleges; aktív típushoz sablon kell, pontosan egy aktív elsődleges); ez váltja a 3. mérföldkő „alapértelmezett sablon” űrlapját, a listán a légitársaság aktív típusai látszanak. Sablon létrehozása feladattípussal és részekkel (érkezési és indulási, csak érkezési, csak indulási), az ATA és az ATD a részek szerint jön létre; a részek később nem változnak. A sablonszerkesztő csak a sablon részeit kínálja, és a szerkezeti szabály a részek szerint ellenőriz (`templateStructureError`, tesztekkel).
- 5. mérföldkő, 3. lépés: járat létrehozása és import feladattípusok szerint. Az új járat a légitársaság minden aktív feladattípusához kap egy taskot, a típushoz beállított sablonnal; pontosan egy elsődleges (`lib/task-types.ts`, tesztekkel). A járat űrlapján a sablonválasztót a légitársaság-választó váltotta (csak aktív feladattípussal rendelkező légitársaság választható). Meglévő járat légitársasága csak akkor módosítható, ha egyik taskján sincs rögzítés; ilyenkor a taskok az új légitársaság szerint újra létrejönnek. Az import új járatai ugyanígy kapják a taskokat; a próbafuttatás hibásnak jelzi a sort, ha a légitársaságnak nincs aktív feladattípusa; az újraimportálás a taskokat nem érinti.
- 5. mérföldkő, 2. lépés: időszámítás taskonként (`lib/turnaround.ts`). A task részei a sablonja és a járata közös, meglévő részei (`partsKind`; ha nincs közös rész, a tasknak nincs teendője); csak ezek mérföldkövei és foglaltsági ablakai tartoznak hozzá. A horgonyok a járatból számolnak, a task sablonjának paramétereivel (pl. a csak indulási sablon indulási horgonya a késve érkező gép miatt kitolódik). A járat hatályos ATA/ATD-je a rendszerérték, ennek hiányában az elsődleges task rögzítése; a többi task ATA/ATD sora ezt mutatja, a saját rögzítés látszik, de nem hatályos, és ott hiányzóként sem jelölődik. A lezárt task pillanatképe a sablon részeit is tárolja (a régi pillanatkép kétrészesként olvasódik). A TaskView-ban a feladattípus, az elsődleges jelölés és a sablon részei. Tesztekkel.
- 5. mérföldkő, 1. lépés: adatmodell és migráció. Új: `TaskType` (név, kód), `AirlineTaskType` (légitársaság, feladattípus, sablon, aktív, elsődleges; légitársaságonként legfeljebb egy elsődleges). A sablon feladattípushoz tartozik, és jelöli a részeit (érkezési, indulási; legalább az egyik). A task feladattípust, saját sablont és elsődleges jelölést kap; járatonként feladattípusonként egy task, legfeljebb egy elsődleges. A migráció létrehozza az „Alap” típust: minden sablon és task ez alá kerül, minden task elsődleges, és a légitársaság alapértelmezett sablonjából az egyetlen, elsődleges, aktív „Alap” típus lesz. A `Flight.templateId` és az `Airline.defaultTemplateId` megszűnt (a taskra, illetve a légitársaság feladattípusaiba költözött). A kód ennek megfelelően: a járat űrlapja az elsődleges task sablonját állítja, a 3. mérföldkő „alapértelmezett sablon” űrlapja az elsődleges típusét, az import az elsődleges típus sablonjával hozza létre a taskot. A viselkedés változatlan.
- 4. mérföldkő, utómunka 1: „Kiosztás átvétele” a teljes tervre is (`2a28aaa`).

## Állapot

- Utolsó commit: `da41312` – feat: make a task per active task type for new flights (a 4. lépés commitja ezt követi)
- Tesztek: `npm test` → 386 teszt, mind zöld. **Módosított meglévő teszt:** `lib/validation/flight.test.ts` két sora — a járat űrlapjának mezője a jóváhagyott terv szerint sablon helyett légitársaság lett (`templateId` → `airlineId`), a teszt ugyanazt ellenőrzi az új mezővel.
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Próba az adatbázison: egy ideiglenes második, csak indulási feladattípussal a mintafájl importja 50 járatot és 100 taskot hozott létre (50 elsődleges); az újraimport 50 változatlan, a taskok száma nem változott; a második típus taskjai csak az indulási részt és ablakot kapták. Az 1. lépés migrációs ellenőrzése: mind az 56 task a járata sablonját kapta, séma-eltérés nincs.

## Eltérések a CLAUDE.md-től

- A CLAUDE.md adatmodellje a Flightnál még „template”-et említ; a jóváhagyott terv szerint a sablon a taskra költözött.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 5. mérföldkő, 5. lépés: napi lista, task nézet, ügynök nézet több taskkal járatonként.
