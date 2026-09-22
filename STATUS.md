# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 22. 23:30 · CLAUDE.md verzió: 13*

## Mi készült el

- 1. mérföldkő (MVP): a lépésterv mind a 18 pontja kész (korábbi commitok).
- Utómunka: az eltérés színküszöbei globális beállítássá váltak (`Setting`, alap 0 és 5 perc, `/admin/settings`); a számítás tiszta maradt.
- 2. mérföldkő, 1. lépés: `Shift` modell, migráció, seed a demo ügynökök műszakjaival.
- 2. mérföldkő, 2. lépés: `/shifts` oldal (napválasztó, felvitel, szerkesztés, törlés, átfedés-ellenőrzés).
- 2. mérföldkő, 3. lépés: `lib/board.ts` – dobozok a foglaltsági ablakokból (gyorsnál egy, hosszúnál kettő), sávok a műszakos és a csak taskkal rendelkező ügynököknek, kiosztatlan doboz-lista, és ütközésvizsgálat (ablak-átfedés, illetve a műszakból kilógás, érintkező műszakok egyesítésével). Adatréteg: `lib/data/board.ts`.
- Docker: `docker compose down -v` után a `docker compose up --build` **tiszta állapotból lefutott** – image felépült, migráció és seed lefutott, `/api/health` → `{"db":"ok"}`.

## Állapot

- Utolsó commit: `a5b58bf` – feat: add shift roster page (a sávos adatréteg még commit előtt áll)
- Tesztek: `npm test` → 16 fájl, 125 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. mérföldkő, 4. lépés: sávos nézet olvasásra (sávok a műszak kiemelésével, dobozok, kiosztatlan sáv, most-vonal).
