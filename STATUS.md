# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 25*

## Mi készült el

- **5. mérföldkő (feladattípusok, több task járatonként): kész, mind a 8 lépés.**
- 1. lépés: `TaskType`, `AirlineTaskType` (sablon, aktív, elsődleges), sablon–feladattípus és a sablon részei, a task saját típussal, sablonnal és elsődleges jelöléssel. A migráció mindent az „Alap” típus alá tett, a viselkedés nem változott.
- 2. lépés: időszámítás taskonként (a task részei a sablon és a járat közös részei, a horgonyok a járatból); a járat ATA/ATD-je a rendszerérték, különben az elsődleges task rögzítése.
- 3–4. lépés: új járat (űrlap és import) a légitársaság minden aktív típusához kap taskot; admin: feladattípusok, a légitársaság feladattípusai, egy- és kétrészes sablonok.
- 5–7. lépés: napi lista járatonként a taskokkal, task és ügynök nézet a típussal; sávos nézet a típus kódjával és figyelmeztetéssel, ha egy ember egy járat két típusát kapja; tervező: egy járat két különböző taskja nem kerül egy pozícióba.
- 8. lépés: seed – a demo légitársaságnál egy második, helyőrző feladattípus (HLY, csak indulási helyőrző sablonnal); README.
- 4. mérföldkő utómunkája: „Kiosztás átvétele” a teljes tervre is.

## Állapot

- Utolsó commit: `cc421f4` – feat: plan every task and keep a flight's task types apart (a 8. lépés commitja ezt követi)
- Tesztek: `npm test` → 395 teszt, mind zöld
- **Módosított meglévő teszt:** `lib/validation/flight.test.ts` két sora (3. lépés): a járat űrlapjának mezője a jóváhagyott terv szerint sablon helyett légitársaság lett (`templateId` → `airlineId`), a teszt ugyanazt ellenőrzi az új mezővel. Más meglévő teszt nem változott; az 1. lépés migrációja után minden meglévő teszt változtatás nélkül zöld volt.
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Tiszta indítás (`docker compose down -v`, `up --build`): mind a 11 migráció lefut, a seed 6 járatot hoz létre 12 taskkal (6 elsődleges „Alap”, 6 „Helyőrző”).
- Próbák az adatbázison: a migráció után mind az 56 task a járata sablonját kapta, séma-eltérés nincs. Két feladattípussal az import 50 járatot és 100 taskot hoz létre, az újraimport a taskokhoz nem nyúl. A napi lista, az elsődleges ATA-szabály és a terv (egy pozícióban sincs egy járat két taskja) működik. A felületet a böngészőben nem néztem meg (bejelentkezés kellene).

## Eltérések a CLAUDE.md-től

- A CLAUDE.md adatmodellje a Flightnál még „template”-et említ; a jóváhagyott terv szerint a sablon a taskra költözött (`Flight.templateId` megszűnt), és a járat űrlapján légitársaságot választunk.
- A jóváhagyott tervben elfogadott értelmezések: a légitársaság csak rögzítés nélkül módosítható, ilyenkor a taskok újra létrejönnek; az elsődleges jelölés a taskon is tárolódik; a járatszintű megjelenítés (napszűrés, sorrend, „Késik”, késés) az elsődleges task szerint; a közös rész nélküli task „nincs teendő”; a sablon részei a létrehozáskor dőlnek el; feladattípus nem törölhető.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- Az 5. mérföldkő kész. A következő (6.: képzések és jogosítások, vagy 7.: üzenetek) sorrendjét és lépéstervét a tervezés adja. A valós GOU- és HDS-sablonok felvétele a projekt gazdájánál van.
