# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 23*

## Mi készült el

- **A 3. mérföldkő (járatrend-import) kész**, mind a 8 lépés.
- 8. lépés: README (az import funkciói, a mintafájl kipróbálása lépésenként, `lib/import/` a felépítésben); indítás tiszta állapotból Docker Compose-zal.
- 7. lépés: mentés a próbafuttatás szerint, egy tranzakcióban: új járat taskkal, a változott járatnál csak a menetrendi mezők; importnapló; részenkénti „Az utolsó importból hiányzik” jelölés (napi lista, task és járat oldala, az import oldalon listázva és törölhető; ha a járat újra benne van a fájlban, magától lekerül).
- 1–6. lépés: adatmodell és „Járatrend importálása” jogosultság, fájlbeolvasás (CSV, JSON, XLSX, XLS, 25 MB-ig), átalakítások, fordulók képzése, párosító felület profilokkal, próbafuttatás.
- Előtte, külön commitban: „Késik” csak a sárga eltérés-küszöb fölött (`096fd27`).

## Állapot

- Utolsó commit: `0791a67` – feat: save a schedule import and mark missing flights (a 8. lépés commitja ezt követi)
- Tesztek: `npm test` → 294 teszt, mind zöld (köztük a `docs/schedule-import.md` táblázatának várt eredményei)
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` a Docker-képben sikeres
- Tiszta indítás: `docker compose down -v` után `docker compose up --build`: minden migráció lefut, a seed betölt, a védett oldalak a belépésre irányítanak. A konténerben a mintafájl beolvasása és a javasolt párosítás 27 fordulót, 1 csak érkező, 22 csak induló járatot és 2 kiszűrt sort ad, hiba nélkül.
- Kézi próba (fejlesztői szerveren): első mentés 50 új járat, a 2024. 09. 10-i napi listán megjelennek; késés, rész-törlés és kiosztás után újraimportálva 50 változatlan, nincs duplikáció, a kézi adatok megmaradtak; a két sorral rövidebb fájl 3 járatot jelöl hiányzónak, a teljes fájl újra a jelölést leveszi.

## Eltérések a CLAUDE.md-től

- **Az állóhely nem kötelező** (jóváhagyott feltételezés): az importált járatnak nincs, a műszakvezető tölti ki.
- **A „menetrendi dátum” a járat üzemnapja** (az indulás napja az indulóállomáson), ezt tárolja a két rész azonosítója.

## Kérdések a tervezéshez

- Két egyoldalú járat fordulóvá összevonása újraimportálásnál (pl. a korábbi fájlban nem volt következő járat) az egyik régi járat törlését igényelné, a járat pedig nem törölhető. Ez most „párosítás változott” kategóriába kerül, és nem íródik. Engedjük-e az import által létrehozott, üzemi adat nélküli, így kiürülő járat törlését?
- A `docs/schedule-import.md` nem ad darabszámot a 12. sorra: az FR1027 időszaka (45595–45644) 2024. 10. 30. és 12. 18. közé esik, ez 8 szerda. A teszt ezt várja; ha a dokumentum 12. 11-ig gondolta, a kivonat Till értéke tér el.
- A demo seed nem tartalmazza a Ryanairt; a mintafájl kipróbálásához az adminnak kell felvennie (README). Kerüljön-e be a seedbe egy FR légitársaság alapértelmezett sablonnal?

## Következő lépés

- A 3. mérföldkő kész. A CLAUDE.md szerint a 4. mérföldkő (tervezői nézet, automatikus kiosztással) következik; lépéstervet még nem kapott, a tervezés dönti el.
