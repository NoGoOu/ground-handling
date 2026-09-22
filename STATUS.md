# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 22. 23:20 · CLAUDE.md verzió: 13*

## Mi készült el

- 1. mérföldkő (MVP): a lépésterv mind a 18 pontja kész (korábbi commitok).
- Utómunka: az eltérés színküszöbei globális beállítássá váltak (`Setting`, alap 0 és 5 perc, `/admin/settings`); a számítás tiszta maradt, a küszöb paraméterként megy be.
- 2. mérföldkő, 1. lépés: `Shift` modell (ügynök, szabad kezdet és vég, éjfélen átnyúlhat, opcionális megjegyzés), migráció, seed a demo ügynökök műszakjaival.
- 2. mérföldkő, 2. lépés: `/shifts` oldal a műszakvezetőnek és az adminnak – napválasztó, felvitel, szerkesztés, törlés, és átfedés-ellenőrzés (ugyanannak az ügynöknek nem lehet két átfedő műszakja; az érintkező műszak megengedett).
- Docker: `docker compose down -v` után a `docker compose up --build` **tiszta állapotból lefutott** – image felépült, migráció és seed lefutott, `/api/health` → `{"db":"ok"}`.

## Állapot

- Utolsó commit: `8d3fe2a` – feat: add shift model with migration and seed (a műszakoldal még commit előtt áll)
- Tesztek: `npm test` → 15 fájl, 111 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: átfedő műszak elutasítva a konkrét ütköző műszak idejével, érintkező műszak elfogadva, szerkesztés és törlés működik.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. mérföldkő, 3. lépés: szerveroldali adatréteg – taskonkénti foglaltsági ablakok és ütközésvizsgálat (ablak-átfedés és a műszakból kilógás), unit tesztekkel.
