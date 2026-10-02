# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 41*

## Mi készült el

- **13. mérföldkő, 2. lépés:** éles Compose-fájl Caddyvel.
  - `docker-compose.prod.yml` (külön Compose-projekt, a demótól független kötetekkel): adatbázis, alkalmazás, Caddy. Kifelé csak a 80-as és a 443-as port látszik; az adatbázis és az alkalmazás nincs kiengedve.
  - `docker/Caddyfile`: automatikus Let's Encrypt-tanúsítvány a `DOMAIN`-re, a HTTP átirányít HTTPS-re, HSTS (1 év), `nosniff`, `Referrer-Policy`, `X-Frame-Options`, a `Server` fejléc nélkül. `DOMAIN=localhost`-tal helyi tanúsítvány, így a gépen is kipróbálható.
  - Éles módban csak biztonságos (`__Secure-`, `__Host-`) sütik.
  - Naplóforgatás minden szolgáltatásnál: legfeljebb 5 × 10 MB.
  - `/api/health`: adatbázis, a feltöltési könyvtár írhatósága, verzió (commit és építési idő, az image-be építve); belépés nélkül, érzékeny adat nélkül; hibánál 503.
  - Docker-állapotfigyelés (jóváhagyott 2. döntés): a healthcheck-szkript 3 egymást követő hiba után leállítja az alkalmazást, és a `restart: unless-stopped` újraindítja.
  - Az adatbázis jelszava csak URL-ben escape-elés nélkül használható karakterekből állhat (a `DATABASE_URL` része); az indítás ezt is ellenőrzi.
  - Helyben kipróbálva (`DOMAIN=localhost`): a beállítások rendben, a 22 migráció lefut, seed nincs; `/api/health` 200 a verzióval; a `http://` 308-cal HTTPS-re irányít; a fejlécek és a Secure sütik megvannak; az első admin létrejött, demo adat nincs; a seed a konténerben is elutasít. Leállított adatbázisnál az állapot 503, az alkalmazás a harmadik hiba után újraindul, az adatbázis visszatérése után magától helyreáll.
- 1. lépés (`8df7a26`): éles mód.

## Állapot

- Utolsó commit: `feat: run production behind Caddy with HTTPS and health checks` (ez a commit; előtte `8df7a26`)
- Tesztek: `npm test` → 822 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 3. lépés: a belépési kísérletek és a nyilvános végpontok korlátozása, naplózással; tesztek.
