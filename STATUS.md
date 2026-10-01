# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 35*

## Mi készült el

- **11. mérföldkő, 2. lépés:** tiszta függvények (`lib/equipment/`), tesztekkel.
  - `status.ts`: a határidő állapota (érvényes, hamarosan lejár, lejárt, nincs megadva – a jogosításokkal azonos szabály: a saját napján még érvényes); a számláló állapota (esedékes, ha elérte az esedékességi értéket; esedékesség nélkül soha); ami figyelmet kér egy eszközön (lejáró és lejárt határidők, esedékes számlálók, az inaktív mezők nélkül); a legközelebbi határidő.
  - `faults.ts`: a jegy állapotátmenetei (nyitott → folyamatban → lezárva, nyitottból közvetlenül is lezárható, újranyitás nincs); jelentéskor az „üzemképtelen” jelölés az üzemképes eszközt azonnal üzemképtelenre állítja; kivont eszközre nem lehet jelenteni; a kézi állapotváltások és hogy melyik jogosultság kell hozzájuk (kivonás és visszahozás: „Eszközök kezelése”, üzemképtelen és vissza: „Hibajegyek kezelése”).
- 1. lépés (`cceb047`): adatmodell, migráció, jogosultságok, Műszaki szerepkör.

## Állapot

- Utolsó commit: `feat: judge deadlines, counters and faults in pure functions` (ez a commit; előtte `cceb047`)
- Tesztek: `npm test` → 769 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: kivont eszköz kezelője („Eszközök kezelése”) visszahozhatja üzemképesre, naplózva.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 3. lépés: eszköztípusok és mezőlisták szerkesztése.
