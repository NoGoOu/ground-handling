# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 8. lépés: a task nézet fülsort kapott („Mérföldkövek”, „Üzenetek”); az Üzenetek fül a járat üzeneteit mutatja a járat minden taskján, részenként, verziócsoportonként (érvényes elöl, a korábbiak lenyitva), irány, beérkezés, forrás, figyelmeztetések, a feldolgozott tartalom (helyi időben) és a nyers szöveg a borítékkal. Láthatóság: „Üzenetek megtekintése” a járat taskjainak tényleges ügynökei szerint (ügynök: a saját taskjai járatai; műszakvezető, admin: összes).
- 7. mérföldkő, 0–7. lépés: tervező a terv napjára; adatmodell és jogosultságok; szétválasztás és fejléc; feldolgozók; párosítás; ellenőrzések; hatás és verziózás; API, kulcsok, bemásolás, párosítatlanok.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `22268ba` – feat: receive messages through an API and by hand (a 8. lépés commitja ezt követi)
- Tesztek: `npm test` → 517 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A CPM `.TW/92404` sorát (docs/messages.md: célállomásonkénti összesítés) összsúlynak (total weight) vettem, mert a mintában megegyezik a BUD-ra menő súllyal; kérem megerősíteni.
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 9. lépés: infografika fix elrendezésben, járatrészenként (utasok, rakomány, ULD-k, halmok, különleges kódok, súlyadatok, figyelmeztetések, forrásüzenet).
