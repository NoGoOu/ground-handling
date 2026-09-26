# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 4. lépés: párosítás (`lib/telex/match.ts`) – a légitársaság-kódot a rendszer légitársaságai alapján választja le; a fejléc napja a beérkezéshez legközelebbi azonos napú dátum; a rész MVT-nél az állomás és az AD/AA/EA, UCM-nél az IN/OUT, LDM-nél a célállomás vagy egy BUD-ról induló azonos járat, CPM-nél az útvonal szerint; a jelöltek szűkítése a másik végállomással; a lajstrom kitöltése vagy eltérésnél figyelmeztetés. Párosítatlan okok: nincs fejléc, ismeretlen légitársaság, nem érinti BUD-ot, a rész nem dönthető el, nincs vagy több járat. Teszt: az ET3365/12 a 17-i beérkezéssel a 12-i járathoz párosul, az ATD 17-én 07:16 UTC.
- 7. mérföldkő, 0–3. lépés: tervező a terv napjára; adatmodell és jogosultságok; szétválasztás és fejléc; típusonkénti feldolgozók.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `dcdd749` – feat: parse MVT, LDM, CPM and UCM messages (a 4. lépés commitja ezt követi)
- Tesztek: `npm test` → 495 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A CPM `.TW/92404` sorát (docs/messages.md: célállomásonkénti összesítés) összsúlynak (total weight) vettem, mert a mintában megegyezik a BUD-ra menő súllyal; kérem megerősíteni.
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 5. lépés: ellenőrzések tiszta függvényként (összegek, LDM–CPM, UCM–CPM, késések összege); tesztek a két ismert hibára.
