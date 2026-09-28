# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 28. · CLAUDE.md verzió: 29*

## Mi készült el

- 8. mérföldkő, 4. lépés: érkezési MVT előállítása (AA földetérés/on-block; a földet érés kézzel, az on-block a hatályos ATA; a Lufthansa-mintát karakterre adja vissza), korrekciós MVT (a kimenő MVT kártyáján „Korrekció”: az eredeti kézi értékeivel és a járat mostani adataival, COR sorral; új verzió, az eredeti megmarad), a Message „korrekció” jelzője (migráció) és „Korrekció” címke; bejövő korrekció: új verzió, ha ATD-t vagy ATA-t hoz, a rendszerérték frissül, a járatnaplóban „COR” jelöléssel; más állomásról jövő AA a BUD-ról induló részhez párosul (AA_DEST fajta), csak tájékoztató. Visszaolvasási tesztek; adatbázison kipróbálva.
- 7. mérföldkő (üzenetek) kész; pontosításai elfogadva (További eldöntött szabályok 41–54.).

## Állapot

- Utolsó commit: `03b6a1e` – feat: keep only the counts of PSM and PTM, never a name (a 4. lépés commitja ezt követi)
- Tesztek: `npm test` → 589 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 8. mérföldkő, 5. lépés: ADEXP-feldolgozó (SAM, SRM), repülőtér-tábla, párosítás, slot a járaton, slot-figyelmeztetés, felajánlás a késésnél és az MVT-nél.
