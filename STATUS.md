# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 23. 18:05 · CLAUDE.md verzió: 18*

## Mi készült el

- 1. mérföldkő (MVP) és a hozzá tartozó utómunka: kész (korábbi commitok).
- 2. mérföldkő, 1. lépés: jogosultsági rendszer adatrétege. A jogosultságok listája a kódban van magyar megnevezéssel (`lib/permissions/catalog.ts`), a szerepkörök, csapatok, felhasználói szerepkörök és egyéni jogosultságok az adatbázisban. A tényleges jogosultság a szerepkörök és az egyéni kiegészítések uniója, hatókörnél a legszélesebb nyer. A proxy, az oldalak és a szerverműveletek jogosultságra ellenőriznek, szerepkörnévre sehol.
- Migráció: a négy alapértelmezett szerepkör (Admin zárolt, Tervező, Műszakvezető, Ügynök) létrejött, a meglévő felhasználók a korábbi szerepkörüknek megfelelőt kapták, a két demo ügynök a műszakvezető vezette „Demo csapat” tagja lett, és csak ezután került ki a régi `role` oszlop.

## Állapot

- Utolsó commit: `51b0c1a` – fix: allow the drop on dragenter as well (az 1. lépés még commit előtt áll)
- Tesztek: `npm test` → 134 teszt, mind zöld (ebből 18 új a jogosultságokra)
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: műszakvezető, ügynök és admin belépés után változatlan menü és hozzáférés; az `/admin` a műszakvezetőt visszairányítja; az utolsó aktív admintól nem vehető el az Admin szerepkör.

## Eltérések a CLAUDE.md-től

- **„Ügynök” a kódban = csapattag.** A szerepkörnév megszűnt, ezért a kiosztható emberek listája (és a „Taskjaim” menüpont) a csapattagságból adódik, a CLAUDE.md „Minden ügynök egy csapat tagja” mondata alapján. Így a demo viselkedése változatlan: a műszakvezető és az admin nem kerül az ügynökválasztóba.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. mérföldkő, 2. lépés: jogosultsági admin felület – szerepkör × jogosultság táblázat pipákkal és hatókörrel, új szerepkör, csapatok kezelése, felhasználónként szerepkörök és egyéni jogosultságok, valamint a tényleges jogosultságok a forrásukkal.
