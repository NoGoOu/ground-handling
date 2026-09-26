# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 6. lépés: hatás és verziózás. Tiszta rész (`lib/telex/effects.ts`): a BUD-i AD MVT adja az ATD-t és a késéskódokat (a késés-ellenőrzéssel), a BUD-i AA az ATA-t, a más állomásról jövő EA … BUD az ETA-t; az időket a menetrendi időhöz legközelebbi nappal oldja fel; törölt részre nincs hatás. Adatréteg (`lib/data/messages.ts`, `processText`): duplikátumszűrés hash alapján, PTM/PSM csak naplósor, tárolás a borítékkal, párosítás, verzió (járatrész + típus + fajta; a beérkezés szerint legfrissebb számít, a későn jött régebbi csak tárolódik), a lajstrom kitöltése, a késésrekordok cseréje, minden változás a járatnaplóba az üzenetre hivatkozva. Adatbázison kipróbálva a mintákkal (ET3365/12 → ATD 09. 17. 07:16 UTC).
- 7. mérföldkő, 0–5. lépés: tervező a terv napjára; adatmodell és jogosultságok; szétválasztás és fejléc; feldolgozók; párosítás; ellenőrzések.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `17e797e` – feat: check messages and their consistency (a 6. lépés commitja ezt követi)
- Tesztek: `npm test` → 511 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A CPM `.TW/92404` sorát (docs/messages.md: célállomásonkénti összesítés) összsúlynak (total weight) vettem, mert a mintában megegyezik a BUD-ra menő súllyal; kérem megerősíteni.
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 7. lépés: fogadó API (`POST /api/messages`, API-kulcs, napló, méretkorlát), API-kulcsok kezelése, kézi bemásolás, „Párosítatlan üzenetek” lista.
