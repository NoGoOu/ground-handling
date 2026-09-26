# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 3. lépés: feldolgozók – MVT (AD, AA az AD-vel azonos alakban, EA, DL kódokkal és percekkel, SI), LDM (konfiguráció, személyzet, célállomásonként utasok, T, MD, rakterek, PAX, PAD, különleges tételek, SI-bontás), CPM (szakaszok, pozíciók mintázat alapján – a súly, a cél, a kontúr és a kategória sorrendje tetszőleges –, bulk, üres pozíciók, célállomás-összesítés, SI súlyadatok, CPM END), UCM (IN/OUT, tételek, SI). Mind a nyolc minta tesztelve; az ismeretlen sor vagy mező figyelmeztet, a feldolgozás folytatódik.
- 7. mérföldkő, 0–2. lépés: tervező a terv napjára; adatmodell és jogosultságok; szétválasztás és fejléc.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `d1a019c` – feat: split received texts into messages and read their headers (a 3. lépés commitja ezt követi)
- Tesztek: `npm test` → 486 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A CPM `.TW/92404` sorát (docs/messages.md: célállomásonkénti összesítés) összsúlynak (total weight) vettem, mert a mintában megegyezik a BUD-ra menő súllyal; kérem megerősíteni.
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 4. lépés: párosítás járatra és részre (légitársaság-kód a rendszer légitársaságaiból, a nap feloldása a beérkezéshez, a rész a típus szabályai szerint), a párosítatlanok okai; tesztek, köztük az ET3365/12.
