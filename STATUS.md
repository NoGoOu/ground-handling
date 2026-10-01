# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 34*

## Mi készült el

- **10. mérföldkő, 3. lépés:** szerkesztőfelületek a `Képzések → Vizsgák` alatt, a „Vizsgák szerkesztése” jogosultsággal.
  - Kérdésbank: kérdés, típus (egy helyes, több helyes, szöveges), pont, témakör, aktív; legfeljebb hat válaszlehetőség a helyes jelöléssel. A kérdés nem törölhető, csak inaktiválható; az inaktív kérdés új kísérletbe nem kerül.
  - Vizsgalapok: név, képzés (csak dolgozattal és határral rendelkező), időkorlát, a többválaszos pontozás módja (paraméter); a kérdések sorrendje fel/le mozgatással, felvétel és eltávolítás; a ki nem tölthető vizsgalap figyelmeztet (pl. nincs helyes válasz).
  - Képzésenként: elméleti és gyakorlati rész, az OJT-követelmény három paramétere (az alapértékek mellett helyőrzőként jelölve), a gyakorlati vizsga szempontjai (felvétel, szerkesztés, inaktiválás, sorrend).
  - A képzés adatainál (6. mérföldkő) a dolgozat nem kapcsolható ki, ha a képzésnek elméleti része van.
  - Adatbázison ellenőrizve: kérdés mentése és javítása, vizsgalap sorrendje, az inaktív kérdés kimarad a másolatból, a szabályt az adatbázis is őrzi.
- 2. lépés (`95ae671`): tiszta függvények. 1. lépés (`db7c7e2`): adatmodell.

## Állapot

- Utolsó commit: `feat: edit the question bank, exam sheets and training parts` (ez a commit; előtte `95ae671`)
- Tesztek: `npm test` → 744 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A felületet bejelentkezve nem néztem meg (jelszót nem írok be).

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: ha a képzésnek dolgozata van, a gyakorlati rész mellé az elméleti rész is kell, mert a kibocsátott rekordba a dolgozat eredménye kerül (különben a rekord dolgozat-eredmény nélkül maradna).

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 4. lépés: e-vizsga – megnyitás, kitöltés (telefonon is), automatikus javítás, a szöveges válaszok javítása, visszajelzés és belső megjegyzés.
