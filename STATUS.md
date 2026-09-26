# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 0. lépés: a tervező hiányjelzése már eddig is a terv napjára vizsgálta az érvényességet (39. szabály); a számolás tiszta függvénybe került (`dayStaffing`), és teszt rögzíti: a terv napja előtt lejáró jogosítás miatt a pozíció betölthetetlen.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `83b25ac` – docs: CLAUDE.md v27 and messages.md v4 (milestone 7) (a 0. lépés commitja ezt követi)
- Tesztek: `npm test` → 449 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 1. lépés: adatmodell és migráció (lajstrom, üzenetek, kézbesítés, késéskódok és -rekordok, API-kulcsok, címjegyzék, naplók), új jogosultságok, a kézi járat üzemnapjai, az import lajstrom-mezője.
