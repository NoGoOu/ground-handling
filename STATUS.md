# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 41*

## Mi készült el

- **13. mérföldkő, 4. lépés:** mentés és visszaállítás.
  - `backup` szolgáltatás az éles Compose-ban (`postgres:17-alpine`, Budapest-idővel): naponta `BACKUP_TIME`-kor (helyőrző: 03:30) egy csomag a szerver `./backups` könyvtárába: `backup-ÉÉÉÉHHNN-ÓÓPPMM.tar.gz`, benne `pg_dump` (egyedi formátum), a feltöltött fájlok és egy leírás (idő, fajta, utolsó migráció). A csomag csak elkészülte után kapja a végleges nevét. A `BACKUP_KEEP_DAYS`-nél (helyőrző: 14) régebbiek törlődnek. A szerver crontabja nem kell.
  - `ops/backup.sh`: kézi mentés. `ops/restore.sh <mentés>`: megerősítést kér (be kell írni: VISSZAÁLLÍT), előtte a mostani állapotról is mentést készít, leállítja az alkalmazást, az adatbázist teljesen újra létrehozza a mentésből, a feltöltött fájlokat kicseréli, majd elindítja az alkalmazást, és megvárja, hogy egészséges legyen. `ops/restore-test.sh [mentés]`: próba-visszaállítás egy ideiglenes, üres adatbázisba, kiírja a tartalmát (táblák, utolsó migráció, felhasználók és aktív admin, járatok, taskok, műszakok, képzési rekordok, eszközök, hibajegyek, fájlok); az éleshez nem nyúl.
  - Admin oldal (beállításkezelési jogosultsággal): „Üzemeltetés” kártya a legutóbbi sikeres mentés idejével, nevével és méretével; 2 napnál régebbi (helyőrző) vagy hiányzó mentésnél piros figyelmeztetés; az alkalmazás csak olvasásra látja a mentési könyvtárat.
  - Helyben, az éles összeállításon kipróbálva: kézi mentés (a 20 napos régi mentést törölte); próbaadat törlése, majd visszaállítás (rossz megerősítésnél semmi sem változik; utána a törölt felhasználó és fájl visszajött, az alkalmazás egészséges); próba-visszaállítás; az ütemezett mentés a beállított percben lefutott; az admin kártya a legutóbbi mentést mutatja.
  - Tesztek: a mentés állapota (friss, régi, nincs), csak a kész csomagok listázása, a méret kiírása.
- 3. (`0defd69`) korlátozások; 2. (`483828a`) éles Compose Caddyvel; 1. (`8df7a26`) éles mód.

## Állapot

- Utolsó commit: `feat: back up and restore the production server` (ez a commit; előtte `0defd69`)
- Tesztek: `npm test` → 836 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs. Megvalósításban: visszaállítás előtt a mostani állapotról is mentés készül.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 5. lépés: frissítési szkript állapotellenőrzéssel; a verzió az admin oldalon.
