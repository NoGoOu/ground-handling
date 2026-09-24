# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 18*

## Mi készült el

- 1. mérföldkő (MVP) és az utómunka: kész (korábbi commitok).
- 2. mérföldkő, 1–2. lépés: konfigurálható jogosultsági rendszer (katalógus a kódban, szerepkörök, csapatok, egyéni jogosultságok, hatókörök) és a hozzá tartozó admin felület.
- 2. mérföldkő, 3. lépés: rétegelt beosztás adatmodellje (SegmentType, Publication, Shift, ShiftSegment), migráció a régi műszakokból, bővített seed.
- 2. mérföldkő, 4. lépés: rétegjogosultságok – a tervezet csak a tervezőé, a publikált réteg mindenkinek zárolt, a valós a szerkesztési jog szerint; a beosztás olvasása a hatókört követi. Tesztekkel.
- 2. mérföldkő, 5. lépés: résztípusok kezelése (`/shifts/types`) – létrehozás, szerkesztés, operatív és aktív jelölés, használatszám; típus nem törölhető.
- 2. mérföldkő, 12. lépés: az ügynök nézetben a saját blokkjai (típus, idő, utazással számolt idő, helyszín, leírás) a taskjai közé kerülnek, időrendben.
- 2. mérföldkő, 11. lépés: drag and drop kiosztás mindhárom ütközés figyelmeztetésével (a mentés soha nem tiltott, az érintett dobozok jelölve maradnak).
- 2. mérföldkő, 10. lépés: a sávos nézet olvasásra – a nem operatív blokkok mintázott dobozként jelennek meg a sávon (típus, helyszín, leírás és az utazással számolt idő a buboréksúgóban).
- 2. mérföldkő, 9. lépés: a sávos nézet adatrétege az új modellre – a sávok a valós réteg operatív részeiből, a blokkok a nem operatív részekből (utazási idővel) állnak, és a háromféle ütközés (task–task átfedés, task–blokk ütközés, műszakon kívüli task) mind vizsgálva van, unit tesztekkel.
- 2. mérföldkő, 8. lépés: a valós réteg szerkesztése ugyanazokkal az űrlapokkal, és az eltérések kiemelése a cellában (a publikált és a valós rész is jelölve, ha a kettő nem egyezik).
- 2. mérföldkő, 7. lépés: publikálás időszakra – a tervezet publikálttá és zárolttá válik, a valós réteg a másolataként jön létre, egy nap csak egyszer publikálható, a táblázat fejléce jelzi a publikált napokat.
- 2. mérföldkő, 6. lépés: beosztás táblázat (név × nap, heti nézet, cellánként a publikált és a valós műszak, az eltérő cella kiemelve) és a cellán belül a tervezet szerkesztése (műszak és részek felvitele, módosítása, eltávolítása, átfedés-ellenőrzéssel, blokk és utazási idő a nem operatív részeken).

## Állapot

- Utolsó commit: `d509220` – docs: record the drag and drop conflict check (a 12. lépés még commit előtt áll)
- Tesztek: `npm test` → 160 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: ügynökként (telefonos nézet) az Oktatás blokk a taskok előtt jelent meg „Utazással: 08:40 – 10:50” idővel; a valós beosztás átalakítása után egy kiosztatlan doboz ráhúzása az ügynök sávjára mindhárom ütközést jelezte („Kiosztva, de ütközés van: A műszakon kívülre esik, Átfedés egy másik taskkal, Ütközik egy blokkal”), és a mentés így is megtörtént; a valós réteg műszakjának módosítása után a publikált és a valós rész is „Eltér a publikálttól” jelölést kapott; tervezőként egy hét publikálása (a tervezetek publikálttá váltak, a valós másolat elkészült, az újrapublikálás elutasítva); tervezet-műszak felvitele, TRN rész blokkal (Blokk: 14:40 – 16:55), átfedő rész elutasítása, rész és műszak eltávolítása; műszakvezetőként a tervezet réteg nem látszik, a `/shifts/types` tiltott. A próbaadatok törölve.

## Eltérések a CLAUDE.md-től

- **„Ügynök” a kódban = csapattag.** A szerepkörnév megszűnt, ezért a kiosztható emberek listája és a „Taskjaim” menüpont a csapattagságból adódik, a CLAUDE.md „Minden ügynök egy csapat tagja” mondata alapján.
- **A beosztás táblázat heti ablakban jelenik meg** (hétfőtől vasárnapig, hét-léptetővel). A CLAUDE.md csak „név × nap táblázatot” ír, időszakot nem.
- **A tervezet és a valós rétegben a rész és a műszak eltávolítható.** Enélkül a beosztás nem tervezhető; a publikált réteg változatlanul zárolt, és a CLAUDE.md törlési tilalma (11. döntés) a járatra, légitársaságra, sablonra, felhasználóra és rögzítésre vonatkozik. Ha ez nem kívánt, szólj, és kiveszem.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. mérföldkő, 13. lépés: README és STATUS.md frissítése.
