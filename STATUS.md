# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 5. lépés: ellenőrzések (`lib/telex/checks.ts`) – LDM: főfedélzet + rakterek = T, utasok = PAX; CPM: pozíciók = összsúly, TOW = ZFW + felszállási üzemanyag; LDM–CPM: főfedélzet és rakterenként (bulk esetén az alsó fedélzet egészében); UCM OUT–CPM: az E-s ULD-k = az ELD-s pozíciók, X-es ULD nincs a CPM-ben; késéskódok összege = késés (7. szabály). Mind csak figyelmeztet. A két ismert hibát (P7 5535/16 UCM–CPM, ET 3365/12 76 perc) tesztek fedik; a többi minta hibátlannak bizonyul.
- 7. mérföldkő, 0–4. lépés: tervező a terv napjára; adatmodell és jogosultságok; szétválasztás és fejléc; feldolgozók; párosítás.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `56ff92f` – feat: match messages to a flight part (az 5. lépés commitja ezt követi)
- Tesztek: `npm test` → 504 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A CPM `.TW/92404` sorát (docs/messages.md: célállomásonkénti összesítés) összsúlynak (total weight) vettem, mert a mintában megegyezik a BUD-ra menő súllyal; kérem megerősíteni.
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 6. lépés: hatás a járatra és verziózás (ATD/ATA, ETA, késésrekordok, lajstrom, járatnapló), a közös feldolgozó függvény; tesztek.
