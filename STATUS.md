# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 1. lépés: migráció – részenkénti lajstrom a járaton; Message, MessageDelivery, DelayCode, DelayRecord, ApiKey, ApiCallLog, UnsupportedMessageLog, AddressBookEntry; a feladó címei a beállításokban; a járatnapló új fajtái (tényleges idő, lajstrom, késéskódok üzenetből). Négy új jogosultság (megtekintés és küldés hatókörrel, rögzítés, beállítások) az alapértelmezett szerepköröknek. A kézi járat űrlapja: indulóállomás, célállomás, lajstrom és üzemnap részenként (alapból az ütemezett idő budapesti napja; a meglévő kézi járatok a migrációban ugyanígy kapták meg); ütköző járatszám + üzemnap + állomás esetén hibaüzenet. Az import párosítása opcionális lajstrom-oszlopot kapott (csak akkor ír, ha a fájl megad értéket). A meglévő import-tesztek segédobjektumai csak az új mezőket kapták meg.
- 7. mérföldkő, 0. lépés: a tervező hiányjelzése a terv napjára vizsgál (39. szabály), teszttel rögzítve.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `a9821f3` – test: check plan staffing on the plan day (az 1. lépés commitja ezt követi)
- Tesztek: `npm test` → 459 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 2. lépés: feldolgozó alapok – szétválasztás, típusfelismerés, fejléc, a „nincs” változatai; tesztek a mintákkal.
