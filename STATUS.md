# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 7. lépés: `POST /api/messages` Bearer API-kulccsal (szöveg vagy JSON: text, source, receivedAt; 256 KB; üzenetenkénti válasz típussal, párosítással, figyelmeztetésekkel; hibák: 401, 400, 413, 422), minden hívás naplózva, a kulcs utolsó használata látszik; a proxy ezt az útvonalat nem munkamenettel védi. Admin → Üzenetküldés: kulcs létrehozása (csak egyszer látszik, hash-elve tárolva), visszavonás, hívásnapló. Új „Üzenetek” menü (Műszakvezető, Admin): kézi bemásolás ugyanazzal a feldolgozással, „Párosítatlan üzenetek” lista okkal, nyers szöveggel, hozzárendeléssel a jelölt járatrészekhez vagy elvetéssel. Élesben kipróbálva curl-lel (tárolás, párosítás, ATD és késéskód, PTM csak naplóban, duplikátum, hibás kulcs).
- 7. mérföldkő, 0–6. lépés: tervező a terv napjára; adatmodell és jogosultságok; szétválasztás és fejléc; feldolgozók; párosítás; ellenőrzések; hatás és verziózás.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `7b8ece5` – feat: store received messages and apply them to their flights (a 7. lépés commitja ezt követi)
- Tesztek: `npm test` → 517 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A CPM `.TW/92404` sorát (docs/messages.md: célállomásonkénti összesítés) összsúlynak (total weight) vettem, mert a mintában megegyezik a BUD-ra menő súllyal; kérem megerősíteni.
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 8. lépés: „Üzenetek” fül a task nézetben (műszakvezető és ügynök), járatrészenként a verziókkal, nyers és feldolgozott tartalommal, figyelmeztetésekkel.
