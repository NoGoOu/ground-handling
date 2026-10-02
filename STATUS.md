# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 41*

## Mi készült el

- **13. mérföldkő, 1. lépés:** éles mód.
  - `APP_ENV=production` esetén az indítószkript a migrációk előtt ellenőrzi a beállításokat (`lib/ops/config.ts`, tiszta függvény): `DOMAIN` (gépnév), `APP_PUBLIC_URL` (https, a gépneve a `DOMAIN`), `AUTH_SECRET` (legalább 32 karakter, nem a demo értéke), `POSTGRES_PASSWORD` (legalább 16 karakter, nem a demo értéke), `DATABASE_URL`, és ha van SMTP, a port és a `SMTP_SECURE` alakja. Hiba esetén nem indul el, és felsorolja a beállítások nevét, az értéküket soha. Migrációs hiba esetén szintén leáll.
  - Éles módban nincs demo adat: az indítás nem tölti be, és a seed kézi futtatását is megtagadja.
  - Első admin: `npx tsx scripts/create-admin.ts` (a konténerben); bekéri a nevet, a felhasználónevet és kétszer a jelszót (gépeléskor nem látszik), a felhasználói űrlap szabályaival; ha már van aktív admin, megtagadja.
  - `.env.production.example`: a beállítások mintája értékek nélkül, magyarázattal és a generálás parancsaival; a `.gitignore` csak a mintákat engedi a repóba.
  - Ellenőrizve: üres, csak migrált adatbázison az első admin létrejön Admin szerepkörrel; eltérő jelszavaknál és második futtatáskor elutasít. Egy friss, migrált adatbázisban a szerepkörök jogosultságai pontosan megegyeznek az alapértelmezettekkel, a „Műszak” és „TRN” résztípus, az „Alap” feladattípus, a tervezési beállítások és a BUD repülőtér megvan.
  - Tesztek: a beállítások ellenőrzése (hiányzó, demo, rövid, nem https, más domain, SMTP), a seed tiltása, az első admin adatai.

## Állapot

- Utolsó commit: `feat: check the production settings and make the first admin by command` (ez a commit; előtte `f203490`)
- Tesztek: `npm test` → 821 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. lépés: éles Compose-fájl Caddyvel (HTTPS, HSTS, csak 80 és 443), naplóforgatás, bővített állapotvégpont és Docker-állapotfigyelés.
