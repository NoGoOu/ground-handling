# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 30. · CLAUDE.md verzió: 31*

## Mi készült el

- **9. mérföldkő, 5. lépés:** napi nézet – új `Létszámigény` oldal (`/staffing`, a menüben is), napválasztóval.
  - Lépcsős grafikon (saját SVG, külső könyvtár nélkül): az összesített igény területként, a feladattípusok vonalai, a beosztás szaggatott vonala, a hiányos sávok pirossal, a hiány mértéke kitöltve.
  - Fölötte a napi csúcs és az ideje, a legnagyobb hiány és a hiányos sávok száma; alatta táblázat sávonként: idő, igény feladattípusonként és összesen, beosztás, hiány vagy többlet.
  - Valós beosztás nélküli napon az igény látszik, hiány nem jelölődik, és erről üzenet szól; óraátállítás napján a 92, illetve 100 sáv jelenik meg.
- 4. lépés (`8602a2d`): adatréteg és jogosultság. 3. lépés (`2def19f`): beosztás és hiány. 2. lépés (`8fda5cb`): sávok és igény. 1. lépés (`4ffa147`, `24bf6f3`): késéskód-dokumentum.

## Állapot

- Utolsó commit: `feat: show the staffing demand of a day` (ez a commit; előtte `8602a2d`)
- Tesztek: `npm test` → 670 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres, figyelmeztetés nélkül
- A nézetet a demo nap adataival statikusan renderelve néztem meg (grafikon és táblázat); bejelentkezve nem, mert jelszót nem írok be.

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: a feladattípusok vonalai csak ott látszanak, ahol van igényük, és egymáshoz képest kissé eltolva, hogy az azonos értékek ne takarják egymást. A tárhely útvonalánál megszűnt egy build-figyelmeztetés (a feltöltött fájlok futásidejű adatok, nem a build részei).

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. lépés: többnapos áttekintés – legfeljebb 31 nap, nap × sáv táblázat színezve, naponként a csúcs és a legnagyobb hiány.
