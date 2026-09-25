# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 25*

## Mi készült el

- 5. mérföldkő, 7. lépés: tervező taskonként. Minden task ablaka bemenet, az ablak ismeri a járatát; új szabály (`SAME_FLIGHT`): ugyanannak a járatnak két különböző taskja nem kerül egy pozícióba (egy task két ablaka igen). Az algoritmus ezt mindig betartja (mohó lépés és kiegyenlítés), kézi áthúzásnál figyelmeztetés; a terv dobozain a feladattípus kódja. A kiosztás átvétele taskonként történik, és a sávos nézet új figyelmeztetése utána is megjelenik. Tesztekkel; próba: két feladattípussal a 2024. 09. 10-i terv 4 pozíciójában egyik járat két taskja sem került együvé.
- 5. mérföldkő, 6. lépés: sávos nézet és kiosztás taskonként. A dobozokon a feladattípus kódja; új ütközés-figyelmeztetés, ha ugyanaz az ügynök ugyanannak a járatnak két különböző feladattípusát kapja (egy task két része ugyanannál az ügynöknél rendben van). A napi lista kiosztása is figyelmeztet erre; mindkettő csak figyelmeztet, a mentés megtörténik (`lib/board.ts`, `lib/task-types.ts`, tesztekkel).
- 5. mérföldkő, 5. lépés: napi lista, task nézet, ügynök nézet több taskkal (`67198c0`). A napszűrés járatszintű: a nap és a sorrend az elsődleges task szerint, a járat taskjai együtt, az elsődleges elöl (`tasksForDay`, tesztekkel). A napi lista járatonként egy sor, benne taskonként a feladattípus, a forduló típusa, a státusz és a kiosztás. A task nézetben a feladattípus, az elsődleges jelölés, a járat többi taskja (amit a felhasználó láthat), és a nem elsődleges task ATA/ATD sorában a rendszerérték, az elsődleges task rögzítése és a saját (nem hatályos) rögzítés. Az ügynök nézet kártyáin a feladattípus.
- 5. mérföldkő, 1–4. lépés: adatmodell és migráció („Alap” típus, a sablon a taskon), taskonkénti időszámítás és az elsődleges task ATA/ATD-szabálya, taskok a légitársaság aktív feladattípusai szerint (űrlap és import), admin (feladattípusok, a légitársaság feladattípusai, egy- és kétrészes sablonok).
- 4. mérföldkő, utómunka: „Kiosztás átvétele” a teljes tervre is.

## Állapot

- Utolsó commit: `a25db39` – feat: warn when one agent gets two task types of a flight (a 7. lépés commitja ezt követi)
- Tesztek: `npm test` → 395 teszt, mind zöld
- **Módosított meglévő teszt:** `lib/validation/flight.test.ts` két sora (3. lépés) — a járat űrlapjának mezője a jóváhagyott terv szerint sablon helyett légitársaság lett (`templateId` → `airlineId`); a teszt ugyanazt ellenőrzi az új mezővel. Más meglévő teszt nem változott.
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Próbák az adatbázison: a migráció után mind az 56 task a járata sablonját kapta, séma-eltérés nincs; két feladattípussal az import 50 járatot és 100 taskot hozott létre, az újraimport a taskokhoz nem nyúlt; az űrlap szerint felvett járat mindkét taskja együtt jelenik meg, a csak indulási task a járat ATA-ját az elsődleges task rögzítéséből mutatja. A felületet a böngészőben nem néztem meg (bejelentkezés kellene).

## Eltérések a CLAUDE.md-től

- A CLAUDE.md adatmodellje a Flightnál még „template”-et említ; a jóváhagyott terv szerint a sablon a taskra költözött.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 5. mérföldkő, 8. lépés: seed (második, helyőrző feladattípus), README, STATUS.md.
