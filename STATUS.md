# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 28. · CLAUDE.md verzió: 29*

## Mi készült el

- 8. mérföldkő, 6. lépés: infografika – legfelül a legutóbbi LDM és CPM SI-szövege változatlanul, keretben (a csillagsorok közti üzemi utasítás pirosan, a DAA-sor kiemelve); a slot (CTOT, cél off-block, szabályozás, ok); pozíciónként a tételek kategóriával és súllyal, a szabad negyedek, a Q-t tartalmazó pozíció pirosan; a rakomány kategóriái a D nélkül, a személyzet poggyásza külön; PSM: kódonként és osztályonként a darabszám, a részek együtt; PTM: továbbjáratonként az utasok, a poggyász darabja és súlya, a részek együtt. Tesztek a Lufthansa-, Turkish- és slotmintákkal.
- 7. mérföldkő (üzenetek) kész; pontosításai elfogadva (További eldöntött szabályok 41–54.).

## Állapot

- Utolsó commit: `4873cbf` – feat: read slot messages and show the slot on the departure (a 6. lépés commitja ezt követi)
- Tesztek: `npm test` → 607 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 8. mérföldkő, 7. lépés: seed (a szeptember 27-i minták a demo járatokra, SAM és SRM a demo indulásokra, repülőtér-tábla), README, STATUS.md.
