# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 26*

## Mi készült el

- 6. mérföldkő, 1. lépés: adatmodell és migráció. Jogosítás (név, kód, érvényesség hónapban vagy nem jár le, aktív), képzés (adott jogosítás, dolgozat, sikerességi határ), képzési rekord (teljesítés napja, eredmény, sikeres, érvényesség vége számolva vagy kézzel, megjegyzés, ki és mikor rögzítette és módosította), csatolmány (az eltávolítás naplósora megmarad), követelmények a légitársaság feladattípusainál részenként; a „hamarosan lejár” napjai a globális beállításban (30). Új jogosultságok: „Képzések kezelése” és „Képzési adatok megtekintése” hatókörrel; új alapértelmezett szerepkör: Oktatási koordinátor. A migráció a meglévő szerepköröknek is megadja őket (Ügynök: saját, Műszakvezető: csapat, Admin: összes).
- 5. mérföldkő (feladattípusok) kész; eltérései elfogadva (További eldöntött szabályok 27–32.).

## Állapot

- Utolsó commit: `b727fa7` – docs: update the specification to version 26 (az 1. lépés commitja ezt követi)
- Tesztek: `npm test` → 398 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. mérföldkő, 2. lépés: jogosítás-számítás tiszta függvényekként, tesztekkel.
