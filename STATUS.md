# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 30. · CLAUDE.md verzió: 31*

## Mi készült el

- **9. mérföldkő, 6. lépés:** többnapos áttekintés (`/staffing/overview`).
  - Időszak kezdő és záró nappal (alapból mától egy hét), előző / következő időszak; 31 napnál hosszabb vagy fordított időszakot az oldal elutasít, nem vág le.
  - Nap × negyedóra táblázat az összesített igénnyel, az időszak legnagyobb igényéhez színezve; a hiányos sávok pirosak; a cellán az idő, az igény, a beosztás és a hiány.
  - Naponként a csúcs és az ideje, a legnagyobb hiány és az ideje; a napra kattintva a napi nézet nyílik. Valós beosztás nélküli napon ∅ jel, hiány nélkül.
  - Óraátállítás: az oszlopok a helyi óra negyedórái; tavasszal a nem létező óra cellái üresek (×), ősszel a kétszer előforduló óra cellája a nagyobb igényt és a nagyobb hiányt mutatja, megjelölve.
- 5. lépés (`945a1cc`): napi nézet. 4. lépés (`8602a2d`): adatréteg és jogosultság. 3. lépés (`2def19f`): beosztás és hiány. 2. lépés (`8fda5cb`): sávok és igény. 1. lépés (`4ffa147`, `24bf6f3`): késéskód-dokumentum.

## Állapot

- Utolsó commit: `feat: show the staffing demand of up to 31 days` (ez a commit; előtte `945a1cc`)
- Tesztek: `npm test` → 682 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Az áttekintést a demo adatokkal és mindkét óraátállítási nappal statikusan renderelve néztem meg; a 96 oszlop a lap szélességébe belefér. Bejelentkezve nem néztem meg; belépés nélkül az oldalak a belépéshez irányítanak.

## Eltérések a CLAUDE.md-től

- Nincs. A jóváhagyott döntések szerint készült (alapidőszak egy hét; óraátállítás az áttekintésben; nap valós beosztás nélkül).

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 7. lépés: seed (teszt arra, hogy a demo napon van hiányos sáv), README, STATUS.md, tiszta Docker-indítás.
