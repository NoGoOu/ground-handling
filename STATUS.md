# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 23. 19:05 · CLAUDE.md verzió: 18*

## Mi készült el

- 1. mérföldkő (MVP) és az utómunka: kész (korábbi commitok).
- 2. mérföldkő, 1. lépés: jogosultsági rendszer adatrétege – jogosultságkatalógus a kódban, szerepkörök, csapatok, felhasználói szerepkörök és egyéni jogosultságok az adatbázisban, hatókörrel; a proxy, az oldalak és a szerverműveletek jogosultságra ellenőriznek. Migráció a meglévő felhasználók viselkedésének megtartásával.
- 2. mérföldkő, 2. lépés: jogosultsági admin felület – `/admin/roles` szerepkör × jogosultság mátrix pipákkal és hatókör-választóval (az Admin szerepkör zárolva), új szerepkör létrehozása; `/admin/teams` csapatok létrehozása és szerkesztése a vezetővel és a taglistával; a felhasználó adatlapján több szerepkör, csapat, egyéni jogosultságok, és a tényleges jogosultságok táblázata forrásonként.

## Állapot

- Utolsó commit: `99dd189` – feat: replace roles with a configurable permission system (a 2. lépés még commit előtt áll)
- Tesztek: `npm test` → 135 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: új szerepkör létrehozása és csapat hatókörű jogosultság mentése (újratöltés után is megmarad); egyéni jogosultság hozzáadása után a tényleges lista „Ügynök (Saját), Egyéni jogosultság (Csapat)” forrásokat mutat; csapatvezetőként megnyílt a csapattárs taskja, de rögzíteni nem lehetett rajta. A próbák után a demo adatok újratöltve.

## Eltérések a CLAUDE.md-től

- **„Ügynök” a kódban = csapattag.** A szerepkörnév megszűnt, ezért a kiosztható emberek listája és a „Taskjaim” menüpont a csapattagságból adódik, a CLAUDE.md „Minden ügynök egy csapat tagja” mondata alapján. A demo viselkedése így változatlan.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. mérföldkő, 3. lépés: Prisma – PLANNER szerepkör, `SegmentType`, `Publication`, `Shift` (réteggel), `ShiftSegment`, migráció a régi egyszerű műszakokból, és a bővített seed (tervező, Műszak és TRN típus, publikált és valós beosztás, utazási idős TRN blokk, egy eltérő nap).
