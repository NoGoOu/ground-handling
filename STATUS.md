# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 34*

## Mi készült el

- **10. mérföldkő, 4. lépés:** e-vizsga.
  - Megnyitás a folyamat oldaláról („Vizsgáztatás” vagy „Képzések kezelése”): a kísérlet a vizsgalap aktív kérdéseinek másolatát kapja; egyszerre egy nyitott kísérlet, a ki nem tölthető vizsgalapot elutasítja.
  - Kitöltés a vizsgázó saját belépésével, telefonra méretezve (nagy válaszgombok): a „Képzéseim” oldalon a nyitott vizsgák kiemelve; Kezdés gomb, onnan fut az időkorlát; minden módosítás azonnal mentődik (a szöveges válasz rövid szünet után); visszaszámláló; lejáratkor a mentett válaszok automatikusan beadódnak, utána mentés nem lehetséges.
  - Javítás: a választós kérdéseket a rendszer pontozza beadáskor; a szöveges válaszokat a vizsgáztató pontozza, megjegyzéssel; az eredmény akkor áll elő, amikor már nincs javítatlan válasz. Visszajelzés és belső megjegyzés külön mezőben; a korábbi kísérletek belső megjegyzései látszanak.
  - Pontozni és értékelni a „Vizsgáztatás” jogosultsággal és a képzés aznap érvényes jogosításával lehet.
  - A vizsgázó a saját válaszait, pontjait és a visszajelzést látja; a helyes válaszok és a belső megjegyzés nem kerülnek az oldalára.
  - A folyamat oldalának alapja (az elméleti rész a kísérletekkel); a folyamat indítása az adatrétegben megvan, a felülete az 5. lépésben jön.
- 3. lépés (`2e1c820`): szerkesztőfelületek. 2. lépés (`95ae671`): tiszta függvények. 1. lépés (`db7c7e2`): adatmodell.

## Állapot

- Utolsó commit: `feat: open, fill and score e-exams` (ez a commit; előtte `2e1c820`)
- Tesztek: `npm test` → 744 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Adatbázison végigpróbálva: folyamat indítása (a második elutasítva), kísérlet megnyitása (a második elutasítva), mentés kezdés előtt elutasítva, mentés, lejárat utáni automatikus beadás, kettős beadás hatástalan, szöveges válasz pontozása, eredmény (7,5 / 10 pont, 80%-os határ alatt: sikertelen), utána új kísérlet nyitható. A kitöltő nézetet telefonméretben statikusan renderelve néztem meg; bejelentkezve nem.

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: az időkorlát a vizsgázó Kezdés gombjától fut (az oldal megnyitása még nem indítja).

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 5. lépés: képzési folyamat – indítás, megszakítás, áttekintés részenként (koordinátor, vizsgáztató, csapatvezető, ügynök).
