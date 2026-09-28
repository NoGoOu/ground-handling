# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 28. · CLAUDE.md verzió: 29*

## Mi készült el

- 8. mérföldkő, 2. lépés: LDM – infant nélküli PAX-ellenőrzés, a Lufthansa előtag nélküli főfedélzete, JMP, CRW és osztályonkénti PAD nyersen; CPM – egy pozíción több tétel (a súlyok és kategóriák sorrendben párosulnak), szabad negyedek (BY0, VR3), D (személyzet poggyásza, nem rakomány), Q sürgős cargo (a Q + egy karakter kontúr), XOM/XCS kódként, állomás nélküli fejléc (a rész a járatszámból); az SI minden Type B üzenetben szabad szöveg a végéig (CPM: a CPM END-ig), figyelmeztetés nélkül. Ellenőrzések a törzsből: férfi + nő + gyerek = PAX, főfedélzet + rakterek = T, rakterenként a CPM a D nélkül. A Lufthansa LDM és CPM a táblázat szerint, figyelmeztetés nélkül; a két ismert hiba továbbra is jelez. Az SI megszűnt feldolgozása miatt igazított régi tesztek: a P7 és az EW LDM SI-je most szövegként, a CZ súlyadatai szövegként, a TOW-ellenőrzés kikerült, az infografika kategóriái a CPM tételeiből (a P7-nél E 1983, az EW-nél nincs), a pozíciók új mezői (items, freeQuarters). A demo LDM PAX-a 175-re javítva (az infant nem számít bele).
- 7. mérföldkő (üzenetek) kész; pontosításai elfogadva (További eldöntött szabályok 41–54.).

## Állapot

- Utolsó commit: `30cd222` – feat: split COR corrections and slot messages apart (a 2. lépés commitja ezt követi)
- Tesztek: `npm test` → 572 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 8. mérföldkő, 3. lépés: PSM és PTM feldolgozása csak darabszámokkal; teszt, hogy név nem kerül a tárolt adatba és a figyelmeztetésekbe.
