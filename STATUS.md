# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 28. · CLAUDE.md verzió: 29*

## Mi készült el

- 8. mérföldkő, 1. lépés: szétválasztás – a típussor előtti `COR` sor az üzenethez tartozik és korrekciót jelöl (a boríték nem viszi el), a `-TITLE` sor új (ADEXP) üzenetet kezd, a PSM és a PTM Type B típusként ismert. A szeptember 27-i csomag egyben beküldve kilenc üzenetre bomlik (üres sorokkal és anélkül is), a COR a TK1034 MVT-hez tartozik, a SAM és az SRM külön üzenet, a PTM-be nem olvad bele. A minták fixture-je a docs/messages.md 17 mintájával bővült (a régi teszt a régi nyolcat nevesítve kapja).
- 7. mérföldkő (üzenetek) kész; pontosításai elfogadva (További eldöntött szabályok 41–54.).

## Állapot

- Utolsó commit: `b450b6e` – feat: seed demo messages, delay codes and an address book (az 1. lépés commitja ezt követi)
- Tesztek: `npm test` → 560 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 8. mérföldkő, 2. lépés: az LDM és a CPM javításai, Lufthansa-változatok, SI szabad szövegként, ellenőrzések a törzsből.
