# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 22. 22:07 · CLAUDE.md verzió: 9 (a repóban ez van, 12-es nincs – lásd Eltérések)*

Ezt a fájlt a Claude Code írja minden lépés után, mindig felülírva. A tervezés ebből látja, hol tart a munka.

## Mi készült el

- **1. mérföldkő (MVP): a lépésterv mind a 18 pontja kész**, lépésenként egy-egy commit (21 commit a `main` ágon).
  - 1–3.: alapváz (Next.js 16, TypeScript, Tailwind 4, ESLint, Vitest), `lib/turnaround.ts` időszámítással, forduló-típussal és foglaltsági ablakokkal, unit tesztekkel (köztük a 4. szabály referencia-ellenőrzése: 0, +1, +1, +2, +10, +10, +20, +22, +24, +25).
  - 4–6.: Docker Compose (app + PostgreSQL 17), Prisma 7 séma és migráció, demo seed (4 felhasználó, demo légitársaság a 10 mérföldkövű sablonnal, 4 járat a futtatás napjára: gyors, hosszú, két átfedő, egy rendszer-ATA/ATD-vel).
  - 7–8.: belépés (Auth.js v5, felhasználónév/jelszó), szerepkör-alapú védelem: útvonalszinten `proxy.ts`, objektumszinten minden oldal és minden szerverművelet, tesztelt jogosultsági függvényekkel.
  - 9–11.: napi járatlista, járat létrehozása és szerkesztése (a task automatikusan jön létre), ügynök-kiosztás a listából.
  - 12–14.: task nézet (tervezett / tényleges / eltérés, ATA–ATD sorban a rendszer- és az ügynöki érték egymás mellett), rögzítés „Most” gombbal és kézzel, javítás, státuszváltás, telefonra optimalizált ügynök nézet.
  - 15–17.: admin felületek (felhasználók, légitársaságok, sablonok és mérföldkövek szerkesztése az ATA/ATD védelmével).
  - 18.: README a telepítéssel és a Docker Compose-os indítással.
- **Szándékosan kimaradt** (a CLAUDE.md „Később” szakasza szerint): létszámigény-számítás és nézet, műszakbeosztás, külső rendszerből való ATA/ATD-import, járatinfó mezők, szolgáltatások, késéskód, kimutatások, korrekciós üzenet a külső rendszer felé, többnyelvűség. A foglaltsági ablakok függvénye és tesztje viszont már kész, mert a forduló típusához kell.
- **Nem készült el, mert nem futott le:** a `docker compose up --build` kipróbálása. A Docker Desktop ezen a gépen nem indul el (beragadt `%LOCALAPPDATA%\Docker\run\dockerInference` fájl), ezért a helyi ellenőrzés `npx prisma dev` Postgresen ment. A konténer indítási sorrendjét (migráció → seed csak üres adatbázisnál → éles szerver) külön, üres adatbázison és éles builddel végigfuttattam, az működik.

## Állapot

- Utolsó commit: `610c007` – docs: confirm the open decisions as approved rules
- Tesztek: `npm test` → **12 tesztfájl, 95 teszt, mind zöld**
- Lint: `npm run lint` → **hibátlan** (ESLint, 0 hiba, 0 figyelmeztetés)
- Build: `npm run build` → **sikeres**, 18 útvonal, aktív proxy (Next.js 16.3.5)
- Típusellenőrzés: `npx tsc --noEmit` → **tiszta** (nem része a lépéstervnek, de lefuttattam)
- Munkakönyvtár: tiszta, csak ez a STATUS.md új fájl.

## Eltérések a CLAUDE.md-től

1. **A hivatkozott 12-es CLAUDE.md nem létezik.** A repóban a 9-es van (`C:\dev\ground-handling\CLAUDE.md`), a `Downloads` mappában pedig a régi 4-es. A STATUS.md váz 12-es verzióra és egy „2. mérföldkő lépésterv”-re hivatkozik; ilyen szakasz egyik fájlban sincs. Az alábbi összevetés tehát a 9-es leíráshoz készült. Ha van újabb verzió, tedd be a repóba, és újra átnézem.
2. **`middleware` helyett `proxy.ts`.** A leírás middleware-t ír (4. MVP-pont). A Next.js 16-ban ez a fájl `proxy.ts` néven fut, tartalmilag ugyanaz; a build „Proxy (Middleware)” néven jelzi.
3. **Az eltérés-színek küszöbei még nem állíthatók.** A leírás 5. szabálya szerint „a küszöbök később beállíthatók legyenek”. Most kódbeli konstans (`DEVIATION_THRESHOLDS`, 0 és 5 perc), a `deviationLevel` függvény paraméterként már fogad mást, de admin felület és adatbázismező nincs hozzá.
4. **Az ügynök nézet napi bontású, dátumválasztóval.** A leírás az ügynök nézet időkeretéről nem rendelkezik (a „műszak” fogalma még nyitott), ezért ugyanazt a naptári napos szűrést használja, mint a műszakvezetői lista.
5. **Adatmodell-kiegészítések a leíráshoz képest:** `createdAt` / `updatedAt` mezők (User, Flight, Task), egyedi kulcsok (felhasználónév, IATA-kód, `Task.flightId`, sablononként a mérföldkő kódja, taskonként és mérföldkövenként egy rögzítés), valamint sablonnév egyedisége légitársaságonként. Ezek adatintegritási kiegészítések, nem új üzleti szabályok.
6. **Formátum-ellenőrzések, amiket a leírás nem rögzít:** IATA-kód pontosan 2 alfanumerikus karakter, járatszám 2–10 alfanumerikus karakter, mérföldkő-kód 2–40 nagybetű/szám/aláhúzás, felhasználónév 3–32 karakter, jelszó legalább 8 karakter, sablon percmezői 0–1440, offset ±1440. Ezek nélkül nem lehetett űrlapot validálni; mind egy helyen, a `lib/validation/` alatt van, könnyen átírható.
7. **Törlés szinte sehol nincs.** A leírás csak a mérföldkő törléséről rendelkezik (4. eldöntött szabály), ezért járatot, légitársaságot, sablont, felhasználót és rögzítést nem lehet törölni; a felhasználó inaktiválható. Ez tudatos kihagyás, nem hiányosság – de dönteni kell róla.
8. **Technikai kényszerek:** Auth.js v5 béta verzió (5.0.0-beta.32; a v5 még nem végleges), a Prisma CLI 7.10.0-ra rögzítve, mert az npm „latest” címkéjén jelenleg egy 8.0 RC van, ami nem illik a 7.10-es klienshez.

## Kérdések a tervezéshez

Domain-kérdések, amikre válasz kell:

- **Műszak:** mi alapján tartozik egy task egy műszakhoz (fix sávok, külön beosztás, naptári nap)? Az ügynök a műszak összes taskját látja, vagy csak a hozzá rendelteket a műszakon belül? A mostani kód a hozzá rendelteket mutatja, ahogy a CLAUDE.md átmeneti szabálya mondja. Ez a 2. mérföldkő első lépését közvetlenül érinti.
- **Lezárt task javítása:** a CLAUDE.md szerint „a jogosultságot később pontosítjuk”. Most a Szerepkörök szabálya él (ügynök a sajátját, műszakvezető bármelyiket).
- **Létszámigény 15 perces sávban:** a sávval bármennyire átfedő ablakok száma, a sávon belüli csúcs-egyidejűség, vagy a sáv kezdőpontjában mért érték?
- **Eltérés-küszöbök:** globálisan, légitársaságonként vagy sablononként legyenek állíthatók?
- **Kettős foglalás:** figyelmeztessen-e a rendszer, ha egy ügynök két taskjának foglaltsági ablaka átfed?
- **Törlés:** törölhető-e járat, légitársaság vagy sablon, és mi történjen a hozzájuk tartozó taskokkal és rögzítésekkel?
- **ETA/ETD forrása:** kézzel a műszakvezető adja, vagy importból jön? Ma csak kézzel adható meg.
- **Jelszókezelés:** kell-e önkiszolgáló jelszóváltás, illetve kötelező csere első belépéskor? Ma csak az admin állít jelszót.

Amit építés közben magamtól kellett eldöntenem (mind megváltoztatható):

- A „Most” gomb csak rögzítés előtt látszik, utána „Javítás” – hogy egy véletlen érintés ne írjon felül kész időt.
- Az admin nem inaktiválhatja és nem fokozhatja le a saját fiókját (kizárás elleni védelem).
- Demo jelszó minden seed felhasználónak: `demo1234`.
- A seed teljes adatcserét végez, a konténer első indításakor viszont csak üres adatbázisba tölt (`--if-empty`).
- A felület magyar szövegei egy fájlban (`lib/messages/hu.ts`), a jogosultsági és időszámítási szabályok tiszta, tesztelt függvényekben.

## Következő lépés

- **2. mérföldkő, 1. lépés: Prisma `Shift` modell, migráció, seed.** Ehhez előbb a fenti „Műszak” kérdésre kell válasz (mit rögzítünk: felhasználó + nap + kezdet/vég, vagy nap + műszaktípus), mert ez dönti el a modell mezőit és azt, hogy az ügynök nézet szűrése mire vált.
- A CLAUDE.md-ben jelenleg nincs 2. mérföldkő szakasz (a műszakbeosztás a „Később” listában van). A lépés megkezdése előtt érdemes a leírást kiegészíteni a 2. mérföldkő lépéstervével, és a verziószámot növelni.
