# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 28. · CLAUDE.md verzió: 29*

## Mi készült el

- 8. mérföldkő, 5. lépés: ADEXP-feldolgozó (SAM, SRM; más TITLE felismerve, nyersen, „nem feldolgozott”, hatás nélkül); repülőtér-tábla (IATA, ICAO, név; Admin → Üzenetküldés, felvétel és szerkesztés; a migráció felveszi a BUD/LHBP-t) és slot-tűrés (globális, 10 perc); párosítás előbb az IFPLID alapján, különben ADEP LHBP + a járat célállomása = ADES (ICAO→IATA) + EOBD + EOBT ±2 óra, pontosan egy jelölttel (egyébként párosítatlan, pl. „a célrepülőtér nincs a repülőtér-táblában”); a párosított IFPLID a járat indulási részén marad (kézi hozzárendeléskor is), a SAM és az SRM ugyanannak a tervnek a verziói. A járaton és a napi listán „Slot hh:mm” (a task nézetben CTOT, gurulás, cél off-block, szabályozások, ok, késéskód), figyelmeztetés, ha az elsődleges task indulási horgonya későbbi a cél off-block + tűrésnél. A slot nem írja át az ETD-t: a „Késés rögzítése” felajánlja a cél off-blockot az ETD-be, a késéskódok a slot okának kódját a slotból adódó perccel (egy kattintással), az indulási MVT-nél jelzés. Tesztek; adatbázison kipróbálva (SAM, SRM, IFPLID szerinti új verzió, ismeretlen repülőtér).
- 7. mérföldkő (üzenetek) kész; pontosításai elfogadva (További eldöntött szabályok 41–54.).

## Állapot

- Utolsó commit: `55cce45` – feat: make arrival and correction MVTs, and read corrections (az 5. lépés commitja ezt követi)
- Tesztek: `npm test` → 601 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 8. mérföldkő, 6. lépés: az infografika bővítése (legfelül a legutóbbi LDM és CPM SI-szövege, pozíciónként a kategóriák és a szabad negyedek, Q kiemelve, D külön, PSM és PTM darabszámok, slot).
