# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 35*

## Mi készült el

- **11. mérföldkő, 1. lépés:** adatmodell és migráció.
  - Eszköztípus a mezőlistájával (határidő, számláló mértékegységgel, szöveg; mező nem törölhető, csak inaktiválható); eszköz (azonosító, rendszám, leírás, állapot: üzemképes, üzemképtelen, kivonva; megjegyzés).
  - Mezőértékek és minden változásuk naplója (ki, mikor, régi és új érték); az eszköz állapotváltásainak naplója (a kiváltó hibajegyre hivatkozva); eszközdokumentumok (az eltávolítás naplózott).
  - Hibajegy (leírás, „üzemképtelen” jelölés, állapot: nyitott, folyamatban, lezárva; a lezárás eredménye: javítva vagy nem hiba), fotók, megjegyzések és az állapotváltások naplója.
  - Az eszközök „hamarosan lejár” beállítása (alapból 30 nap). Az adatbázis őrzi: a lezárt jegynek van eredménye és lezárási ideje, a többinek nincs.
  - Új jogosultságok: „Eszközök kezelése”, „Hibajegyek kezelése”, „Hiba jelentése” (minden alapértelmezett szerepkör), „Hibajegyek megtekintése” hatókörrel (Ügynök: saját; Műszakvezető, Műszaki, Admin: összes); új Műszaki alapértelmezett szerepkör. A jelentő a saját jegyeit mindig látja; az eszközlistát a Műszaki, az Admin és a műszakvezető látja. Tesztekkel.
- A 10. mérföldkő utómunkája (`3c2069f`): kizáró szempontok a gyakorlati vizsgán.

## Állapot

- Utolsó commit: `feat: add the data model of ground equipment and faults` (ez a commit; előtte `3c2069f`)
- Tesztek: `npm test` → 758 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- Nincs. A jóváhagyott 7 döntés szerint készül.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. lépés: tiszta függvények (`lib/equipment/`) – a határidő és a számláló állapota, a legközelebbi határidő, a hibajegy állapotátmenetei, az eszköz állapota jelentéskor; tesztekkel.
