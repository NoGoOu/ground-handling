# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 30. · CLAUDE.md verzió: 31*

## Mi készült el

- **9. mérföldkő, 3. lépés:** beosztás és hiány (`lib/staffing/roster.ts`).
  - Ügynökönként a rendelkezésre állás: az operatív részek, levonva a nem operatív részek blokkjait (az utazási idő az operatív részbe is belenyúlhat).
  - A sáv beosztása a sávon belüli legkisebb létszám: aki a sávnak csak egy részében van bent, nem számít.
  - Hiány és többlet: beosztás − összesített igény, sávonként.
  - Tesztek: részben lefedett sáv, blokk a sáv közepén, utazási idős blokk, váltás réssel és rés nélkül, éjfélen átnyúló műszak, beosztás nélküli nap.
- 2. lépés (`8fda5cb`): a nap sávjai óraátállítással, a sáv csúcsa feladattípusonként és összesen.
- 1. lépés (a 8. mérföldkő utómunkája, `4ffa147`, `24bf6f3`): késéskód-dokumentum légitársaságonként.

## Állapot

- Utolsó commit: `feat: set the roster against the staffing demand` (ez a commit; előtte `8fda5cb`)
- Tesztek: `npm test` → 652 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: a sávos nézet blokk-szabálya közös függvénybe került (`blockWindow`, `castsBlock`), hogy a létszámigény ugyanazt használja.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 4. lépés: adatréteg (a nappal átfedő ablakok, a valós réteg műszakjai és blokkjai) és a „Létszámigény megtekintése” jogosultság.
