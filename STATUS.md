# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 41*

## Mi készült el

- **13. mérföldkő, 3. lépés:** korlátozások.
  - Belépés: minden kísérlet naplózódik (`LoginAttempt`: felhasználónév, IP, eredmény, idő; 30 napig, helyőrző). 15 percen belül felhasználónévenként 5, IP-nként 20 sikertelen kísérlet után zárolás (jóváhagyott 1. döntés, helyőrzők); a nem létező név ugyanúgy számít, így nem derül ki, létezik-e. A felhasználónév számlálója sikeres belépéskor nullázódik; a zárolás alatti kísérletek nem hosszabbítják meg. A korlát az Auth.js `authorize`-ban van, így a közvetlen `/api/auth` hívásra is érvényes. Az űrlapon: „Túl sok sikertelen belépési kísérlet. Próbáld újra 15 perc múlva.” A zárolás a szervernaplóba is kerül. Az IP a Caddy `X-Forwarded-For` fejlécéből jön.
  - Nyilvános végpontok (memóriabeli csúszóablak, helyőrzők): a fogadó API kulcsonként 60 kérés/perc, rossz kulccsal IP-nként 20/perc; a naptárlink linkenként 60/óra, rossz kulccsal IP-nként 30/perc. Túllépéskor 429 és `Retry-After`; a fogadó API-nál a hívásnaplóba is.
  - Tiszta függvények tesztekkel: a zárolás (5. kísérlet, más IP-ről is, ablakon kívüli, sikeres belépés utáni, zárolt kísérletek, közös reptéri IP), a csúszóablak (várakozási idő, kulcsonként, korlátos memória), az IP és a zárolási kód.
  - Élő szerveren ellenőrizve: nem létező névvel az 5 hibás kísérlet után a 6. `locked-15`; ugyanarról az IP-ről más név nem zárolt; a belépő űrlap kiírja az üzenetet; a fogadó API a 21. rossz kulcsnál 429 (`Retry-After: 58`), más IP-ről nem; a naptárlink a 31. rossz kulcsnál, illetve a 61. lekérésnél 429.
- 2. (`483828a`) éles Compose Caddyvel; 1. (`8df7a26`) éles mód.

## Állapot

- Utolsó commit: `feat: limit sign-in attempts and public endpoint requests` (ez a commit; előtte `483828a`)
- Tesztek: `npm test` → 833 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 4. lépés: mentés (napi és kézi) és visszaállítás szkriptekkel, megőrzési idővel; a legutóbbi mentés az admin oldalon; próba-visszaállítás.
