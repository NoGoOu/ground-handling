# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 28. · CLAUDE.md verzió: 29*

## Mi készült el

- 8. mérföldkő, 3. lépés: PSM és PTM – saját fejléc (nap + hónap, év nélkül: a beérkezéshez legközelebbi év), a PSM-ből célállomásonként, kódonként és osztályonként a darabszám (ellenőrzés: kódok = nSSR), a PTM-ből továbbjáratonként, célállomásonként és osztályonként az utasszám, a poggyász darabja és súlya. Név, ülés, csatlakozó járat nem kerül a feldolgozott adatba; az ismeretlen sorokról csak darabszám, a rossz fejlécről a szövege nélkül szól a figyelmeztetés. Tárolás: nyers szöveg és hash helyett a darabszámok szöveges alakja, boríték nélkül; a duplikátum ebből ismerhető fel. Részenként külön verzió (PART1, PART2…). Párosítás: PSM az indulóállomás és a célállomás-blokk, PTM az útvonal szerint. Teszt és adatbázis-próba: a mintacsomag után sehol nincs név. A címjegyzék típusai külön listában (MVT, LDM, CPM, UCM). A szétválasztás régi tesztje a PSM/PTM-et most támogatottnak várja; a demo PTM szabályos alakra írva.
- 7. mérföldkő (üzenetek) kész; pontosításai elfogadva (További eldöntött szabályok 41–54.).

## Állapot

- Utolsó commit: `ae6320f` – feat: read the Lufthansa LDM and CPM, and keep the SI as free text (a 3. lépés commitja ezt követi)
- Tesztek: `npm test` → 583 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 8. mérföldkő, 4. lépés: érkezési és korrekciós MVT előállítása, bejövő korrekció, más állomásról jövő AA; visszaolvasási tesztek.
