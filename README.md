# Ground Handling App

Nyílt forráskódú webalkalmazás repülőtéri földi kiszolgálás (ground handling) szervezésére. Minden járatfordulóhoz egy task tartozik, benne légitársaságonként testreszabható mérföldkövekkel, tervezett és tényleges időpontokkal. A részletes leírás és az üzleti szabályok: [CLAUDE.md](CLAUDE.md).

## Mit tud

**1. mérföldkő – napi munka**

- **Napi járatlista** (műszakvezető): a nap járatai STA szerint, várható és tényleges időkkel, forduló típusával (gyors / hosszú), státusszal, késéssel és ügynök-kiosztással.
- **Járat létrehozása és szerkesztése**: a task automatikusan létrejön.
- **Task nézet**: mérföldkövenként tervezett és tényleges idő, színezett eltérés, „Most” gomb és kézi időmegadás, ki rögzítette és ki módosította, sorrend-figyelmeztetés, státuszváltás. Az ATA és az ATD sorában a rendszerből kapott érték és az ügynök saját rögzítése egymás mellett látszik.
- **Ügynök nézet**: a saját taskok telefonra optimalizálva.
- **Admin**: felhasználók, légitársaságok, sablonok és mérföldkövek szerkesztése, valamint a globális beállítások (az eltérés színküszöbei, alapérték 0 és 5 perc).

**2. mérföldkő – műszakbeosztás és sávos nézet**

- **Műszakbeosztás** (műszakvezető és admin): ügynökönként szabadon megadott kezdés és vég, opcionális megjegyzéssel. A műszak átnyúlhat éjfélen, és ugyanannak az ügynöknek nem lehet két átfedő műszakja.
- **Sávos nézet**: ügynökönként egy sáv a műszak kiemelésével, a taskok a foglaltsági ablakaik szerinti dobozokkal (hosszú fordulónál kettő, gyorsnál egy), felül a „Kiosztatlan” sáv, és mozgó vonal a mostani időnél.
- **Kiosztás húzással**: a doboz ráhúzása egy sávra hozzárendeli az adott részt, a „Kiosztatlan” sávra húzva törli. Ütközéskor – ha két foglaltsági ablak átfed, vagy a task kilóg a műszakból – a rendszer figyelmeztet, de menti, és a dobozt piros szegéllyel jelöli.

## Indítás Docker Compose-zal

Követelmény: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) vagy Docker Engine Compose-zal (Linux).

```bash
docker compose up --build
```

Utána nyisd meg: <http://localhost:3000>

Az első indításkor a konténer létrehozza az adatbázis-táblákat, és betölti a demo adatokat (a járatok az indítás napjára kerülnek). A későbbi indítások a meglévő adatokat megtartják.

### Demo felhasználók

Mindegyik jelszava: `demo1234`

| Felhasználónév | Név | Szerepkör |
|---|---|---|
| `admin` | Admin Adél | Admin |
| `vezeto` | Vezető Viktor | Műszakvezető |
| `ugynok1` | Kiss Péter | Ügynök |
| `ugynok2` | Nagy Eszter | Ügynök |

### Hasznos parancsok

```bash
# Leállítás (az adatok megmaradnak)
docker compose down

# Demo adatok újratöltése a mai napra – FIGYELEM: minden adatot töröl!
docker compose exec app npx tsx prisma/seed.ts

# Minden adat törlése (adatbázis-kötettel együtt)
docker compose down -v
```

### Éles használat előtt

- Állíts be saját titkos kulcsot a munkamenetekhez: `AUTH_SECRET=<hosszú véletlen szöveg> docker compose up -d` (generálás: `npx auth secret` vagy `openssl rand -base64 32`).
- Cseréld le az adatbázis jelszavát a `docker-compose.yml`-ben.
- Változtasd meg vagy inaktiváld a demo felhasználókat.

## Fejlesztés

Követelmény: Node.js 24 és Docker (az adatbázishoz).

```bash
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
npm run db:up               # csak a PostgreSQL konténer
npx prisma migrate deploy   # táblák létrehozása
npm run db:seed             # demo adatok (minden adatot töröl!)
npm run dev                 # http://localhost:3000
```

Ha a Docker nem elérhető, a Prisma saját helyi Postgrese is megfelel fejlesztéshez: az `npx prisma dev --detach` kiírja a `postgres://…` kapcsolati címet, ezt írd a `.env` `DATABASE_URL` sorába, és folytasd a `npx prisma migrate deploy` lépéssel.

| Parancs | Mire való |
|---|---|
| `npm test` | Unit tesztek (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` | Éles build |
| `npm run db:migrate` | Új migráció a séma módosítása után |
| `npm run db:studio` | Prisma Studio az adatok böngészéséhez |

## Felépítés

| Hely | Tartalom |
|---|---|
| `lib/turnaround.ts` | Időszámítási és foglaltsági szabályok, tiszta függvények tesztekkel |
| `lib/board.ts` | A sávos nézet modellje: dobozok, sávok, ütközésvizsgálat |
| `lib/permissions.ts` | Jogosultsági szabályok (a proxy, az oldalak és minden szerverművelet ezt használja) |
| `lib/time.ts` | Átváltás UTC és Europe/Budapest között |
| `lib/messages/hu.ts` | A felület összes magyar szövege |
| `lib/validation/` | Űrlapok ellenőrzése (zod) |
| `app/` | Oldalak és szerverműveletek (Next.js App Router) |
| `prisma/` | Adatbázisséma, migrációk, demo adatok |
| `proxy.ts` | Útvonalszintű belépés- és szerepkör-ellenőrzés |

Minden időpontot UTC-ben tárolunk, a felületen Europe/Budapest idő szerint jelenik meg.

Technológia: Next.js 16 (App Router), TypeScript, PostgreSQL 17, Prisma 7, Auth.js v5, Tailwind CSS 4, Vitest.
