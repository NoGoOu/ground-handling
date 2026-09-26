# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 2. lépés: feldolgozó alapok a `lib/telex/` mappában (a `lib/messages/` a felület szövegeié): szétválasztás a típussoroknál (az UCM IN/OUT sora és a CPM END nem új üzenet), a típussor előtti sorok borítékként megmaradnak, PTM/PSM felismerve de nem támogatva; fejléc (járatszám, nap vagy teljes dátum, lajstrom, a típus saját mezői); a „nincs” változatai; a duplikátum-hash normalizált szövege. A nyolc minta fixture-ben, egy teszt a docs/messages.md-vel összeveti.
- 7. mérföldkő, 0–1. lépés: a tervező hiányjelzése a terv napjára (teszttel); adatmodell, jogosultságok, a kézi járat üzemnapjai és állomásai, az import lajstrom-mezője.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `19f4dc5` – feat: data model for messages, delay codes and API keys (a 2. lépés commitja ezt követi)
- Tesztek: `npm test` → 474 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 3. lépés: típusonkénti feldolgozók (MVT, LDM, CPM mezősorrendtől függetlenül, UCM), tesztek mind a nyolc mintára.
