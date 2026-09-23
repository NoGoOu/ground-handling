# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 23. 19:55 · CLAUDE.md verzió: 18*

## Mi készült el

- 1. mérföldkő (MVP) és az utómunka: kész (korábbi commitok).
- 2. mérföldkő, 1. lépés: jogosultsági rendszer adatrétege – jogosultságkatalógus a kódban, szerepkörök, csapatok, felhasználói szerepkörök és egyéni jogosultságok az adatbázisban, hatókörrel; a proxy, az oldalak és a szerverműveletek jogosultságra ellenőriznek.
- 2. mérföldkő, 2. lépés: jogosultsági admin felület – `/admin/roles` szerepkör × jogosultság mátrix, új szerepkör; `/admin/teams` csapatok; a felhasználó adatlapján több szerepkör, csapat, egyéni jogosultságok és a tényleges jogosultságok táblázata forrásonként.
- 2. mérföldkő, 3. lépés: beosztás adatmodellje – `SegmentType`, `Publication`, rétegelt `Shift` (DRAFT | PUBLISHED | ACTUAL) és `ShiftSegment` (utazási idővel, blokk jelzéssel), migráció a régi egyszerű műszakokból (a meglévő műszakok a valós réteg egy operatív részévé alakultak), bővített seed: tervező felhasználó, Műszak és Oktatás (TRN) típus, publikált és valós beosztás két napra, utazási idős TRN blokk, és egy nap, ahol a valós eltér a publikálttól. A `/shifts` oldal és a sávos nézet már az új modellből olvas.

## Állapot

- Utolsó commit: `b5e3d56` – feat: add the permission admin screens (a 3. lépés még commit előtt áll)
- Tesztek: `npm test` → 128 teszt, mind zöld (a régi műszak-validáció tesztjei megszűntek, helyettük seed-beosztás tesztek)
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: seed újrafuttatva, a `/shifts` a valós réteget mutatja részekkel (Kiss Péter Műszak 06:00–14:00; Nagy Eszter Oktatás 09:00–10:30 + Műszak 11:00–19:00), a sávos nézet sávjai az operatív részekből állnak.

## Eltérések a CLAUDE.md-től

- **„Ügynök” a kódban = csapattag.** A szerepkörnév megszűnt, ezért a kiosztható emberek listája és a „Taskjaim” menüpont a csapattagságból adódik, a CLAUDE.md „Minden ügynök egy csapat tagja” mondata alapján. A demo viselkedése így változatlan.
- **A `/shifts` oldal átmenetileg csak olvasható.** A régi egyszerű műszak-szerkesztő törölve, a rétegelt beosztás szerkesztése a 6–8. lépésben készül el, ugyanezen az útvonalon.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. mérföldkő, 4. lépés: a tervezői és beosztás-jogosultságok bekötése (`ROSTER_*`, `SEGMENT_TYPE_MANAGE`) a felületre és a szerverműveletekre, unit tesztekkel.
