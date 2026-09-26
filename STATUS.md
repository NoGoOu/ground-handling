# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 11. lépés: indulási MVT (`lib/telex/generate.ts`) a járat adataiból és rögzítéseiből: fejléc lajstrommal, AD a hatályos off-blockkal és a kézi felszállással, EA a kézi idővel és célállomással, DL a késésrekordokból (legfeljebb két kód, a többire figyelmeztetés; 99:59 fölött is), SI telex-karakterekkel. A generátor a P7 5535/16 mintát karakterre visszaadja, a saját feldolgozónk ugyanazokat az értékeket olvassa vissza (teszt). Az Üzenetek fülön előnézet, szerkeszthető szöveg, címzettek; a küldés ellenőrzi a fejlécet. Címjegyzék és feladó (Admin → Üzenetküldés). Küldés cserélhető csatornán: email SMTP-n (nodemailer, a kapcsolat adatai környezeti változókban), SITA átjáró nélkül „nem küldhető”, a Type B szöveg másolható; beállított csatorna nélkül csak naplóz. A kimenő üzenet a fülön címzettenkénti állapottal, a járat idejét nem változtatja. Az érkezési (AA) és a korrekciós MVT minta hiányában kimaradt.
- 7. mérföldkő, 0–10. lépés: tervező a terv napjára; adatmodell és jogosultságok; szétválasztás és fejléc; feldolgozók; párosítás; ellenőrzések; hatás és verziózás; API, kulcsok, bemásolás, párosítatlanok; Üzenetek fül; infografika; késéskódok.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `f205853` – feat: keep a delay code table and the flight's delay records (a 11. lépés commitja ezt követi)
- Tesztek: `npm test` → 544 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A CPM `.TW/92404` sorát (docs/messages.md: célállomásonkénti összesítés) összsúlynak (total weight) vettem, mert a mintában megegyezik a BUD-ra menő súllyal; kérem megerősíteni.
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 12. lépés: seed (demo üzenetek, minta címjegyzék nem létező címekkel, a három késéskód), README (API-példa curl-lel, a küldés beállítása), STATUS.md.
