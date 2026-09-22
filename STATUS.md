# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 22. 23:05 · CLAUDE.md verzió: 13*

## Mi készült el

- 1. mérföldkő (MVP): a lépésterv mind a 18 pontja kész (korábbi commitok).
- Utómunka: az eltérés színküszöbei globális beállítássá váltak. `Setting` modell egyetlen sorral (alap 0 és 5 perc), migráció, seed, `/admin/settings` oldal. A számítás tiszta maradt: a küszöb paraméterként megy a `computeTimeline`-ba és a `deviationLevel`-be.
- Docker: `docker compose down -v` után a `docker compose up --build` **tiszta állapotból lefutott** – image felépült, migráció és seed lefutott, `/api/health` → `{"db":"ok"}`.

## Állapot

- Utolsó commit: `ea5086d` – docs: update project spec to v13 (ez a lépés még commit előtt áll)
- Tesztek: `npm test` → 13 fájl, 100 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Kézi próba: a küszöböket 3/10-re állítva a task nézet színei követték (+1 perc zöldre, +6 perc sárgára váltott), majd visszaállítva 0/5-re.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs (a 13-as leírás a korábbi kérdéseket megválaszolta)

## Következő lépés

- 2. mérföldkő, 1. lépés: Prisma `Shift` modell, migráció, seed kiegészítés a demo ügynökök műszakjaival.
