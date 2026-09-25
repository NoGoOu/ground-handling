# Ground Handling App

Nyílt forráskódú webalkalmazás repülőtéri földi kiszolgálás (ground handling) szervezésére. Minden járatfordulóhoz egy task tartozik, benne légitársaságonként testreszabható mérföldkövekkel, tervezett és tényleges időpontokkal. A részletes leírás és az üzleti szabályok: [CLAUDE.md](CLAUDE.md).

## Mit tud

**1. mérföldkő – napi munka**

- **Napi járatlista** (műszakvezető): a nap járatai a hatályos idők szerint (azon a napon, amelyre az érkezés vagy a hatályos indulás esik; a napokat késő járat a tényleges napján), érkezés szerint rendezve, várható és tényleges időkkel, forduló típusával (gyors / hosszú), státusszal, késéssel és ügynök-kiosztással.
- **Járat létrehozása és szerkesztése**: a task automatikusan létrejön.
- **Task nézet**: mérföldkövenként tervezett és tényleges idő, színezett eltérés, „Most” gomb és kézi időmegadás, ki rögzítette és ki módosította, sorrend-figyelmeztetés, státuszváltás. Az ATA és az ATD sorában a rendszerből kapott érték és az ügynök saját rögzítése egymás mellett látszik.
- **Ügynök nézet**: a saját taskok telefonra optimalizálva.
- **Admin**: felhasználók, légitársaságok, sablonok és mérföldkövek szerkesztése, valamint a globális beállítások (az eltérés színküszöbei, alapérték 0 és 5 perc).

**2. mérföldkő – jogosultságok, beosztás és sávos nézet**

- **Konfigurálható jogosultságok** (admin): szerepkör × jogosultság táblázat pipákkal és hatókörrel (saját / csapat / összes), új szerepkör létrehozása, csapatok vezetővel. Egy felhasználónak több szerepköre és egyéni jogosultsága is lehet; az adatlapján a tényleges jogosultságai látszanak, mindegyiknél a forrásával. Az alapértelmezett szerepkörök: Admin (beépített, zárolt), Tervező, Műszakvezető, Ügynök.
- **Beosztás három rétegben** (`Műszakok` menü): név × nap heti táblázat, cellánként a publikált és a valós műszakkal; ahol a kettő eltér, a cella kiemelt. A cellára kattintva a műszak részei rétegenként látszanak és szerkeszthetők.
  - *Tervezet*: csak a tervező és az admin látja és szerkeszti.
  - *Publikált*: a tervező egy szabadon választott időszakot publikál; a tervezetek ekkor publikálttá és zárolttá válnak, egy nap csak egyszer publikálható.
  - *Valós*: publikáláskor a publikált másolataként jön létre; a tervező és a műszakvezető módosítja.
- **Műszakrészek és résztípusok**: egy műszak több részből áll (kezdet, vég, típus, helyszín, leírás). A résztípusokat a tervező kezeli, és mindegyiknél jelöli, hogy operatív-e. Egy nem operatív rész (pl. oktatás) blokként jelenhet meg a kiosztásban, oda- és visszautazási idővel kiszélesítve.
- **Sávos nézet**: ügynökönként egy sáv a valós beosztás operatív részeinek kiemelésével és a blokkok mintázott dobozaival; a taskok a foglaltsági ablakaik szerinti dobozok (hosszú fordulónál kettő, gyorsnál egy), felül a „Kiosztatlan” sáv, és mozgó vonal a mostani időnél.
- **Kiosztás húzással**: a doboz ráhúzása egy sávra hozzárendeli az adott részt, a „Kiosztatlan” sávra húzva törli. Ütközéskor a rendszer figyelmeztet, de menti, és a dobozt piros szegéllyel jelöli. Ütközés: két foglaltsági ablak átfed ugyanannál az ügynöknél; egy ablak átfed egy blokkal; egy ablak nem esik teljesen az ügynök operatív részeibe.
- **Ügynök nézet**: a taskok között időrendben a saját blokkok is megjelennek (típus, idő, utazással számolt idő, helyszín, leírás).
- **Csak érkező és csak induló járat**: a járat érkezési és indulási része külön-külön elhagyható (legalább az egyik kell). Csak érkező járatnál a gép itt marad, csak indulónál már itt van; ilyenkor csak a meglévő rész mérföldkövei, ügynöke és foglaltsági ablaka létezik, forduló típus nincs. Már rögzített vagy a rendszerből kapott idővel rendelkező rész nem hagyható el.
- **Késés és törlés**: a járat szerkesztő oldalán külön „Késés rögzítése” művelet ad új ETA-t és/vagy ETD-t, a forrás megjegyzésével; a járat ugyanaz marad, mindig a legutóbbi érték számít, és mellette látszik a forrása, rögzítője és ideje (az ETA/ETD csak így módosítható). Ha a hatályos érkezés vagy indulás több mint a sárga eltérés-küszöbbel későbbi a menetrendinél, a járat mindenhol „Késik” címkét kap az eredeti menetrendi nappal és idővel. Az érkezési és az indulási rész külön töröltre állítható és visszaállítható: a törölt rész áthúzva látszik, kimarad a foglaltságból, a sávos nézetből és az ütközésből, a kiosztás megmarad. Minden késés, törlés és visszaállítás a járat naplójába kerül.

**3. mérföldkő – járatrend-import**

- **Fájlfeltöltés** (`Járatrend-import` menü, „Járatrend importálása” jogosultsággal: Admin és Tervező): CSV, JSON, XLSX vagy XLS, legfeljebb 25 MB. A munkalap és a fejlécsor kiválasztható, a munkalap első sorai látszanak.
- **Oszlop-párosítás**: mezőnként a fájl egy oszlopa (a rendszer a fejlécekből javasol), UTC vagy budapesti idő, a dátum jöhet időszakból napmintával, dátumoszlopból vagy az időcellából. Élő előnézet mutatja, mi lesz az első sorokból. A párosítás profilként menthető; azonos fejlécű fájlnál a rendszer felajánlja.
- **Próbafuttatás**: semmit nem ír. Csak a BUD-ot érintő sorokat veszi, fordulókat képez (az érkezés a következő járat első, utána induló példányával párosul), a többi csak érkező, illetve csak induló járat lesz. Összesíti az új, változott, változatlan, hibás és hiányzó járatokat, soronként indoklással.
- **Mentés**: csak a menetrendi mezőket írja. A járat azonosítója a légitársaság, a járatszám, az üzemnap és az állomás, így újraimportálásnál nincs duplikáció; az ETA/ETD, ATA/ATD, a késés, a törlés és a kiosztás érintetlen marad. Kézzel felvett járatot járatszám és nap szerint megtalál és frissít. Az importok naplózva vannak.
- **Hiányzó járatok**: ha egy korábban ugyanazzal a profillal importált járat nincs az új fájlban, „Az utolsó importból hiányzik” jelölést kap a napi listán, a task és a járat oldalán. Nem törlődik: a tervező az import oldalon törli a jelölést, vagy a műszakvezető töröltre állítja a járatot.
- **Összevonás**: ha az új fájl két korábbi egyoldalú járatból (csak érkező és csak induló) fordulót képez, a kettő összevonódik, és a kikerülő járat törlődik, ha az importból jött, és nincs rajta üzemi adat. Különben „párosítás változott”, a tervező dönt.

**4. mérföldkő – tervezői nézet, automatikus kiosztással**

- **Számolás** (`Tervezés` menü, „Tervezés” jogosultsággal: Admin és Tervező): a tervező egy legfeljebb 31 napos időszakot választ, a program naponként névtelen pozíciókat számol a járatok foglaltsági ablakaiból (gyors fordulónál egy, hosszúnál két ablak, a törölt rész kimarad; egy nap feladatai az azon a napon kezdődő ablakok). Jogosítások nélkül, külső AI nélkül.
- **Algoritmus** (`lib/planning/`, determinisztikus): 1. időrendben minden ablak egy olyan meglévő pozícióba kerül, ahol a szabályok teljesülnek, új pozíció csak akkor nyílik, ha ilyen nincs (korlátok nélkül ez a legnagyobb egyidejű átfedés); 2. kiegyenlítés áthelyezéssel és cserével a minimum + megengedett létszámtöbblet pozíción belül; 3. döntetlennél a kevesebb munkaidő, majd a kevesebb üresjárat.
- **Szabályok** (`Tervezés → Tervezési beállítások`): minimális és maximális műszakhossz, szünet a küszöb fölött (a jelölt szünet a műszak közepéhez legközelebbi elég hosszú rés), pihenőidő vagy megengedett átfedés két task között, létszámtöbblet, a mentett műszak résztípusa. A terv napja lemásolja őket.
- **Áttekintés**: napváltó, mutatók (pozíciószám, munkaidő, üresjárat, a terhelés minimuma, maximuma, különbsége, pozíciónként foglaltság és műszakhossz), sávos nézet pozíciónként a műszakkal és a szünettel. A taskok áthúzhatók másik vagy új pozícióba; ha ez megsért egy szabályt, a rendszer figyelmeztet, de engedi. Az újraszámolás (a nap vagy a teljes terv) megerősítést kér, mert felülírja a kézi módosításokat és a neveket. Ha a nap járatai a számolás óta változtak (import, késés, törlés), a terv „Elavult” jelzést kap.
- **Nevek és tervezet**: pozíciónként egy ügynök, majd „Mentés a tervezetbe”: pozíciónként egy műszak a beosztás tervezetében, egyetlen operatív résszel. Publikált napra nem ír; ha egy műszak átfedne az ügynök egy meglévő tervezet-műszakjával, semmi nem íródik. Az újramentés a terv korábbi, még tervezetben lévő műszakjait cseréli.
- **Kiosztás átvétele** (task-kiosztási jogosultsággal, alapból Műszakvezető): a terv szerinti ügynök a nap taskjainak csak a még kiosztatlan részeire kerül; a már kiosztottakat kihagyja és listázza, gyors fordulónál mindkét rész ugyanahhoz az ügynökhöz kerül. A szokásos ütközés-figyelmeztetések jelennek meg.

**5. mérföldkő – feladattípusok (több task járatonként)**

- **Feladattípus** (`Admin → Feladattípusok`): a járaton végzett munka fajtája névvel és rövid kóddal (pl. GOU, HDS). Egy járathoz feladattípusonként egy task tartozik; ezeket különböző emberek végzik, saját sablonnal és időablakkal.
- **A légitársaság feladattípusai** (`Admin → Légitársaságok és sablonok`): típusonként a használt sablon, aktív jelölés és egy elsődleges típus. Az új járatok (kézzel és importtal is) minden aktív típushoz kapnak egy taskot; a beállítás későbbi módosítása csak az új járatokat érinti.
- **Egy- és kétrészes sablon:** a sablon feladattípushoz tartozik, és állhat érkezési részből, indulási részből vagy mindkettőből; az ATA az érkezési, az ATD az indulási résszel kötelező. A task részei a sablonja és a járata közös részei, a horgonyok a járatból számolnak.
- **Elsődleges task:** ha a külső rendszerből nincs ATA/ATD, az elsődleges task rögzítése a járat értéke; a többi task ATA/ATD sora ezt mutatja, a saját rögzítés ott nem hatályos.
- **Megjelenítés:** a napi listán járatonként a taskok típussal, ügynökkel és státusszal (a nap és a sorrend az elsődleges task szerint); a task és az ügynök nézetben a feladattípus; a sávos nézet és a terv dobozain a feladattípus kódja.
- **Különböző emberek:** ha ugyanaz az ember ugyanazon a járaton két feladattípust kapna, a kiosztás és a sávos nézet figyelmeztet (de ment). A tervező ugyanannak a járatnak két különböző taskját nem teszi egy pozícióba.
- **Migráció:** a korábbi adatok az „Alap” feladattípus alá kerültek, a viselkedésük nem változott.

## Indítás Docker Compose-zal

Követelmény: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS) vagy Docker Engine Compose-zal (Linux).

```bash
docker compose up --build
```

Utána nyisd meg: <http://localhost:3000>

Az első indításkor a konténer létrehozza az adatbázis-táblákat, és betölti a demo adatokat (a járatok az indítás napjára kerülnek). A későbbi indítások a meglévő adatokat megtartják.

### Demo felhasználók

Mindegyik jelszava: `demo1234`

A demo légitársaságnak két feladattípusa van: az elsődleges „Alap” (a demo sablonnal) és egy „Helyőrző” (HLY, csak indulási részből álló helyőrző sablonnal), így minden demo járatnak két taskja van. A csak érkező járat helyőrző taskjának nincs teendője. A valós GOU- és HDS-sablonokat a projekt gazdája adja meg.

A demo beosztás a betöltés napjára és a következő napra publikált és valós réteget tartalmaz: Nagy Eszter reggelén egy oktatás blokk van 20–20 perc utazási idővel, a második napon pedig a valós műszakja eltér a publikálttól.

| Felhasználónév | Név | Szerepkör |
|---|---|---|
| `admin` | Admin Adél | Admin |
| `vezeto` | Vezető Viktor | Műszakvezető (a demo csapat vezetője) |
| `tervezo` | Tervező Tamás | Tervező |
| `ugynok1` | Kiss Péter | Ügynök |
| `ugynok2` | Nagy Eszter | Ügynök |

### A járatrend-import kipróbálása

A mintafájl: [`tests/fixtures/schedule/ryanair-netline-bud-sample.xlsx`](tests/fixtures/schedule/ryanair-netline-bud-sample.xlsx) (Ryanair NetLine-export, 2024. szeptember – 2025. január; a sorok várt eredménye: [`docs/schedule-import.md`](docs/schedule-import.md)).

A seed felveszi a Ryanairt (`FR`, a demo sablon másolatával mint alapértelmezett sablonnal) és a „Ryanair NetLine” párosítási profilt, így a próbához nem kell semmit beállítani.

1. A `Járatrend-import` oldalon (`admin` vagy `tervezo`) töltsd fel a fájlt. A rendszer felajánlja a „Ryanair NetLine” profilt, és betölti a párosítást (munkalap: `Template_Auto_Export(netline)`, fejlécsor: 1., UTC idők).
2. Próbafuttatás: 50 új járat (27 forduló, 1 csak érkező, 22 csak induló), 2 kiszűrt, nem BUD-os sor. Utána mentés.
3. A járatok a napi listán a 2024. 09. 10-i naptól látszanak.

### A tervezői nézet kipróbálása

1. Végezd el az importpróbát (fent), hogy legyenek járatok a 2024. szeptember 10-i héten.
2. `tervezo`-ként a `Tervezés` menüben készíts tervet 2024-09-10 és 2024-09-16 között. A 09. 10-i napon két pozíció látszik a mutatókkal; egy task áthúzható másik vagy új pozícióba.
3. Adj neveket a pozícióknak, majd „Mentés a tervezetbe”. A `Műszakok` oldalon a 2024. 09. 10-i héten a tervezetben megjelennek a műszakok.
4. `vezeto`-ként a terv oldalán „A nap kiosztásának átvétele” a még kiosztatlan részekre teszi a neveket; a sávos nézet (2024. 09. 10.) mutatja az eredményt.

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
| `lib/board.ts` | A sávos nézet modellje: dobozok, sávok, blokkok, a háromféle ütközés |
| `lib/roster.ts` | Beosztás-segédfüggvények: publikált napok, a publikált és a valós réteg eltérései |
| `lib/task-types.ts` | Feladattípusok: egy új járat taskjai a légitársaság aktív feladattípusai szerint, és ugyanannak az embernek két feladattípusa egy járaton |
| `lib/planning/` | Tervezés: bemenet (napi ablakok), a pozíció szabályai, minimális pozíciószám, kiegyenlítés és mutatók, a terv nézete, mentés a tervezetbe, kiosztás átvétele; tiszta függvények tesztekkel |
| `lib/import/` | Járatrend-import: fájlbeolvasás, átalakítások, oszlop-párosítás, fordulók képzése, összevetés a meglévő járatokkal; tiszta függvények, tesztek a mintafájllal |
| `lib/permissions/` | A jogosultságok katalógusa és a jogosultsági szabályok (a proxy, az oldalak és minden szerverművelet ezt használja) |
| `lib/time.ts` | Átváltás UTC és Europe/Budapest között |
| `lib/messages/hu.ts` | A felület összes magyar szövege |
| `lib/validation/` | Űrlapok ellenőrzése (zod) |
| `app/` | Oldalak és szerverműveletek (Next.js App Router) |
| `prisma/` | Adatbázisséma, migrációk, demo adatok |
| `proxy.ts` | Útvonalszintű belépés- és jogosultság-ellenőrzés |

Minden időpontot UTC-ben tárolunk, a felületen Europe/Budapest idő szerint jelenik meg.

Technológia: Next.js 16 (App Router), TypeScript, PostgreSQL 17, Prisma 7, Auth.js v5, Tailwind CSS 4, Vitest.
