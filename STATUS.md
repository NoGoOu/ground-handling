# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 23. 10:10 · CLAUDE.md verzió: 13*

## Mi készült el

- 1. mérföldkő (MVP): mind a 18 lépés kész.
- Utómunka: az eltérés színküszöbei globális beállítássá váltak (`Setting`, alap 0 és 5 perc, `/admin/settings`); a számítás tiszta maradt, a küszöb paraméterként megy be.
- 2. mérföldkő, 1. lépés: `Shift` modell, migráció, seed a demo ügynökök műszakjaival.
- 2. mérföldkő, 2. lépés: `/shifts` oldal (felvitel, szerkesztés, törlés, átfedés-ellenőrzés).
- 2. mérföldkő, 3. lépés: `lib/board.ts` – dobozok, sávok, ütközésvizsgálat tiszta függvényekkel.
- 2. mérföldkő, 4. lépés: `/board` sávos nézet (óratengely, ügynöksávok a műszakkal, kiosztatlan sáv, most-vonal).
- 2. mérföldkő, 5. lépés: drag and drop kiosztás, ütközés-figyelmeztetéssel (a mentés engedett, a doboz piros szegéllyel jelölve marad).
- 2. mérföldkő, 6. lépés: README frissítve. **A 2. mérföldkő kész.**

## Állapot

- Utolsó commit: `d34eec2` – docs: document shifts, the band view and settings in the README
- Tesztek: `npm test` → 16 fájl, 131 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Docker: `docker compose down -v` után az `up --build` tiszta állapotból lefutott (migráció, seed, `/api/health` → `{"db":"ok"}`).
- Kézi próba valódi egérhúzással: kiosztás ügynökre („Átfedés egy másik taskkal”, illetve „A műszakon kívülre esik” figyelmeztetéssel), visszahúzás a „Kiosztatlan” sávra (a kiosztás törlődött), hosszú fordulónál csak a húzott rész mozdult.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- **Sávos nézet sűrűsége:** 24 órás tengelyen a 20–45 perces dobozok feliratai csonkolódnak (a teljes adat az egérmutató alatt látszik). Maradjon így, vagy szűküljön a tengely, esetleg legyen nagyítás?
- **Kiosztás egér nélkül:** a sávos nézeten csak húzással lehet kiosztani; a napi járatlistán továbbra is legördülővel. Kell-e a sávos nézeten is billentyűzetes megoldás?
- **Több műszak egy napon:** most bármennyi nem átfedő műszak felvehető egy ügynöknek; ha ez nem kívánatos, kérek szabályt.

## Következő lépés

- Nincs kiosztott lépés. A CLAUDE.md „Később” listája szerint a 3. mérföldkő az üzenetek (MVT, CPM, LDM, UCM, PST, PTM) fogadása és tárolása; ehhez tervezési döntések kellenek.
