# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 34*

## Mi készült el

- **10. mérföldkő, 5. lépés:** képzési folyamat.
  - `Képzések → Képzési folyamatok`: a koordinátor itt indít folyamatot (aktív ügynök és résszel rendelkező képzés; egy nyitott folyamat ügynökönként és képzésenként). A lista a nyitottakat, kérésre mindet mutatja, a „kibocsátható” elöl.
  - Láthatóság: a koordinátor, a vizsgáztatók és a kibocsátásra jogosultak mindenkiét; a csapatvezető a csapatáét; az ügynök a sajátját (a „Képzéseim” oldalon is, a nyitott e-vizsgák mellett).
  - A folyamat oldala: állapot (folyamatban, kibocsátható, kibocsátva, megszakítva) és részenként az állapot; az elméleti rész a kísérletekkel és a visszajelzéssel; az OJT a megfelelő gyakorlások számával; a gyakorlati vizsga helye (a 6–7. lépésben töltődik fel).
  - Megszakítás indokkal („Képzések kezelése”): a nyitott e-vizsga a mentett válaszokkal beadásra kerül; utána új folyamat indítható.
  - A „Képzések” menü és oldal a vizsgáztatónak, a kibocsátásra jogosultnak és a vizsgaszerkesztőnek is megnyílik, a nekik szóló részekkel.
- 4. lépés (`1a90dbd`): e-vizsga. 3. lépés (`2e1c820`): szerkesztőfelületek. 2. lépés (`95ae671`): tiszta függvények. 1. lépés (`db7c7e2`): adatmodell.

## Állapot

- Utolsó commit: `feat: start, follow and abort training processes` (ez a commit; előtte `1a90dbd`)
- Tesztek: `npm test` → 744 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Adatbázison végigpróbálva: indítás, részek állapota, lista az ügynöknek, megszakítás (a nyitott kísérlet beadva, a második megszakítás elutasítva), utána új folyamat indítható. Bejelentkezve nem néztem meg.

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: megszakításkor a nyitott e-vizsga a mentett válaszokkal beadásra kerül, hogy ne lehessen tovább kitölteni.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. lépés: OJT a taskon – gyakornok felvétele, nézete és rögzítései, a mentor javítása és értékelése, a mutatók, a sávos nézet.
