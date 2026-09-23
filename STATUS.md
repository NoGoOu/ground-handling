# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 23. 09:10 · CLAUDE.md verzió: 13*

## Mi készült el

- 1. mérföldkő (MVP): mind a 18 lépés kész (korábbi commitok).
- Utómunka: az eltérés színküszöbei globális beállítássá váltak (`Setting`, alap 0 és 5 perc, `/admin/settings`); a számítás tiszta maradt, a küszöb paraméterként megy be.
- 2. mérföldkő, 1. lépés: `Shift` modell, migráció, seed a demo ügynökök műszakjaival.
- 2. mérföldkő, 2. lépés: `/shifts` oldal (napválasztó, felvitel, szerkesztés, törlés, átfedés-ellenőrzés).
- 2. mérföldkő, 3. lépés: `lib/board.ts` – dobozok, sávok, ütközésvizsgálat, tiszta függvényekkel és tesztekkel.
- 2. mérföldkő, 4. lépés: `/board` sávos nézet olvasásra – óratengely, ügynöksávok a műszak kiemelésével, „Kiosztatlan” sáv, dobozok a járatszámmal és állóhellyel, ütközésnél piros szegély, mozgó most-vonal.

## Állapot

- Utolsó commit: `1c0e353` – feat: add board data layer with conflict detection (a sávos nézet még commit előtt áll)
- Tesztek: `npm test` → 16 fájl, 128 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Docker: `docker compose down -v` után a `docker compose up --build` tiszta állapotból lefutott (migráció, seed, `/api/health` → `{"db":"ok"}`).
- A demo adatok újratöltve a mai napra; a seed mindig a futtatás napjára tölt.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. mérföldkő, 5. lépés: drag and drop kiosztás a sávos nézeten, ütközés-figyelmeztetéssel (a mentés engedett).
