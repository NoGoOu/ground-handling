# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 33*

## Mi készült el

- **A 9. mérföldkő utómunkája kész: a tervezet a létszámigényben.**
- Második fele: a jelölés a nézetekben.
  - Napi nézet: „Tervezet” címke, egy mondat arról, hogy a nap még nincs publikálva és a beosztás a tervezetből számol, pontozott beosztásvonal, „Beosztás (tervezet)” a jelmagyarázatban és a táblázatban. A hiány és a többlet ugyanúgy látszik.
  - Áttekintés: „T” jelölés a tervezetből számoló napok mellett, a jelmagyarázatban is; a ∅ jel buboréka megmondja, miért nincs beosztás (nincs valós, nincs tervezet, vagy még nincs publikálva).
  - Aki a tervezetet nem láthatja, a nem publikált napon „A nap még nincs publikálva: csak az igény látszik.” üzenetet kap; jelölés és beosztásvonal nélkül.
  - README: a tervezet összevetésének leírása és kipróbálása (importpróba → terv → „Mentés a tervezetbe” → `Áttekintés`).
- Első fele (`8479e07`): a számítás és az adatréteg; a műszak a kezdőnapja szerinti rétegből számít; a tervezetet csak az tölti be, aki láthatja.

## Állapot

- Utolsó commit: `feat: mark the days whose roster is the draft` (ez a commit; előtte `8479e07`)
- Tesztek: `npm test` → 700 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Ellenőrizve: a demo napot ideiglenesen nem publikálttá téve, tervezet-műszakokkal, statikusan renderelve a tervező és a műszakvezető nézetét (a tervezőnek a tervezetből számolt hiány „Tervezet”, illetve „T” jelöléssel; a műszakvezetőnek csak az igény), utána a seed visszatöltve. Bejelentkezve nem néztem meg, mert jelszót nem írok be.

## Eltérések a CLAUDE.md-től

- Nincs. A jóváhagyott döntések (felvehetők a szabályok közé): a műszak a kezdőnapja szerinti rétegből számít; a nem publikált napra felvitt valós műszak és a publikált napra felvitt tervezet nem számít; jogosultság nélkül a nem publikált napon csak az igény látszik, akkor is, ha valós műszak van rá; ha a nap saját rétegében nincs műszak, hiány nem jelölődik (az előző napról átnyúló műszak akkor sem teszi hiányossá); a seed nem változott.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- A 10. mérföldkő (oktatás: e-vizsga, OJT, kibocsátás), a szokásos terv-jóváhagyással.
