# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 34*

## Mi készült el

- **10. mérföldkő, 8. lépés:** kibocsátás.
  - A „kibocsátható” folyamat (minden előírt rész sikeres) kiemelve jelenik meg a listán és a folyamat oldalán; a „Kibocsátás” jogosultsággal egy gombbal, megerősítés után kibocsátható.
  - A kibocsátás létrehozza a sikeres képzési rekordot: a teljesítés napja a mai nap, az érvényesség a jogosítás szerint, a dolgozat eredménye az utolsó sikeres e-vizsgáé (dolgozat nélküli képzésnél üres), megjegyzésben a folyamat; a rekord hivatkozik a folyamatra. Ettől érvényes a jogosítás.
  - Naplózva: ki és mikor bocsátotta ki; a folyamat lezárul, a koordinátor a rekordot megnyithatja.
  - Két egyidejű kibocsátásból csak egy megy át.
- 7. lépés (`c1fdb81`): gyakorlati vizsga. 6. lépés (`283f5e6`): OJT. 5. lépés (`2d3010d`): folyamat. 1–4. lépés: adatmodell, tiszta függvények, szerkesztőfelületek, e-vizsga.

## Állapot

- Utolsó commit: `feat: release a ready process into a passed record` (ez a commit; előtte `c1fdb81`)
- Tesztek: `npm test` → 749 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Adatbázison végigpróbálva: nem kibocsátható folyamat elutasítva; két sikeres kísérletből a későbbi eredménye (85%) kerül a rekordba; két egyidejű kibocsátásból egy megy át; a rekord mai teljesítéssel és 12 hónapos érvényességgel jön létre; a jogosítás előtte nem, utána érvényes. Bejelentkezve nem néztem meg.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 9. lépés: seed (Mentor és Vizsgáztató felhasználó, kétrészes képzés rövid kérdésbankkal, egy félúton lévő és egy kibocsátható folyamat), README, STATUS.md, tiszta Docker-indítás.
