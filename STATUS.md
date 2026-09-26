# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 26. · CLAUDE.md verzió: 27*

## Mi készült el

- 7. mérföldkő, 9. lépés: infografika (`lib/telex/infographic.ts` tiszta függvény, `components/infographic.tsx`) az Üzenetek fülön, járatrészenként, a rész érvényes üzeneteiből: utasok (férfi, nő, gyerek, infant, összesen), rakomány (összesen, főfedélzet, rakterenként, bulk, kategóriánként – az LDM-ből, annak hiányában a CPM-ből), ULD-k pozíció szerint (ULD, súly, kategória, kód, cél), üres ULD-halmok (ELD-s pozíciók és az UCM E/X darabszáma), különleges kódok pozíciókkal, súlyadatok (CPM SI), figyelmeztetések (az üzenetekéi és az LDM–CPM, UCM–CPM összevetés); minden blokknál a forrásüzenet és a beérkezés ideje. Telefonon egy oszlop. Tesztek a mintákkal.
- 7. mérföldkő, 0–8. lépés: tervező a terv napjára; adatmodell és jogosultságok; szétválasztás és fejléc; feldolgozók; párosítás; ellenőrzések; hatás és verziózás; API, kulcsok, bemásolás, párosítatlanok; Üzenetek fül.
- 6. mérföldkő (képzések és jogosítások) kész; pontosításai elfogadva (További eldöntött szabályok 33–40.).

## Állapot

- Utolsó commit: `a3608af` – feat: show a flight's messages on the task view (a 9. lépés commitja ezt követi)
- Tesztek: `npm test` → 523 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- Az érkezési (AA) és a korrekciós MVT előállításához minta kell; a 11. lépésben ez a kettő kimarad. A beérkező AA sort a feldolgozó az AD-vel azonos időformátumban ismeri fel (jóváhagyott döntés).
- A CPM `.TW/92404` sorát (docs/messages.md: célállomásonkénti összesítés) összsúlynak (total weight) vettem, mert a mintában megegyezik a BUD-ra menő súllyal; kérem megerősíteni.
- A `docs/projekt-osszefoglalo.md` nem került a repóba.

## Következő lépés

- 7. mérföldkő, 10. lépés: késéskód-tábla (admin) és késésrekordok a járat indulási részén, ellenőrzéssel.
