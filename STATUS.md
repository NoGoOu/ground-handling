# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 18*

## Mi készült el

A 2. mérföldkő mind a 13 lépése kész:

- 1–2. Konfigurálható jogosultságok: katalógus a kódban, szerepkörök, csapatok, egyéni jogosultságok hatókörrel; admin felület a mátrixszal, a csapatokkal és a tényleges jogosultságok forrásával.
- 3. Rétegelt beosztás adatmodellje (SegmentType, Publication, Shift, ShiftSegment), migráció a régi műszakokból, bővített seed (tervező, TRN blokk, eltérő nap).
- 4. Rétegjogosultságok tesztekkel (tervezet csak a tervezőé, publikált zárolt, valós a szerkesztési jog szerint).
- 5. Résztípusok kezelése (`/shifts/types`).
- 6. Heti név × nap táblázat, a cellában a tervezet szerkesztése.
- 7. Publikálás időszakra, a valós réteg létrehozása, a publikált zárolása.
- 8. A valós réteg szerkesztése, az eltérések kiemelése a táblázatban és a cellában.
- 9. Sávos nézet adatrétege: blokkok utazási idővel, háromféle ütközés, unit tesztekkel.
- 10. Blokkok megjelenítése a sávos nézeten.
- 11. Drag and drop kiosztás mindhárom ütközés figyelmeztetésével.
- 12. Ügynök nézet: a saját blokkok a taskok között, időrendben.
- 13. README frissítve.

## Állapot

- Utolsó commit előtte: `77ac1a0` – feat: show the agent's own blocks in the agent view (a 13. lépés commitja ezt követi)
- Tesztek: `npm test` → 160 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Tiszta indítás: `docker compose down -v` után a `docker compose up --build` mind az 5 migrációt lefuttatta, a seed betöltött, `/api/health` → `{"db":"ok"}`; a tervező a beosztás táblázatra érkezik, a publikált napok és az eltérő cella jelölve.

## Eltérések a CLAUDE.md-től

- **„Ügynök” a kódban = csapattag.** A kiosztható emberek listája és a „Taskjaim” menüpont a csapattagságból adódik („Minden ügynök egy csapat tagja”).
- **A beosztás táblázat heti ablakban jelenik meg** (hétfőtől vasárnapig, hét-léptetővel); a CLAUDE.md időszakot nem ír.
- **A tervezet és a valós rétegben a rész és a műszak eltávolítható.** Enélkül a beosztás nem tervezhető; a publikált réteg zárolt, a 11. döntés törlési tilalma a járatra, légitársaságra, sablonra, felhasználóra és rögzítésre vonatkozik. Ha ez nem kívánt, kivehető.
- **Blokk csak nem operatív részből lehet** (az űrlap operatív típusnál nem is kínálja fel). A CLAUDE.md a blokkot a nem operatív részekhez köti.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- A 2. mérföldkő kész. A következő mérföldkő sorrendje a tervezésben dől el (Később szakasz).
