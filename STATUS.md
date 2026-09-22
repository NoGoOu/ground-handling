# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 22. 23:00 · CLAUDE.md verzió: 13*

## Mi készült el

- 1. mérföldkő (MVP): a lépésterv mind a 18 pontja kész (korábbi commitok).
- Utómunka: az eltérés színküszöbei globális beállítássá váltak (`Setting`, alap 0 és 5 perc, `/admin/settings`). A számítás tiszta maradt, a küszöb paraméterként megy be.
- 2. mérföldkő, 1. lépés: `Shift` modell (ügynök, szabad kezdet és vég, opcionális megjegyzés, éjfélen átnyúlhat), migráció, és seed a két demo ügynök műszakjával.
- Docker: `docker compose down -v` után a `docker compose up --build` **tiszta állapotból lefutott** – image felépült, migráció és seed lefutott, `/api/health` → `{"db":"ok"}`.

## Állapot

- Utolsó commit: `71b8b23` – feat: make deviation colour thresholds a global setting (a Shift lépés még commit előtt áll)
- Tesztek: `npm test` → 13 fájl, 102 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: a küszöböket 3/10-re állítva a task nézet színei követték, majd visszaállítva 0/5-re.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. mérföldkő, 2. lépés: műszakbeosztás oldal (lista, felvitel, szerkesztés, törlés, validáció átfedés-ellenőrzéssel).
