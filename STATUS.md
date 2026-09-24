# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 24*

## Mi készült el

- **4. mérföldkő (tervezői nézet, automatikus kiosztással): kész, mind a 9 lépés.**
- 1–2. lépés: adatmodell (tervezési beállítások, terv, napok, pozíciók, ablak–pozíció tételek), „Tervezés” jogosultság (Tervező, Admin); a napi ablakok kigyűjtése (`lib/planning/input.ts`).
- 3–4. lépés: minimális pozíciószám a korlátokkal, kiegyenlítés áthelyezéssel és cserével, döntetlen-feloldás, mutatók (`assign.ts`, `position.ts`, `balance.ts`). Korlátok nélkül a pozíciószám a legnagyobb egyidejű átfedés (300 véletlen napon tesztelve), az eredmény determinisztikus.
- 5–6. lépés: beállítások felülete; tervezői felület (időszak, napváltó, mutatók, sávos nézet pozíciókkal, áthúzás figyelmeztetéssel, újraszámolás megerősítéssel, „Elavult” jelzés).
- 7–8. lépés: nevek és „Mentés a tervezetbe” (publikált napra nem); „Kiosztás átvétele” csak a kiosztatlan részekre.
- 9. lépés: README (funkciók, kipróbálás lépésenként) (`7de084d`).
- 3. mérföldkő utómunkája: Ryanair és NetLine-profil a seedben; egyoldalú járatok összevonása újraimportáláskor.

## Állapot

- Utolsó commit: `7de084d` – docs: describe the planner view (a STATUS.md commitja ezt követi)
- Tesztek: `npm test` → 362 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Próba az adatbázison (szkripttel): import után a 2024. 09. 10–16. hét terve 0,3 s; áthelyezés, újraszámolás, elavulás késésre; mentés a tervezetbe, újramentés cserével, ütközésnél semmi nem íródik, publikált nap kimarad; az átvétel csak a kiosztatlan részeket tölti ki, a második futás nem változtat. A felületet a böngészőben nem néztem meg: ehhez be kellene lépni, jelszót pedig nem írok be.

## Eltérések a CLAUDE.md-től

A jóváhagyott tervben elfogadott értelmezések (felvehetők a „További eldöntött szabályok” közé):

- Az újraszámolás a kézi módosítások mellett a neveket is törli; a tervezetbe már mentett műszakok megmaradnak, a nap következő mentése cseréli őket (a mentett műszak a terv napjához kapcsolódik).
- Elavult tervvel is lehet menteni és kiosztást átvenni (figyelmeztetéssel); az átvétel a taskok mostani alakja szerint dolgozik.
- A tervet a kiosztási jogosultsággal is lehet olvasni (a Műszakvezetőnek kell az átvételhez); módosítani csak „Tervezés” jogosultsággal.
- Egy pozíció foglaltsága az ablakai uniója (csak megengedett átfedésnél tér el az összegtől).
- Egy terv legfeljebb 31 nap (űrlap-ellenőrzés). A „Mentés a tervezetbe” a teljes tervre, a „Kiosztás átvétele” a megnyitott napra szól.
- Szünetként a műszak közepéhez legközelebbi elég hosszú rés jelölődik (a teljes rés); a minimumig kitolt műszak üres vége is számít résnek.

## Kérdések a tervezéshez

- A „Kiosztás átvétele” most napra szól. Kell-e a teljes tervre is?

## Következő lépés

- A 4. mérföldkő kész. A következő (5. mérföldkő: képzések és jogosítások, vagy 6.: üzenetek) sorrendjét és lépéstervét a tervezés adja.
