# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 26*

## Mi készült el

- 6. mérföldkő, 2. lépés: jogosítás-számítás (`lib/qualifications.ts`): az érvényesség vége a teljesítés napja + a hónapok (rövidebb hónapban a hónap utolsó napja), jogosításonként a legutolsó sikeres rekord számít (azonos napon a később rögzített), egy későbbi sikertelen próbálkozás nem veszi el; állapot egy napon (érvényes, hamarosan lejár, lejárt, hiányzik; az utolsó napon még érvényes); a task ablakának követelménye (gyors fordulón a két rész uniója, inaktív jogosítás nélkül) és a hiányzó vagy lejárt jogosítások. Tesztekkel.
- 6. mérföldkő, 1. lépés: adatmodell és migráció (jogosítás, képzés, rekord, csatolmány, követelmények, „hamarosan lejár” beállítás, két új jogosultság és az Oktatási koordinátor szerepkör) (`abc2e9a`).
- 5. mérföldkő (feladattípusok) kész; eltérései elfogadva (További eldöntött szabályok 27–32.).

## Állapot

- Utolsó commit: `abc2e9a` – feat: add the training and qualification data model (a 2. lépés commitja ezt követi)
- Tesztek: `npm test` → 411 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. mérföldkő, 3. lépés: koordinátori felület (jogosítások, képzések, rekordok, fájlok, lejáró jogosítások).
