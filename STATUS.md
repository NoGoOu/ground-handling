# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 35*

## Mi készült el

- **11. mérföldkő, 4. lépés:** eszközök (`Eszközök` menü; a Műszaki, az Admin és a műszakvezető látja, a Műszaki és az Admin szerkeszti).
  - Lista: azonosító, rendszám, típus, állapot, nyitott jegyek száma, legközelebbi határidő az állapotával, figyelmeztetések száma; a kivont eszközök kérésre. Új eszköz felvétele a listáról.
  - Adatlap: alapadatok (azonosító, rendszám, leírás, megjegyzés); a műszaki adatok mezőnként (határidő az állapotával, számláló az esedékességgel és „elérte” jelzéssel, szöveg), szerkesztésük; minden változás naplója a régi és az új értékkel (változatlan érték nem kerül a naplóba).
  - Állapot: üzemképtelenre és vissza („Hibajegyek kezelése”), kivonás és visszahozás („Eszközök kezelése”), megjegyzéssel, naplózva.
  - Dokumentumok: PDF, JPG, PNG, legfeljebb 10 MB, a tartalom alapján ellenőrizve; az eltávolítás a fájlt törli, a naplósor marad; a letöltést a szerver ellenőrzi.
  - Adatbázison ellenőrizve: értékmentés és napló, rossz fajtájú érték elutasítva, állapotváltások (a nem megengedett elutasítva), a kivont eszköz a listán csak kérésre, figyelmeztetés az esedékes számlálóra, dokumentum feltöltése, rossz típus elutasítva, eltávolítás.
- 3. lépés (`59412d9`): eszköztípusok és mezőlisták. 2. lépés (`b34a0a3`): tiszta függvények. 1. lépés (`cceb047`): adatmodell.

## Állapot

- Utolsó commit: `feat: keep the register of ground equipment` (ez a commit; előtte `59412d9`)
- Tesztek: `npm test` → 776 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A felületet bejelentkezve nem néztem meg.

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: az eszköz típusa nem változtatható, ha már van műszaki adata (a régi mezők értékei elárvulnának).

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 5. lépés: hibajegy jelentése telefonról, fotóval.
