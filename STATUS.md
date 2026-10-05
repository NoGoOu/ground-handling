# Állapot – Ground Handling App

*Frissítve: 2026. október 5. · CLAUDE.md verzió: 44*

## Mi készült el

- **A 13. mérföldkő utómunkája kész**, az 5. ponttal (terhelési próba):
  - **`scripts/loadtest-data.ts create|remove`:**
    - próbaügynököket (`lt-agent-…`) és műszakvezetőket (`lt-lead-…`) hoz létre közös, generált jelszóval, valamint egy próba-légitársaságot (9Z) a mai napra: ügynökönként egy járatot kiosztott taskkal, publikált és valós beosztással;
    - valódi járatok mellett nem fut (`--force` nélkül); a `remove` mindent eltávolít, a belépési naplót is.
  - **`scripts/loadtest.ts`** (Node, külső eszköz nélkül):
    - virtuális felhasználók: 90% ügynök (saját nézet, task, „Most” rögzítés JavaScript nélküli űrlappal, „Beosztásom”) és 10% műszakvezető (napi lista, task), 10–30 mp gondolkodási idővel;
    - lépcsőzetes létszám; lépcsőnként kérés, kérés/mp, p50/p95/p99, hiba;
    - a végén a legnagyobb létszám, ahol p95 ≤ 1 mp és a hiba 1% alatt van, valamint a válaszidő oldalfajtánként.
  - **`ops/loadtest.sh`:** a szerveren egy paranccsal (adatok, terhelés, eltávolítás).
  - **Tesztek:** a sütik, a task-linkek és a „Most” űrlap kiolvasása, a percentilisek, a lépcső értékelése, a lépcsők és a felhasználók kiosztása.
  - **Helyben mérve, az éles összeállításon, fejlesztői laptopon** (i7-7700HQ, 24 GB, Docker Desktop):
    - **300 járatos napon 100** egyidejű felhasználóig teljesül a cél; 200-nál a p95 1,7 mp;
    - **1000 járatos napon csak 10**: a napi járatlista kb. 6 mp, és közben a többi kérés is vár.
    - Az eredmények táblázata a README-ben; a VPS sora élesítés előtt mérendő.
  - A 300 járatos adatokkal előbb egy rövid füstpróba futott: a belépés, az oldalak és a rögzítés hibátlan volt, 13 rögzítés íródott. A próba után az adatbázisban nem maradt próbaadat.
- Korábbi pontok: 3–4. (`9a40c84`) lemezfigyelés és szerverigény; 2. (`7d1a681`) növekményes fájlmentés; 1. (`7501c48`) képek kicsinyítése.

## Állapot

- Utolsó commit: `feat: measure how many users the server takes` (ez a commit; előtte `9a40c84`)
- Tesztek: `npm test` → 851 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- **A mérés szerint a szűk keresztmetszet** (a 15. mérföldkő bemenete): a napi járatlista és az ügynök nézet a nap összes taskját (idővonal, foglaltság) kiszámolja, az ügynök nézet csak utána szűr a sajátjaira. Ez egy folyamatban, CPU-n fut, így egy lassú lista a többi kérést is feltartja. A 15. mérföldkő 2. lépése (a nehéz nézetek adatbetöltése) erre való. Ha korábban kell, előre hozható.

## Következő lépés

- A 14. mérföldkő (több állomás) terve, jóváhagyásra.
