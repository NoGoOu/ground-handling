# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 10. lépés: késéskód-tábla az Admin → Üzenetküldés oldalon (kód az MVT DL-sorának alakjában, leírás, aktív; nem törölhető, csak inaktiválható). Késésrekordok a task nézetben az indulási rész alatt, a járat minden taskján ugyanazok: kód, perc, forrás (kézi/üzenet), ki és mikor; kézzel csak a tábla aktív kódja rögzíthető, a kézi rekord törölhető, minden kézi változás a járatnaplóba kerül; törölt indulási részre nem rögzíthető (17. szabály). Rögzítheti, aki járatot kezel, vagy a járat indulási ügynöke. A kódok összege és a késés (7. szabály) eltérésénél figyelmeztetés.
- 7. mérföldkő, 0–9. lépés: tervező a terv napjára; adatmodell és jogosultságok; szétválasztás és fejléc; feldolgozók; párosítás; ellenőrzések; hatás és verziózás; API, kulcsok, bemásolás, párosítatlanok; Üzenetek fül; infografika.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `7104455` – feat: sum up a flight part's messages in an infographic (a 10. lépés commitja ezt követi)
- Tesztek: `npm test` → 526 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A CPM `.TW/92404` sorát (docs/messages.md: célállomásonkénti összesítés) összsúlynak (total weight) vettem, mert a mintában megegyezik a BUD-ra menő súllyal; kérem megerősíteni.
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 11. lépés: indulási MVT előállítása szerkeszthető előnézettel és visszaolvasási teszttel; címjegyzék; küldés email- és SITA-csatornán biztonságos alapállással; kimenő üzenetek címzettenkénti állapottal.
