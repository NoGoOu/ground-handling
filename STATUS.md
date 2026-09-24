# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 24*

## Mi készült el

- 4. mérföldkő, 6. lépés: tervezői felület (`/planning`, menü: „Tervezés”). Új terv időszakra (legfeljebb 31 nap), a program naponként számol; napváltó a terv napjaival; mutatók; sávos nézet pozíciónként (a műszak kiterjedése, a jelölt szünet, a megsértett szabályok); áthúzás másik vagy új pozícióba, szabálysértésnél figyelmeztetéssel, kézi jelöléssel; a nap vagy a teljes terv újraszámolása megerősítéssel; „Elavult” jelzés, ha a nap ablakai a számolás óta változtak. A Műszakvezető olvashatja a tervet. A tervezetbe mentett műszak a terv napjához kapcsolódik (`Shift.planDayId`), így az újraszámolás után is a nap következő mentése cseréli.
- 4. mérföldkő, 5. lépés: a tervezési beállítások felülete (`/planning/settings`, „Tervezés” jogosultsággal): műszakhossz, a mentett műszak résztípusa (aktív, operatív), szünet, pihenőidő vagy átfedés (egyszerre csak az egyik), létszámtöbblet; űrlap-ellenőrzés tesztekkel.
- 4. mérföldkő, 4. lépés: kiegyenlítés és döntetlen-feloldás (`lib/planning/balance.ts`). Az 1. lépés eredményéből indul, a minimum + létszámtöbblet pozíción belül; egy ablak áthelyezése vagy két ablak cseréje, ha javít, és minden korlát teljesül. A javulás sorrendje: a terhelések különbsége, a munkaidő, az üresjárat, végül a terhelések négyzetösszege (ez csak az elakadás ellen kell). A kipróbált létszámok közül a jobbik nyer, a pozíciók az első ablakuk szerint számozódnak. Mutatók: pozíciószám, pozíciónként foglaltság, műszakhossz, üresjárat, összes munkaidő, a terhelés minimuma, maximuma, különbsége. Tesztek: determinisztikus eredmény, a létszámtöbblet és a korlátok betartása, korlátok nélkül a legnagyobb átfedés. Egy 70 ablakos nap ~0,1 s.
- 4. mérföldkő, 3. lépés: az algoritmus 1. lépése (`lib/planning/assign.ts`, `position.ts`): időrendben minden ablak egy olyan meglévő pozícióba kerül, ahol a korlátok teljesülnek (ha több ilyen van, abba, ahol a legkisebb a rés, azon belül a kisebb sorszámúba), különben új pozíció nyílik. A pozíció szabályai: műszak az első ablaktól az utolsóig, a minimumig kitolva; maximális hossz; pihenőidő, illetve megengedett átfedés (a legkésőbbi véghez mérve); szünet a küszöb fölött, a műszak közepéhez legközelebbi elég hosszú rés. Tesztek: korlátok nélkül 300 véletlen napon a pozíciószám a legnagyobb egyidejű átfedés; pihenő, átfedés, maximális hossz, szünet; determinisztikus eredmény.
- 4. mérföldkő, 2. lépés: a terv bemenete (`lib/planning/input.ts`, tiszta függvények): a taskok foglaltsági ablakai, egy nap feladatai az azon a napon (Budapest) kezdődő ablakok, rögzített sorrendben (kezdet, vég, azonosító); a terv napja elavult, ha az ablakai eltérnek a mostaniaktól. Tesztek: gyors, hosszú, egyoldalú, törölt, éjfélen átnyúló. Az adatréteg az időszak és az utána következő nap listáiból gyűjt.
- 4. mérföldkő, 1. lépés: adatmodell és migráció. Tervezési beállítások egy sorban (a leírt alapértékekkel és a mentéshez használt résztípussal, alapból Műszak); terv (időszak), napok (a beállítások másolata, a számolás ideje), névtelen pozíciók (sorszám, név, a tervezetbe mentett műszak) és ablak–pozíció tételek (task, rész, az ablak ideje a számoláskor, kézi jelölés). Az adatbázis is ellenőrzi, hogy a pihenőidő és az átfedés közül legfeljebb az egyik nagyobb nullánál. Új jogosultság: „Tervezés” (Tervező, Admin); a terv oldalát a kiosztási jogosultsággal is lehet olvasni. A seed beállítja az alapértékeket.
- 3. mérföldkő, utómunka 2: egyoldalú járatok összevonása újraimportáláskor. Ha a fájl egy csak érkező és egy csak induló járatból fordulót képez, a kettő összevonódik, és a kikerülő járat a taskjával együtt törlődik, ha az importból jött, és nincs rajta üzemi adat (rögzítés, kiosztás, ETA/ETD, ATA/ATD, törlés, naplóbejegyzés). Ha mindkettő kikerülhetne, az érkezési járat marad. Minden más esetben „párosítás változott”. A próbafuttatás „Összevonva” számot és a törlődő járatot mutatja; az importnapló is számolja.
- 3. mérföldkő, utómunka 1: a seed felveszi a Ryanairt (FR, a demo sablon másolatával mint alapértelmezett sablonnal) és a „Ryanair NetLine” profilt; a README-próba beállítás nélkül elvégezhető (`1ba3aed`).
- A CLAUDE.md 24-es és a `docs/schedule-import.md` 5-ös verziója a repóban (`18894ec`).

## Állapot

- Utolsó commit: `e6455a7` – feat: edit the planning settings (a 6. lépés commitja ezt követi)
- Tesztek: `npm test` → 350 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Próba az adatbázison: a mintafájl importja után a 2024. 09. 10–16. hét terve 0,3 s alatt elkészül, naponként a pozíciószám a legnagyobb egyidejű átfedés; áthelyezés új pozícióba kézi jelöléssel, újraszámolás után a jelölés eltűnik; egy ETA-késés után a nap elavult, visszavonva újra friss. A felületet a böngészőben nem néztem meg (bejelentkezés kell hozzá).

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 4. mérföldkő, 7. lépés: nevek hozzárendelése és mentés a tervezetbe (csak nem publikált napokra).
