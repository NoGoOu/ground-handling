# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 25. · CLAUDE.md verzió: 26*

## Mi készült el

- **A 6. mérföldkő (képzések és jogosítások) kész.**
- 8. lépés: seed – Oktatási koordinátor (`koordinator`, Oktató Olga); helyőrző jogosítások (HA 12 hónap, HB 24 hónap, HC nem jár le) egy-egy képzéssel; helyőrző követelmények a demo légitársaságnál (Alap: érkezés HA, indulás HB; Helyőrző: indulás HC). A rekordok a futtatás napjához igazodnak, így minden állapot látszik: Kiss Péter HA hamarosan lejár (egy későbbi sikertelen próbálkozás nem vette el), HB és HC érvényes, minta PDF-fel; Nagy Eszter HA lejárt, HB érvényes, HC hiányzik. README; tiszta indítás Dockerből (migrációk, seed, `uploads` kötet) rendben.
- 1–7. lépés: adatmodell; jogosítás-számítás; koordinátori felület; nézetek; követelmények részenként; figyelmeztetések (napi lista, sávos nézet, „Kiosztás átvétele”, névadás); tervező párosítással és hiányjelzéssel (3 PRM / 3 DG / 1 mindkettő tesztelve).

## Állapot

- Utolsó commit: `0cbe7bf` – feat: plan with the qualifications a day needs (a 8. lépés commitja ezt követi)
- Tesztek: `npm test` → 447 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- Nincs. A tervben jóváhagyott pontosítások, amelyek a CLAUDE.md-be felvehetők: (1) inaktív jogosítás nem választható, az ellenőrzések figyelmen kívül hagyják; (2) a lejáró lista két csoport (hamarosan lejár, lejárt), csak aktív jogosításokkal; (3) gyors fordulón az ablak követelménye a két rész uniója; (4) a követelmény a mostani beállításból jön, a taskon nem fagy be; (5) a rekord az ügynök kivételével javítható, az érvényesség vége alapból számolt, kézzel felülírható; (6) a fájl eltávolítása a lemezről töröl, a naplósor marad; (7) a tervező jelöltjei az aktív ügynökök a beosztástól függetlenül, a hiányjelzés a megtekintéskor a mai jogosításokkal számol; (8) a „hamarosan lejár” napjai globális beállítás (Admin → Beállítások).

## Kérdések a tervezéshez

- A csatolt fájlok megőrzési ideje továbbra is nyitott; addig nincs automatikus törlés.

## Következő lépés

- A tervezés döntése szerint; a „Később” szakasz első pontja a 7. mérföldkő (üzenetek).
