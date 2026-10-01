# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 35*

## Mi készült el

- **11. mérföldkő, 7. lépés:** lejáró határidők és jelzés a menüben.
  - `Eszközök → Lejáró határidők`: két csoport, „hamarosan lejár” (dátum szerint) és „lejárt vagy elérte” (a lejártak dátum szerint, utánuk az esedékességet elért számlálók, jóváhagyott 2. döntés). Csak aktív típusú, nem kivont eszközök, aktív mezők. Soronként eszköz (az adatlapra mutat), típus, állapot, mező, lejárat vagy állás/esedékesség, hátralévő vagy eltelt napok.
  - `Admin → Beállítások`: külön „Lejáró eszköz-határidők” űrlap a „hamarosan lejár” napjaival (0–365, helyőrző: 30); a jogosításoké változatlan.
  - A menüben a „Hibajegyek” mellett a nyitott (nyitott vagy folyamatban lévő) jegyek száma, a hibajegy-kezelési jogosultsággal rendelkezőknek (Műszaki, Admin). A szám oldalbetöltéskor és minden műveletnél frissül.
  - Az eszközlistáról a lejáró határidők és a hibajegyek is elérhetők; a Hibajegyek menüpont annak is látszik, aki csak megtekinthet.
  - Tiszta függvény a csoportosításhoz, tesztekkel; adatbázison ellenőrizve (kivont eszköz, inaktív típus és inaktív mező kimarad; elért számláló a lejártak között).
- 6. lépés (`9a59d79`): hibajegyek kezelése. 5. (`760f0a9`): jelentés telefonról. 4. (`30588e6`): eszközök. 3. (`59412d9`): típusok. 2. (`b34a0a3`): tiszta függvények. 1. (`cceb047`): adatmodell.

## Állapot

- Utolsó commit: `feat: list expiring equipment deadlines, count open faults in the menu` (ez a commit; előtte `9a59d79`)
- Tesztek: `npm test` → 782 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A felületet bejelentkezve nem néztem meg; az adatutakat adatbázison ellenőriztem.

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: összesen legfeljebb 25 MB fotó jegyenként (az alkalmazás kéréskorlátja miatt); lezárt jegyhez a Műszaki még írhat megjegyzést.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 8. lépés: seed (egy Műszaki felhasználó; eszköztípusok és eszközök minden határidő-állapottal; egy nyitott, egy folyamatban lévő és egy lezárt jegy), README, STATUS.md, indítás tiszta állapotból.
