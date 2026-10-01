# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 33*

## Mi készült el

- **A 9. mérföldkő utómunkája, első fele:** a tervezet a létszámigényben – számítás és adatréteg.
  - A publikált napon a beosztás a valós rétegből jön, a még nem publikált napon a tervezetből; ugyanazzal a számítással, a hiány és a többlet ugyanúgy jelölődik.
  - Egy műszak a kezdőnapja szerinti rétegből számít, így az éjfélen átnyúló műszak a publikált és a nem publikált nap határán is jól számol. A nem publikált napon felvitt valós műszak és a publikált napon felvitt tervezet nem számít.
  - A tervezetet csak az tölti be, aki láthatja („Beosztás tervezése”); a többieknek a nem publikált napon csak az igény látszik, akkor is, ha arra a napra valós műszak van.
  - Ha a nap saját rétegében nincs semmi (pl. még nincs tervezet), hiány nem jelölődik, akkor sem, ha az előző napról átnyúló műszak beleér.
  - Tesztek (`lib/staffing/layers.test.ts`) a felsorolt esetekre; adatbázison is ellenőrizve (a demo napot ideiglenesen nem publikálttá téve: a tervezetből számolt hiány a tervezőnek látszik, a műszakvezetőnek csak az igény).

## Állapot

- Utolsó commit: `feat: set the draft against the staffing demand of unpublished days` (ez a commit; előtte `a913a66`)
- Tesztek: `npm test` → 698 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- Nincs. A jóváhagyott döntések: a műszak a kezdőnapja szerinti rétegből számít; a nem odaillő réteg műszakjai nem számítanak; jogosultság nélkül a nem publikált napon csak az igény látszik; tervezet nélküli nem publikált napon nincs hiányjelölés; a seed nem változik.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- Az utómunka második fele: a „tervezet” jelölés a napi nézetben és az áttekintésben, README, STATUS.md.
