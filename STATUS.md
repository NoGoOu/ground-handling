# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 24*

## Mi készült el

- 3. mérföldkő, utómunka 2: egyoldalú járatok összevonása újraimportáláskor. Ha a fájl egy csak érkező és egy csak induló járatból fordulót képez, a kettő összevonódik, és a kikerülő járat a taskjával együtt törlődik, ha az importból jött, és nincs rajta üzemi adat (rögzítés, kiosztás, ETA/ETD, ATA/ATD, törlés, naplóbejegyzés). Ha mindkettő kikerülhetne, az érkezési járat marad. Minden más esetben „párosítás változott”. A próbafuttatás „Összevonva” számot és a törlődő járatot mutatja; az importnapló is számolja.
- 3. mérföldkő, utómunka 1: a seed felveszi a Ryanairt (FR, a demo sablon másolatával mint alapértelmezett sablonnal) és a „Ryanair NetLine” profilt; a README-próba beállítás nélkül elvégezhető (`1ba3aed`).
- A CLAUDE.md 24-es és a `docs/schedule-import.md` 5-ös verziója a repóban (`18894ec`).

## Állapot

- Utolsó commit: `1ba3aed` – feat: seed Ryanair and the NetLine import profile (az utómunka 2 commitja ezt követi)
- Tesztek: `npm test` → 300 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Próba az adatbázison: a seed után a mintafájlhoz a profil felajánlódik, 50 új járat, hiba nélkül. Az FR4092 következő járata nélküli változat 64 járatot ad (14 csak érkező FR4092 és 14 csak induló FR4091); az eredeti fájl ezeket 14 fordulóvá vonja össze (50 járat, 50 task), az újabb import 50 változatlan.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 4. mérföldkő, 1. lépés: adatmodell és migráció (tervezési beállítások, terv, „Tervezés” jogosultság, seed).
