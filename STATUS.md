# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 41*

## Mi készült el

- **13. mérföldkő kész** (üzemeltetés, éles telepítés bérelt szerverre), a 6. lépéssel:
  - README „Éles üzemeltetés” fejezet:
    - szerverigény (helyőrző értékek);
    - a VPS előkészítése: Docker, tűzfal a 22-es, 80-as és 443-as portra, swap;
    - DNS, telepítés, a `.env` kitöltése generált titkokkal, első indítás (`ops/update.sh`);
    - az első admin, és mit kell az üres éles adatbázisba felvenni;
    - biztonság, mentés (és másolat a saját gépre `rsync`-kel), visszaállítás (új szerverre is), próba-visszaállítás, frissítés;
    - állapotfigyelés (külső uptime-figyelővel is);
    - hibaelhárítási táblázat, benne a zárolt belépés feloldása és az egyetlen admin elfelejtett jelszava. Ez utóbbit helyben ki is próbáltam.
  - A „Mit tud” részben a 13. mérföldkő; a „Felépítés” táblában a `lib/ops/`, az `ops/` és a `docker/`. A demo „Éles használat előtt” és a „Naptár-feliratkozás” rész az éles összeállításra mutat.
  - Tiszta demo indítás (`docker compose down -v`, `up --build`): 23 migráció, a demo seed lefut (nem éles módban), `/api/health` rendben, a verzió „unknown”.
- Korábbi lépések: 5. (`66f55d5`) frissítés; 4. (`a4ae87d`) mentés és visszaállítás; 3. (`0defd69`) korlátozások; 2. (`483828a`) éles Compose Caddyvel; 1. (`8df7a26`) éles mód.

## Állapot

- Utolsó commit: `docs: describe running the app in production on a rented server` (ez a commit; előtte `66f55d5`)
- Tesztek: `npm test` → 836 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A teljes éles összeállítást helyben próbáltam ki, `DOMAIN=localhost`-tal és a Caddy helyi tanúsítványával: indítás, első admin, korlátok, mentés, visszaállítás, frissítés. Valódi VPS-en és valódi Let's Encrypt-tanúsítvánnyal nem.

## Eltérések a CLAUDE.md-től

- nincs. Megvalósításban: a beteg alkalmazást a healthcheck-szkript állítja le, és a restart-szabály indítja újra (a sima Compose magától nem teszi; jóváhagyott 2. döntés); visszaállítás előtt a mostani állapotról is mentés készül; az éles Compose `AUTH_URL`-ként átadja a nyilvános címet.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- A 13. mérföldkő lezárása a CLAUDE.md-ben (a jóváhagyott döntések szabályként), és a következő mérföldkő terve.
