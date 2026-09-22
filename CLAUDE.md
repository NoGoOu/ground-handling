# Ground Handling App – projektleírás

*Verzió: 13 · 2026. szeptember 22.*

Nyílt forráskódú webalkalmazás repülőtéri földi kiszolgálás (ground handling) szervezésére. Minden járatfordulóhoz egy task tartozik, benne mérföldkövekkel, amelyeknek van tervezett és tényleges időpontja. A mérföldkövek légitársaságonként testreszabható sablonokból jönnek. A hozzáférés szerepkör alapú.

Ez a fájl a projekt fő leírása. Ha a domain logika nem egyértelmű, kérdezz, ne találj ki új üzleti szabályt. A korábban nyitott kérdések eldöntve a fájl végén, a „További eldöntött szabályok” részben vannak.

## Tech stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth.js (felhasználónév/jelszó alapú belépés)
- Tailwind CSS
- Vitest a unit tesztekhez
- Docker Compose (app + adatbázis), hogy bárki egy paranccsal elindíthassa
- Külső AI API-t nem használunk
- Az útvonalszintű belépés- és szerepkör-ellenőrzés fájlja a Next.js 16-ban `proxy.ts` (a korábbi middleware helyett), tartalmilag ugyanaz.

## Fogalmak

- **Forduló (turnaround):** a gép megérkezik, kiszolgálják, majd újra elindul. Egy fordulóhoz egy task tartozik.
- **STA / ETA / ATA:** tervezett / várható / tényleges érkezés (ATA = on-block).
- **STD / ETD:** tervezett / várható indulás.
- **ATD / off-block:** tényleges indulás, amikor a gép elhagyja az állóhelyet.
- **Adatok pontossága:** a menetrendi STA/STD-t felülírja a várható ETA/ETD, azokat pedig a tényleges ATA/ATD. A tényleges érték a legpontosabb.
- **Mérföldkő (milestone):** egyetlen időpont a fordulón belül (pl. „Last pax out”). Az ügynök egy gombnyomással rögzíti a tényleges idejét.
- **Gyors forduló:** a kiszolgálás folyamatos, egy ügynök végzi.
- **Hosszú forduló:** az érkezési és az indulási rész között szünet van, a két részt végezheti ugyanaz vagy két külön ügynök.

## Szerepkörök

| Szerepkör | Jogosultság |
|---|---|
| ADMIN | Mindenhez hozzáfér. Felhasználókat, légitársaságokat és sablonokat kezel. |
| SHIFT_LEAD (műszakvezető) | Járatokat hoz létre és módosít; a járathoz a task automatikusan létrejön. Ügynököket rendel a taskokhoz. Minden taskot lát, bármelyik rögzített időt javíthatja, a task státuszát módosíthatja. |
| AGENT (ügynök) | Csak a hozzá rendelt taskokat látja, a műszakbeosztástól függetlenül. Csak a hozzá rendelt rész mérföldköveit rögzítheti, a saját rögzítéseit javíthatja. A hozzá rendelt task státuszát ő váltja. |

- Hosszú fordulónál a két ügynök nem nyúlhat egymás részébe: az érkezési ügynök csak az érkezési, az indulási ügynök csak az indulási rész mérföldköveit rögzítheti. Gyors fordulónál mindkét rész az érkezési ügynöké (8. szabály).
- Minden rögzítésnél látszik a felületen, ki rögzítette és ki módosította utoljára.
- A jogosultságot szerveroldalon is ellenőrizni kell, nem elég a felületen elrejteni.

## Adatmodell

- **User:** name, username, passwordHash, role (ADMIN | SHIFT_LEAD | AGENT), active
- **Airline:** name, iataCode
- **TurnaroundTemplate:** airline, name, és a paraméterek:
  - `minTurnaroundMinutes` (gyors forduló ATA-tól off-blockig): 25
  - `travelMinutes` (kiutazás / visszautazás): 5
  - `postDepartureMinutes` (pushback + visszautazás + papírmunka): 15
  - `departureReportMinutes` (hosszú fordulónál ennyivel az indulás előtt kint kell lenni): 40
  - `minBreakMinutes` (hosszú fordulónál a két foglaltsági ablak között legalább ennyi szabad időnek kell lennie, különben a forduló gyors, összekapcsolt taskként számít; nem lehet negatív): 15
- **MilestoneDefinition:** template, order, code, name, anchor (ARRIVAL | DEPARTURE), offsetMinutes, required, part (ARRIVAL_PART | DEPARTURE_PART)
  - Az `ATA` és az `ATD` kódú mérföldkő minden sablonban megvan, kötelező és nem törölhető, a kódja nem módosítható, mert ezekhez kapcsolódik a külső rendszerből érkező érték. Ezt szerveroldalon is ellenőrizni kell.
- **Flight:** airline, template, inboundFlightNumber, outboundFlightNumber, sta, eta (opcionális), std, etd (opcionális), stand, ata (opcionális, külső rendszerből), atd (opcionális, külső rendszerből)
- **Task:** flight (1:1, a járat létrehozásakor automatikusan létrejön), status (PLANNED | IN_PROGRESS | COMPLETED), arrivalAgent (opcionális), departureAgent (opcionális). A két ügynök lehet ugyanaz a személy.
- **MilestoneRecord:** task, milestoneDefinition, actualTime, recordedBy, recordedAt, updatedBy, updatedAt. Taskonként és mérföldkövenként legfeljebb egy rekord.
- **Setting** (globális beállítások, egyetlen sor): az eltérés színküszöbei percben (alapérték: zöld legfeljebb 0, sárga legfeljebb 5). Az admin szerkeszti.
- **Shift** (2. mérföldkő): user, start, end, note (opcionális). A kezdés korábbi a végnél; a műszak átnyúlhat éjfélen; ugyanannak az embernek nem lehet két átfedő műszakja.
- **Lezárt task pillanatképe:** amikor a task COMPLETED lesz, elmenti a sablon akkori paramétereit és mérföldkő-definícióit. A lezárt task ezután ebből számol, a sablon későbbi módosítása nem változtatja meg.

Minden időpontot UTC-ben tárolunk, a felületen helyi időben (Europe/Budapest) jelenítjük meg.

## Task státusz

- A task létrehozáskor PLANNED.
- Az első mérföldkő rögzítésekor a PLANNED task automatikusan IN_PROGRESS lesz.
- Ezen kívül a státuszt a taskhoz rendelt ügynök váltja; a műszakvezető és az admin is módosíthatja.
- A hiányzó kötelező (`required`) mérföldkövet a rendszer jelöli, de semmit nem tilt le, a lezárást sem.
- A lezárt task rögzítései utólag is javíthatók. Ennek jogosultságát később pontosítjuk; addig a Szerepkörök szerinti szabály érvényes.

## Első sablon (demo fapados légitársaság)

A percek helyőrzők, az admin felületen módosíthatók. Az ATA mérföldkő kódja `ATA`, az Off-block mérföldkőé `ATD`.

| # | Mérföldkő | Horgony | Offset | Kötelező | Rész |
|---|---|---|---|---|---|
| 1 | ATA | ARRIVAL | 0 | igen | érkezési |
| 2 | Front door open | ARRIVAL | +1 | igen | érkezési |
| 3 | Back door open | ARRIVAL | +1 | nem | érkezési |
| 4 | First pax out | ARRIVAL | +2 | igen | érkezési |
| 5 | Last pax out | ARRIVAL | +10 | igen | érkezési |
| 6 | First pax in | DEPARTURE | −30 | igen | indulási |
| 7 | Last pax in | DEPARTURE | −5 | igen | indulási |
| 8 | Cabin door close | DEPARTURE | −3 | igen | indulási |
| 9 | All door close | DEPARTURE | −1 | igen | indulási |
| 10 | Off-block (ATD) | DEPARTURE | 0 | igen | indulási |

## Időszámítási szabályok

Ezt a logikát egy külön modulba kell tenni (`lib/turnaround.ts`), tiszta függvényekként, unit tesztekkel.

1. **Érkezési horgony:** a hatályos ATA (9. pont), ha van, különben az ETA, ha van, különben az STA.
2. **Indulási horgony (tervezett off-block):** az ETD (ha van, különben az STD) és az (érkezési horgony + `minTurnaroundMinutes`) közül a későbbi. Így ha a gép késve érkezik, a rendszer magától gyors forduló szerint számol.
3. **Tervezett mérföldkő-idő:** horgony + offset. Egy mérföldkő tervezett ideje nem lehet korábbi az előző mérföldkő tervezett idejénél; ha az lenne, az előző idejére kerül. (Például gyors fordulónál a „First pax in” a „Last pax out” idejére tolódik.)
4. **Ellenőrzés gyors fordulóra (STD = ATA + 25):** a tervezett idők ATA-hoz képest: 0, +1, +1, +2, +10, +10, +20, +22, +24, +25.
5. **Eltérés:** tényleges − tervezett. Az ATA és az ATD sorában a tényleges idő a hatályos érték (9. pont). Színjelölés a globális beállítás szerint, alapértelmezés: legfeljebb 0 perc zöld, 1–5 perc sárga, 5 perc fölött piros. A küszöbök az admin felületen állíthatók. Amint van ATA, a tervezett idők attól számolódnak (1. pont), így az ATA sor eltérése 0.
6. **Sorrend-ellenőrzés:** ha egy rögzített idő korábbi, mint egy előtte lévő mérföldkő rögzített ideje, a rendszer figyelmeztet, de nem tiltja le a mentést. Az ATA és az ATD sorában itt is a hatályos érték (9. pont) számít.
7. **Késés:** hatályos ATD (9. pont) − STD, ha pozitív.
8. **Forduló típusa:** a két foglaltsági ablak közötti szabad idő dönti el.
   - érkezési ablak vége = utolsó érkezési mérföldkő tervezett ideje + `travelMinutes`
   - indulási ablak eleje = indulási horgony − `departureReportMinutes` − `travelMinutes`
   - szünet = indulási ablak eleje − érkezési ablak vége
   - Ha a szünet legalább `minBreakMinutes`: hosszú forduló. A két rész ügynöke külön választható, a műszakvezető dönt.
   - Egyébként gyors forduló, egy összefüggő foglaltsági ablakkal, és mindkét részt az érkezési ügynök végzi. Ha a járat késése miatt egy hosszú forduló gyorssá válik, az indulási rész is automatikusan az érkezési ügynökhöz kerül.
   - Így a két ablak soha nem fedheti át egymást.
9. **Hatályos ATA / ATD:** a Flight `ata` / `atd` mezője (külső rendszerből), ha ki van töltve; különben az `ATA` / `ATD` kódú mérföldkő rögzített értéke. Az ügynök saját rögzítése a rendszerérték mellett is megmarad és látható, de a számításokban a rendszerből kapott érték számít.
10. **Percpontosság:** minden időt percre pontosan rögzítünk, a másodperceket levágjuk (nem kerekítjük). Ez a „Most” gombra és a kézi megadásra is vonatkozik.

## Ügynök-foglaltság

A foglaltsági ablakokra már most legyen függvény és teszt (a forduló típusához is kell). A létszámigény-számítás és a felület később jön.

- **Gyors forduló:** egy foglaltsági ablak, érkezési horgony − `travelMinutes`-tól tervezett off-block + `postDepartureMinutes`-ig. (A demo sablonnal ez 45 perc.)
- **Hosszú forduló, két ablak:**
  - érkezési rész: érkezési horgony − `travelMinutes` → utolsó érkezési mérföldkő + `travelMinutes`
  - indulási rész: indulási horgony − `departureReportMinutes` − `travelMinutes` → tervezett off-block + `postDepartureMinutes`
  - (Feltételezés: a szünetben az ügynök bemegy, ezért számolunk vissza- és kiutazással. Később pontosítható.)
- Az ablakok félig nyitott intervallumok (kezdet ≤ t < vég), így az egymásba érő ablakok nem számítanak átfedésnek.
- Unit tesztek: a küszöb körüli esetek (szünet = `minBreakMinutes` − 1 és = `minBreakMinutes`), és annak ellenőrzése, hogy hosszú fordulónál a két ablak soha nem fedi át egymást.

## 1. mérföldkő (MVP) – ezt építsd most

1. Projekt alapváz: Next.js + TypeScript, Prisma, PostgreSQL, Tailwind, ESLint, Vitest, Docker Compose.
2. Prisma séma a fenti adatmodell szerint, migrációval.
3. Seed adatok: 1 admin, 1 műszakvezető, 2 ügynök; 1 demo fapados légitársaság a fenti sablonnal; 4 példajárat a futtatás napjára (Europe/Budapest), köztük legalább egy gyors, egy hosszú, és kettő, amelyek időben átfedik egymást. Legalább egy járatnál legyen kitöltve a rendszerből kapott `ata` és `atd`, hogy a megjelenítés kipróbálható legyen.
4. Belépés és szerepkör alapú védelem (middleware + szerveroldali ellenőrzés minden műveletnél).
5. `lib/turnaround.ts` az időszámítási és foglaltsági szabályokkal, unit tesztekkel, köztük a 4. pont gyors fordulós ellenőrzésével.
6. Oldalak:
   - **Napi járatlista** (műszakvezető): 24 órás időszak, idő szerint rendezve, task-státusszal, ügynök-hozzárendeléssel (érkezési és indulási rész).
   - **Járat létrehozása és szerkesztése** (műszakvezető): légitársaság, sablon, járatszámok, STA, ETA, STD, ETD, állóhely. A task automatikusan létrejön.
   - **Task nézet:** mérföldkő-idővonal, soronként tervezett / tényleges / eltérés, „Most” gomb a rögzítéshez, kézi időmódosítás, ki rögzítette és ki módosította, a hiányzó kötelező mérföldkövek jelölése, státuszváltás.
   - **Ügynök nézet:** a hozzá rendelt taskok. Telefonra optimalizálva, nagy gombokkal, mert az ügynökök a forgalmi előtéren telefonról használják.
   - Az ATA és az ATD sorában (task nézet és ügynök nézet) a rendszerből kapott érték és az ügynök saját rögzítése egymás mellett látszik. Az ügynök akkor is rögzíthet saját értéket, ha van rendszerérték.
   - **Admin:** felhasználók kezelése (létrehozás, szerepkör, aktív/inaktív, jelszó), légitársaságok és sablonok szerkesztése (a sablon paraméterei, valamint a mérföldkövek sorrendje, horgonya, offsetje, kötelező volta és része), valamint a globális beállítások (eltérés-küszöbök).
7. README: telepítés és indítás Docker Compose-zal.

A külső rendszerből való ATA/ATD-átvételt most nem építjük meg; a Flight `ata` és `atd` mezője a seed adatokon kívül üres maradhat.

### Lépésterv

Minden lépés végén futtatható állapot és egy commit.

1. Alapváz (Next.js, TypeScript, Tailwind, ESLint, Vitest, magyar szövegek gyűjtőfájlja)
2. Időszámítás: `lib/turnaround.ts` 1. rész (horgonyok, tervezett idők, eltérés, sorrend, késés)
3. Forduló típusa és foglaltsági ablakok: `lib/turnaround.ts` 2. rész
4. Docker Compose + PostgreSQL + Prisma kapcsolat
5. Prisma séma + migráció
6. Seed
7. Belépés (Auth.js)
8. Szerepkör-alapú védelem (middleware + szerveroldali ellenőrzés, tesztelt jogosultsági függvények)
9. Napi járatlista
10. Járat létrehozása és szerkesztése (automatikus task)
11. Ügynök-hozzárendelés
12. Task nézet (olvasás)
13. Rögzítés, javítás, státuszváltás
14. Ügynök nézet (telefonra)
15. Admin: felhasználók
16. Admin: légitársaságok
17. Admin: sablonok
18. README + indítás tiszta állapotból

## 2. mérföldkő – műszakbeosztás és sávos idősoros nézet

Az MVP után ezt építjük, a lenti lépésterv szerint.

### Műszakbeosztás

- Külön oldal, a műszakvezető és az admin kezeli.
- Egy műszak: ügynök, kezdés és vég szabadon megadva (nincsenek előre definiált műszaktípusok), opcionális megjegyzés.
- A műszak átnyúlhat éjfélen. Ugyanannak az embernek nem lehet két átfedő műszakja.

### Sávos idősoros nézet

Műszakvezetői és admin nézet, asztali gépre. Telefonon ne törjön el, de nem arra optimalizált.

- Napválasztó, ugyanaz a naptári nap, mint a napi járatlistán.
- Egy sáv egy ügynök, akinek arra a napra van műszakja. A sávon a műszak ideje kiemelt, a rajta kívüli idő halvány.
- A taskok a foglaltsági ablakaik szerinti dobozok (lásd Ügynök-foglaltság). Hosszú fordulónál két külön doboz, gyors fordulónál egy. A dobozon a járatszám és az állóhely látszik.
- A dobozok a hatályos időkből számolnak, így a valós helyzetnek megfelelően mozognak.
- Legfelül „Kiosztatlan” sáv a még ki nem osztott részekkel.
- Függőleges vonal jelzi a mostani időt.
- Ha egy ügynöknek van kiosztott taskja, de arra a napra nincs műszakja, akkor is kap sávot, megjelölve.
- Létszámigény ezen a nézeten nem jelenik meg.

### Kiosztás és ütközés

- A doboz ráhúzása egy sávra hozzárendelés: az érkezési doboz az érkezési, az indulási doboz az indulási ügynököt állítja be. Gyors fordulónál egy doboz van, és mindkét rész az érkezési ügynöké (8. szabály).
- A kiosztatlan sávra visszahúzva a hozzárendelés törlődik.
- Ütközéskor a rendszer figyelmeztet, de engedi a mentést, és az érintett dobozok jelölve maradnak. Ütközés az, ha ugyanannál az ügynöknél két foglaltsági ablak átfed (félig nyitott intervallumok), és az is, ha a task ablaka kilóg az ügynök műszakjából.

### Lépésterv

1. Prisma: Shift modell, migráció, seed kiegészítés (műszakok a demo ügynököknek)
2. Műszakbeosztás oldal (lista, felvitel, szerkesztés, törlés, validáció)
3. Szerveroldali adatréteg: taskonkénti foglaltsági ablakok és ütközésvizsgálat, unit tesztekkel
4. Sávos nézet olvasásra (sávok, dobozok, kiosztatlan sáv, most-vonal)
5. Drag and drop kiosztás, ütközés-figyelmeztetéssel
6. README és STATUS.md frissítése

## További eldöntött szabályok

Ezeket a kérdéseket a megrendelő 2026. szeptember 22-én jóváhagyta; a kód is ezekre a számokra hivatkozik.

1. **Napi járatlista:** naptári nap (00:00–24:00, Europe/Budapest), dátumválasztóval. Egy járat azon a napon jelenik meg, amelyre az STA-ja vagy az STD-je esik (az éjfélen átnyúló forduló mindkét napon). Rendezés STA szerint.
2. **Lezárt task visszanyitása:** a státusz bármelyik irányba váltható. A pillanatkép minden lezáráskor elkészül; visszanyitáskor törlődik, és újra a sablon aktuális állapota számít.
3. **Rögzítés törlése:** nincs törlés, csak javítás (a Szerepkörök szerint).
4. **Sablon szerkesztése:** rögzítéssel rendelkező mérföldkő nem törölhető. Az ATA és az ATD horgonya, offsetje, része és kötelező volta zárolt (ATA: ARRIVAL, 0, érkezési; ATD: DEPARTURE, 0, indulási). Az ATA az első, az ATD az utolsó, és az érkezési rész mérföldkövei mind az indulási rész előtt vannak.
5. **Hiányzó kötelező mérföldkő jelölése:** akkor jelöljük, ha a tervezett ideje már elmúlt, vagy a task lezárt.
6. **Járat űrlap:** az STD-nek később kell lennie az STA-nál; a járat sablonja nem módosítható, ha a taskon már van rögzítés.
7. **Eltérés-küszöbök:** globális beállítás, az admin felületen szerkeszthető; alapérték 0 és 5 perc.
8. **Jelszó:** jelszót csak az admin állít. Önkiszolgáló jelszóváltoztatás és kötelező csere nincs.
9. **Ügynök nézet időkerete:** naptári nap, dátumválasztóval, ugyanúgy, mint a műszakvezetői listán.
10. **„Most” gomb:** rögzítés után „Javítás”-ra vált, hogy egy véletlen érintés ne írjon felül kész időt.
11. **Törlés:** járat, légitársaság, sablon, felhasználó és rögzítés egyelőre nem törölhető; a felhasználó inaktiválható. A végleges szabály még nyitott.

## Később (most ne építsd)

- **3. mérföldkő – üzenetek** (MVT, CPM, LDM, UCM, PST, PTM): fogadás, a nyers szöveg és a feldolgozott adat tárolása járatonként, verziózva (a javított üzenet nem írja felül a korábbit, de mindig a legfrissebb érvényes látszik). Járatonként egy fül, amit az ügynök is lát. A személyes adatot tartalmazó üzenetek (pl. PTM) hozzáférését és megőrzési idejét külön tisztázni kell.
- Járat-infografika: a feldolgozott üzenetekből összegzett nézet (total pax, compartment-terheltség, speciális utasok és információk), a forrásüzenet idejével.
- Személyre szabható elrendezés: az ügynök drag and droppal állítja be, mit lát és hogyan, felhasználónként mentve. Csak azután, hogy a fix elrendezés bevált.
- A lezárt taskok utólagos javításának jogosultsága
- Létszámigény: számítás (egy adott időpontban az átfedő foglaltsági ablakok száma, 15 perces sávokra bontva; a sávon belüli számolás módja még nyitott) és külön nézet (idősávos táblázat vagy grafikon). A sávos idősoros nézeten nem jelenik meg: a tervezés más logika szerint működik.
- Járatinfó: a sablonban definiált egyedi mezők taskonként (pl. utaslétszám, különleges igények)
- Szolgáltatások rögzítése taskonként, időpontokkal
- Késéskód rögzítése, ha van késés
- Kimutatások légitársaságonként (kiszállítás és beszállítás hossza, földi idő, késések)
- Járatadatok importja, köztük az ETA, ETD, ATA és ATD átvétele külső rendszerből
- Korrekciós üzenet küldése a külső rendszer felé (ATA/ATD javítása)
- Több nyelv támogatása

## Állapotjelentés (`STATUS.md`)

A tervezés a Claude Projectben folyik, az építés itt, a repóban. A kettő között a repó gyökerében lévő `STATUS.md` tartja a kapcsolatot: a tervezés ebből tudja meg, hol tart a munka. Minden lépés (commit) után frissítsd, mindig felülírva, sosem bővítve, és maradjon egy oldalnál rövidebb. Szerkezete:

- **Fejléc:** a frissítés dátuma és a CLAUDE.md verziószáma.
- **Mi készült el:** az utolsó lépés vagy lépések, egy-egy sorban, a lépésterv számával.
- **Állapot:** utolsó commit (rövid hash és üzenet), a tesztek eredménye, lint és build.
- **Eltérések a CLAUDE.md-től:** ha valamit másképp kellett megoldani, mi és miért. Ha nincs ilyen: „nincs”.
- **Kérdések a tervezéshez:** domain- vagy szabálykérdés, amit magadtól nem dönthetsz el.
- **Következő lépés:** mi jön a lépésterv szerint.

Ha a CLAUDE.md-t módosítod, azt is írd bele, az új verziószámmal.

## Munkamód

- Kódban, azonosítókban és commit üzenetekben angol nyelv; a felület szövegei magyarok, egy helyen összegyűjtve, hogy később fordíthatók legyenek.
- Kis lépésekben haladj: minden lépés után legyen futtatható állapot és commit.
- Új funkció előtt röviden vázold a tervet, és várd meg a jóváhagyást.
- Minden lépés után frissítsd a `STATUS.md`-t a fenti szerkezet szerint.
- Ha ezt a fájlt módosítod, a tetején lévő verziószámot növeld eggyel, és frissítsd a dátumot.
- Az adatintegritási kiegészítések (createdAt / updatedAt, egyedi kulcsok) és az űrlapok formátum-ellenőrzései (`lib/validation/`) a kódban élnek. Nem üzleti szabályok, módosításuk nem igényel CLAUDE.md-változást.
- A Next.js-re vonatkozó szabályok (a `next dev` tartja karban, kód írása előtt olvasd el): @AGENTS.md
