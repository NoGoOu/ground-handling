# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- **A 7. mérföldkő (üzenetek) kész**, az érkezési (AA) és a korrekciós MVT előállítása nélkül (nincs minta).
- 12. lépés: seed – a mintákból átírt demo üzenetek a mai demo járatokhoz (ZZ1102: AD MVT DL93-mal, LDM, CPM; ZZ1203: EA BUD MVT, későbbi ETA; ZZ1306: P7-minták ULD-kkel és az ismert UCM–CPM eltéréssel; egy párosítatlan ET 3365; egy csak naplózott PTM), a 36, 68, 93 késéskód, címjegyzék csak `@example.invalid` és kitalált SITA-címekkel, feladó. README: az üzenetek, az API `curl`-lel, a küldés beállítása. Tiszta Docker-indítás rendben.
- 0–11. lépés: tervező a terv napjára (teszttel); adatmodell, jogosultságok, a kézi járat üzemnapjai; szétválasztás, fejléc; MVT/LDM/CPM/UCM feldolgozók (mind a nyolc minta tesztelve, a CPM mezősorrendtől függetlenül); párosítás (ET3365/12 → a 12-i járat, ATD 17-én 07:16 UTC); ellenőrzések (a két ismert hiba jelezve); hatás és verziózás; `POST /api/messages` API-kulccsal, duplikátumszűrés, PTM/PSM tartalma nem tárolódik, kézi bemásolás, párosítatlanok; Üzenetek fül és infografika (ügynöknek is); késéskódok; indulási MVT előállítása visszaolvasási teszttel, címjegyzék, küldés címzettenkénti állapottal, csatorna nélkül csak naplóz.

## Állapot

- Utolsó commit: `afa4414` – feat: generate and send the departure MVT (a 12. lépés commitja ezt követi)
- Tesztek: `npm test` → 554 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A felületet belépés nélkül nem néztem meg; az oldalak buildelnek, az API-t és az adatréteget élesben, az infografikát statikus rendereléssel ellenőriztem.

## Eltérések a CLAUDE.md-től

- Nincs. A tervben jóváhagyott pontosítások (felvehetők a szabályok közé): az AA sor az AD-vel azonos alakban; a kézi járat üzemnapja alapból az ütemezett idő budapesti napja; az Üzenetek fül a task nézetben; késéskódot és MVT-t a járatkezelő és a rész ügynöke (bármely taskon) rögzít, illetve küld; késés-ellenőrzés csak ATD-vel; a duplikátum-hash a normalizált szövegből, boríték nélkül, PTM/PSM-ből hash sem; törölt részre az üzenet nem hat; a verziók sorrendje a beérkezés; nodemailer; seed-címek `.invalid`. Megvalósítási döntések: a kimenő üzenetek saját verziókulcson (a járatra nem hatnak); a kézi késésrekord törölhető, naplózva; az időpontok napja a menetrendi időhöz legközelebbi, nap nélküli idő az előzőt követő első; UCM-ben IN és OUT együtt: az első számít, figyelmeztetéssel.

## Kérdések a tervezéshez

- Minták kellenek: érkezési (AA) és korrekciós MVT (az AA-t addig az AD alakjában olvassuk), a késési (ED) MVT, ha van.
- A CPM `.TW/92404` sorát összsúlynak vettem; a `PAD`, `TB` és a CPM-fejléc `4/1` jelentése nyitott (nyersen látszanak).
- A 36, 68, 93 késéskód leírása; a SITA-átjáró fajtája.
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- A tervezés döntése szerint (a „Később” szakaszból vagy az AA/korrekciós MVT a minták után).
