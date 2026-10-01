# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 35*

## Mi készült el

- **11. mérföldkő, 3. lépés:** eszköztípusok és mezőlisták szerkesztése (`/equipment/types`, „Eszközök kezelése”).
  - Eszköztípus: név, kód, aktív.
  - Mezőlista: név, fajta (határidő, számláló, szöveg), számlálónál mértékegység (pl. üzemóra, km), aktív; sorrend fel/le mozgatással. A mező nem törölhető, csak inaktiválható; a fajta nem változtatható, ha a mezőnek már van értéke (a felület zárolja, a szerver is ellenőrzi). A mezőnév típuson belül egyedi.
  - A sorrend-mozgatás és a sorgomb közös segédfüggvénybe, illetve komponensbe került (a vizsgáknál is ezt használja).
  - Adatbázison ellenőrizve: mezők felvétele, sorrend, a fajta zárolása értékkel, átnevezés, a névütközés elutasítása.
- 2. lépés (`b34a0a3`): tiszta függvények. 1. lépés (`cceb047`): adatmodell.

## Állapot

- Utolsó commit: `feat: edit equipment types and their fields` (ez a commit; előtte `b34a0a3`)
- Tesztek: `npm test` → 772 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- A felületet bejelentkezve nem néztem meg; az oldalak az eszközlistából (4. lépés) érhetők el.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 4. lépés: eszközök – lista, adatlap, a műszaki adatok szerkesztése naplóval, dokumentumok.
