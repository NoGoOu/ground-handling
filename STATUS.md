# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 23*

## Mi készült el

- 1. és 2. mérföldkő: kész.
- Utómunka a 23-as verzió szerint: a „Késik” címke csak akkor jelenik meg, ha a hatályos érkezés vagy indulás több mint a sárga eltérés-küszöbbel (globális beállítás, alapértelmezés 5 perc) későbbi a menetrendinél. Tesztekkel, a küszöb körüli esetekre is.

## Állapot

- Utolsó commit: `4809850` – docs: close milestone 2 after a clean start (az utómunka commitja ezt követi)
- Tesztek: `npm test` → 212 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: a demo napon a ZZ1101 érkezése 4 percet késik (nem „Késik”), az indulása 6 percet („Késik · menetrend: 09. 24. 07:55”).

## Eltérések a CLAUDE.md-től

- nincs (a korábbi eltérések a „További eldöntött szabályok” 12–18. pontjai lettek)

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 3. mérföldkő (járatrend-import): a lépések vázlata jóváhagyásra vár.
