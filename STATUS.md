# Állapot – Ground Handling App

*Frissítve: 2026. október 5. · CLAUDE.md verzió: 44*

## Mi készült el

- **13. mérföldkő utómunkája, 2. pont:** növekményes fájlmentés.
  - **A napi csomag** (`backup-…tar.gz`) az adatbázis teljes mentése, a fájllista (mely feltöltött fájlok voltak meg akkor) és a leírás (`format=2`, a fájlok száma). Továbbra is 14 napig őrződik.
  - **A feltöltött fájlok** egy közös tárba kerülnek (`backups/files`), mindegyik egyszer. Egy feltöltött fájl soha nem változik, mert UUID-nevű. Az állapotvégpont próbafájljai kimaradnak.
  - **A tár takarítása:** a megőrzésen túli csomagok törlése után kikerül minden fájl, amelyet egyik megmaradt csomag listája sem említ.
  - **Visszaállítás:** a kiválasztott nap adatbázisa jön vissza, és pontosan a listáján szereplő fájlok. A régi, minden fájlt tartalmazó csomagok is visszaállíthatók.
  - **Új: a mentés épségének ellenőrzése** (`restore.sh --check`): az `ops/restore.sh` már az alkalmazás leállítása előtt megnézi, hogy a csomag és minden listázott fájl megvan-e; ha nem, el sem indul. Ha a visszaállítás mégis hibát ad, az alkalmazás újraindul.
  - **Javítás:** a szkriptek a konténerekben futó parancsoknak nem adnak bemenetet, így azok nem nyelik el a begépelt megerősítést.
  - **Próba-visszaállítás:** ellenőrzi, hogy a lista minden fájlja megvan-e a tárban.
  - **README:** a mentés új felépítése; az `rsync` a `files` tárral együtt, és csak az újat viszi; új szerverre a teljes `backups` könyvtár kell.
  - **Helyben, az éles összeállításon kipróbálva:**
    - 1. mentés: 3 fájl, mind új a tárban.
    - Egy új fájl és egy törölt fájl után a 2. mentésben csak 1 új fájl került a tárba.
    - Az első mentést 20 naposra állítva a 3. mentés törölte, és a már sehol nem szereplő fájlt is kivette a tárból.
    - A próba-visszaállítás hiánytalan.
    - A visszaállítás után pontosan a lista 3 fájlja volt meg.
    - Egy régi formátumú csomag is visszaállt.
    - Egy hiányzó fájlnál a visszaállítás el sem indult, az alkalmazás futva maradt.
- 1. pont (`7501c48`): képek kicsinyítése.

## Állapot

- Utolsó commit: `feat: back up uploaded files incrementally` (ez a commit; előtte `7501c48`)
- Tesztek: `npm test` → 841 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- Utómunka, 3–4. pont: lemezfigyelés az admin oldalon és az állapotvégponton; a README szerverigénye (4 GB, 40 GB).
