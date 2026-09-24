# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 23*

## Mi készült el

- 3. mérföldkő, 7. lépés: az import mentése a próbafuttatás szerint, egy tranzakcióban. Új járat taskkal, a változott járatnál csak a menetrendi mezők íródnak; az ETA/ETD, ATA/ATD, a késés, a törlés és a kiosztás érintetlen. Importnapló az import oldalon. Egy korábban ugyanazzal a profillal importált, az új fájlból hiányzó járat részenként „Az utolsó importból hiányzik” jelölést kap: a napi listán, a task és a járat oldalán látszik, az import oldalon listázva, ahol a jelölés törölhető; ha a járat újra benne van a fájlban, a jelölés magától lekerül.
- 3. mérföldkő, 1–6. lépés: adatmodell (a légitársaság alapértelmezett sablonja, a járat forrása, állomásai, üzemnapjai, importprofilja, hiányzó-jelölése; „Járatrend importálása” jogosultság), fájlbeolvasás (CSV, JSON, XLSX, XLS, 25 MB-ig), átalakítások, fordulók képzése (tesztek a `docs/schedule-import.md` táblázatára: 27 forduló, 1 csak érkező, 22 csak induló, 2 kiszűrt sor), párosító felület profilokkal, próbafuttatás.
- Utómunka: „Késik” csak a sárga eltérés-küszöb fölött (`096fd27`).

## Állapot

- Utolsó commit: `9a29268` – feat: dry run a schedule import (a 7. lépés commitja ezt követi)
- Tesztek: `npm test` → 294 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba a mintafájllal: első mentés 50 új járat, 23 párosítatlan, 2 kiszűrt sor; a 2024. 09. 10-i napi listán megjelennek. Késés, rész-törlés és kiosztás után újraimportálva 50 változatlan, nincs duplikáció, a kézi adatok megmaradtak. Az FR3111/FR4305 sorai nélküli fájl 3 járatot jelöl hiányzónak; a jelölés törölhető, a teljes fájl újraimportálása után egy sem hiányzik.

## Eltérések a CLAUDE.md-től

- **Az állóhely nem kötelező** (jóváhagyott feltételezés): az importált járatnak nincs, a műszakvezető tölti ki.
- **A „menetrendi dátum” a járat üzemnapja** (az indulás napja az indulóállomáson), ezt tárolja a két rész azonosítója.

## Kérdések a tervezéshez

- Két egyoldalú járat fordulóvá összevonása újraimportálásnál (pl. a korábbi fájlban nem volt következő járat) az egyik régi járat törlését igényelné, a járat pedig nem törölhető. Ez most „párosítás változott” kategóriába kerül, és nem íródik. Engedjük-e az import által létrehozott, üzemi adat nélküli, így kiürülő járat törlését?
- A `docs/schedule-import.md` nem ad darabszámot a 12. sorra: az FR1027 időszaka (45595–45644) 2024. 10. 30. és 12. 18. közé esik, ez 8 szerda. A teszt ezt várja; ha a dokumentum 12. 11-ig gondolta, a kivonat Till értéke tér el.

## Következő lépés

- 3. mérföldkő, 8. lépés: README (az import használata) és indítás tiszta állapotból Docker Compose-zal.
