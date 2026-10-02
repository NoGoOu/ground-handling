# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 41*

## Mi készült el

- **13. mérföldkő, 5. lépés:** frissítés.
  - `ops/update.sh` lépései:
    1. mentés (`before-update`);
    2. `git pull --ff-only`;
    3. építés a commit azonosítójával és dátumával;
    4. újraindítás, a migrációk induláskor lefutnak;
    5. várakozás, amíg az állapotvégpont az új commitot és „ok”-t mutat (legfeljebb 5 perc).
  - Hibánál megáll, és kiírja a naplóparancsot és a visszaállás lépéseit: `git reset --hard <előző>`, újraépítés, és ha a migráció már lefutott, `ops/restore.sh <a frissítés előtti mentés>`.
  - Ha már az új verzió fut, nincs teendő; a `--force` újraépít. Az első indításra is jó, ilyenkor a mentés kimarad.
  - A futó verzió (commit és dátum) az admin oldal „Üzemeltetés” kártyáján és a `/api/health`-en látszik; nem éles építésnél „ismeretlen”.
  - Javítás: az éles Compose `AUTH_URL`-ként átadja az `APP_PUBLIC_URL`-t. Nélküle az Auth.js a Caddy mögött a belső címre (`:3000`) irányított volna belépés után.
  - Helyben kipróbálva:
    - frissítés mentéssel, új verzióval és egészséges állapottal; ismételt futtatásnál „nincs teendő”;
    - szándékosan hibás beállítással megállt, és kiírta a visszaállás lépéseit; utána a helyes beállítással visszaállt;
    - belépés után az átirányítás a nyilvános címre mutat;
    - az admin kártyán látszik a verzió és a legutóbbi mentés.
- 4. (`a4ae87d`) mentés és visszaállítás; 3. (`0defd69`) korlátozások; 2. (`483828a`) éles Compose Caddyvel; 1. (`8df7a26`) éles mód.

## Állapot

- Utolsó commit: `feat: update the production server in one step` (ez a commit; előtte `a4ae87d`)
- Tesztek: `npm test` → 836 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. lépés: README „Éles üzemeltetés” fejezet, STATUS.md.
