# Állapot – Ground Handling App

*Frissítve: 2026. október 5. · CLAUDE.md verzió: 44*

## Mi készült el

- **13. mérföldkő utómunkája, 3–4. pont:** lemezfigyelés és a README szerverigénye.
  - **Admin oldal, „Üzemeltetés” kártya:**
    - a feltöltött fájlok lemezének foglaltsága és szabad helye; élesben a mentések lemezéé is, ha az másik lemez;
    - a mentések mérete: adatbázis-csomagok és fájltár;
    - 80% fölött (helyőrző) piros figyelmeztetés teendővel.
  - **`/api/health`:** `disk: { status: ok | warning, usedPercent }` a legfoglaltabb figyelt lemezről. Ettől nem ad 503-at, és az alkalmazás nem indul újra.
  - **README:**
    - induláshoz 2 vCPU, 4 GB memória és 40 GB lemez, mellé swap;
    - a lemez figyelése az „Állapotfigyelés” részben, a hibaelhárítási táblában is.
  - **Tesztek:** a foglaltság és a 80%-os határ (80% még nem, 81% már figyelmeztet), a könyvtárméret, a méret kiírása GB-ig.
  - **Helyben, az éles összeállításon:**
    - az állapotvégpont `disk: ok, 59%`;
    - az admin kártyán a verzió, a legutóbbi mentés, a mentések mérete és a két lemez. Docker Desktopon a kötet és a bekötött mentési könyvtár valóban két külön lemez.
- 2. pont (`7d1a681`): növekményes fájlmentés. 1. pont (`7501c48`): képek kicsinyítése.

## Állapot

- Utolsó commit: `feat: watch the disk on the admin page and the health endpoint` (ez a commit; előtte `7d1a681`)
- Tesztek: `npm test` → 843 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- Utómunka, 5. pont: terhelési próba (próbaadatok, terhelő szkript), mérés és az eredmény a README-ben.
