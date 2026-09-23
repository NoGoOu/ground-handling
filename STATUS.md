# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 23. 09:45 · CLAUDE.md verzió: 13*

## Mi készült el

- 1. mérföldkő (MVP): mind a 18 lépés kész (korábbi commitok).
- Utómunka: az eltérés színküszöbei globális beállítássá váltak (`Setting`, alap 0 és 5 perc, `/admin/settings`).
- 2. mérföldkő, 1. lépés: `Shift` modell, migráció, seed a demo ügynökök műszakjaival.
- 2. mérföldkő, 2. lépés: `/shifts` oldal (felvitel, szerkesztés, törlés, átfedés-ellenőrzés).
- 2. mérföldkő, 3. lépés: `lib/board.ts` – dobozok, sávok, ütközésvizsgálat tiszta függvényekkel.
- 2. mérföldkő, 4. lépés: `/board` sávos nézet (óratengely, ügynöksávok a műszakkal, kiosztatlan sáv, most-vonal).
- 2. mérföldkő, 5. lépés: drag and drop kiosztás – az érkezési doboz az érkezési, az indulási az indulási ügynököt állítja, gyors fordulónál mindkét részt az érkezési ügynök kapja; a „Kiosztatlan” sávra húzva a kiosztás törlődik; ütközésnél figyelmeztet, de ment, és a doboz jelölve marad.

## Állapot

- Utolsó commit: `f8e32a0` – feat: add read-only band timeline view (a drag and drop még commit előtt áll)
- Tesztek: `npm test` → 16 fájl, 131 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Docker: `docker compose down -v` után az `up --build` tiszta állapotból lefutott (migráció, seed, `/api/health` → `{"db":"ok"}`).
- Kézi próba: kiosztatlan doboz ráhúzva egy ügynökre („Kiosztva, de ütközés van: A műszakon kívülre esik”, piros szegéllyel), visszahúzva törlődött, hosszú fordulónál csak az indulási rész mozdult.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. mérföldkő, 6. lépés: README frissítése a műszakbeosztással és a sávos nézettel, majd a STATUS.md lezárása.
