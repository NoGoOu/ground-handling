# Ground Handling App – projektleírás

*Verzió: 22 · 2026. szeptember 24.*

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

Az alábbi táblázat az alapértelmezett szerepköröket írja le. A 2. mérföldkőtől a szerepkörök adatként szerkeszthetők, a jogosultsági rendszer szerint (lásd a táblázat alatt).

| Szerepkör | Jogosultság |
|---|---|
| ADMIN | Mindenhez hozzáfér. Felhasználókat, légitársaságokat és sablonokat kezel. |
| PLANNER (tervező, 2. mérföldkő) | Műszakbeosztást készít (tervezet), szabadon választott időszakra publikálja, a valós beosztást módosíthatja, a műszakrész-típusokat kezeli. A járatokat és a taskokat nem kezeli. |
| SHIFT_LEAD (műszakvezető) | Járatokat hoz létre és módosít; a járathoz a task automatikusan létrejön. Ügynököket rendel a taskokhoz. Minden taskot lát, bármelyik rögzített időt javíthatja, a task státuszát módosíthatja. A publikált és a valós beosztást látja, a valósat módosíthatja (2. mérföldkő). |
| AGENT (ügynök) | Csak a hozzá rendelt taskokat látja, a műszakbeosztástól függetlenül. Csak a hozzá rendelt rész mérföldköveit rögzítheti, a saját rögzítéseit javíthatja. A hozzá rendelt task státuszát ő váltja. |

- Hosszú fordulónál a két ügynök nem nyúlhat egymás részébe: az érkezési ügynök csak az érkezési, az indulási ügynök csak az indulási rész mérföldköveit rögzítheti. Gyors fordulónál mindkét rész az érkezési ügynöké (8. szabály).
- Minden rögzítésnél látszik a felületen, ki rögzítette és ki módosította utoljára.
- **Jogosultsági rendszer (2. mérföldkő, 1–2. lépés):**
  - A kód jogosultságokat ellenőriz (pl. taskok megtekintése, rögzítés, kiosztás, beosztás publikálása), nem szerepkörneveket. A jogosultságok listája a kódban van, magyar megnevezéssel.
  - A szerepkör adat: egy név és a hozzá pipált jogosultságok. Az admin egy szerepkör × jogosultság táblázatban pipál, és új szerepkört is létrehozhat. A seed a fenti táblázat szerinti alapértelmezett szerepköröket hozza létre, így a viselkedés nem változik.
  - Hatókör: ahol értelmes, a jogosultsághoz hatókör tartozik: saját, csapat vagy összes. A csapat hatókör a felhasználó által vezetett csapatok tagjait és a felhasználót magát jelenti. Egy task a csapat hatókörébe esik, ha az érkezési vagy az indulási ügynöke a csapat tagja.
  - Egy felhasználónak több szerepköre lehet, és egyénileg további jogosultságokat is kaphat. A tényleges jogosultság ezek uniója; hatókörnél a legszélesebb érvényes. Egyéni megvonás nincs.
  - A felhasználó admin oldalán látszik a tényleges jogosultsága és hatóköre, mindegyiknél a forrásával (melyik szerepkörből vagy egyéni kiegészítésből jön).
  - Aki taskot oszthat ki, a kiosztatlan taskokat a hatókörétől függetlenül látja, különben nem tudná kiosztani őket.
  - Az Admin beépített szerepkör: nem szerkeszthető és nem törölhető, és az utolsó aktív admin nem veszítheti el.
- A jogosultságot szerveroldalon is ellenőrizni kell, nem elég a felületen elrejteni.

## Adatmodell

- **User:** name, username, passwordHash, roles (egy vagy több szerepkör, 2. mérföldkő), egyéni jogosultságok (2. mérföldkő), team (opcionális, 2. mérföldkő), active
- **Airline:** name, iataCode
- **TurnaroundTemplate:** airline, name, és a paraméterek:
  - `minTurnaroundMinutes` (gyors forduló ATA-tól off-blockig): 25
  - `travelMinutes` (kiutazás / visszautazás): 5
  - `postDepartureMinutes` (pushback + visszautazás + papírmunka): 15
  - `departureReportMinutes` (hosszú fordulónál ennyivel az indulás előtt kint kell lenni): 40
  - `minBreakMinutes` (hosszú fordulónál a két foglaltsági ablak között legalább ennyi szabad időnek kell lennie, különben a forduló gyors, összekapcsolt taskként számít; nem lehet negatív): 15
- **MilestoneDefinition:** template, order, code, name, anchor (ARRIVAL | DEPARTURE), offsetMinutes, required, part (ARRIVAL_PART | DEPARTURE_PART)
  - Az `ATA` és az `ATD` kódú mérföldkő minden sablonban megvan, kötelező és nem törölhető, a kódja nem módosítható, mert ezekhez kapcsolódik a külső rendszerből érkező érték. Ezt szerveroldalon is ellenőrizni kell.
- **Flight:** airline, template, stand, valamint
  - érkezési rész: inboundFlightNumber, sta, eta (opcionális), ata (opcionális, külső rendszerből)
  - indulási rész: outboundFlightNumber, std, etd (opcionális), atd (opcionális, külső rendszerből)
  - A két rész külön-külön opcionális, de legalább az egyiknek meg kell lennie (2. mérföldkő, 9. lépés; addig mindkettő kötelező). Ha csak az érkezési rész van, a gép itt marad (csak érkező járat); ha csak az indulási, a gép már itt van (csak induló járat). Lásd a 11. időszámítási szabályt.
  - Részenként: cancelled (igen/nem), cancelledBy, cancelledAt. Az ETA-hoz és az ETD-hez: forrás (kézi | üzenet), megjegyzés (opcionális), ki és mikor rögzítette. (2. mérföldkő, 10. lépés; lásd a „Késés és törlés” szakaszt.)
- **Task:** flight (1:1, a járat létrehozásakor automatikusan létrejön), status (PLANNED | IN_PROGRESS | COMPLETED), arrivalAgent (opcionális), departureAgent (opcionális). A két ügynök lehet ugyanaz a személy. Csak érkező járatnál csak érkezési, csak induló járatnál csak indulási ügynök van.
- **MilestoneRecord:** task, milestoneDefinition, actualTime, recordedBy, recordedAt, updatedBy, updatedAt. Taskonként és mérföldkövenként legfeljebb egy rekord.
- **Setting** (globális beállítások, egyetlen sor): az eltérés színküszöbei percben (alapérték: zöld legfeljebb 0, sárga legfeljebb 5). Az admin szerkeszti.
- **Role** (2. mérföldkő): name, builtIn, a hozzá tartozó jogosultságok hatókörrel. Alapértelmezett szerepkörök: Admin (beépített, zárolt), Tervező, Műszakvezető, Ügynök.
- **Team** (2. mérföldkő): name, leader (User). Minden ügynök egy csapat tagja; egy felhasználó több csapatot is vezethet.
- **SegmentType** (2. mérföldkő): name, code, operative (igen/nem), active. A tervező bővíti; használatban lévő típus nem törölhető, csak inaktiválható.
- **Publication** (2. mérföldkő): startDate, endDate (napok, Europe/Budapest), publishedBy, publishedAt. Egy nap legfeljebb egy publikációhoz tartozhat.
- **Shift** (2. mérföldkő): user, layer (DRAFT | PUBLISHED | ACTUAL), publication (opcionális), note (opcionális). A kezdete és a vége a részeiből adódik. A műszak átnyúlhat éjfélen; ugyanannak az embernek egy rétegen belül nem lehet két átfedő műszakja.
- **ShiftSegment** (2. mérföldkő): shift, start, end, segmentType, location (opcionális), description (opcionális), createBlock (igen/nem), travelBeforeMinutes, travelAfterMinutes (alapérték 0, nem negatív). Egy műszak részei nem fedhetik át egymást.
- **Lezárt task pillanatképe:** amikor a task COMPLETED lesz, elmenti a sablon akkori paramétereit és mérföldkő-definícióit. A lezárt task ezután ebből számol, a sablon későbbi módosítása nem változtatja meg.

Minden időpontot UTC-ben tárolunk, a felületen helyi időben (Europe/Budapest) jelenítjük meg.

## Task státusz

- A task létrehozáskor PLANNED.
- Az első mérföldkő rögzítésekor a PLANNED task automatikusan IN_PROGRESS lesz.
- Ezen kívül a státuszt a taskhoz rendelt ügynök váltja; a műszakvezető és az admin is módosíthatja.
- A hiányzó kötelező (`required`) mérföldkövet a rendszer jelöli, de semmit nem tilt le, a lezárást sem.
- A lezárt task rögzítései utólag is javíthatók. Ennek jogosultságát később pontosítjuk; addig a Szerepkörök szerinti szabály érvényes.

## Késés és törlés

A 2. mérföldkő 10. lépésében épül meg.

- **Késés rögzítése:** a járaton külön művelet, amellyel új várható érkezés és/vagy indulás adható meg, a forrás megjegyzésével (pl. „email a légitársaságtól”). A járat azonosítója (légitársaság + járatszám + menetrendi nap) nem változik: nem jön létre új járat, és a később érkező üzenetek is ehhez a járathoz párosulnak.
- **Hatályos ETA/ETD:** mindig a legutóbbi érték számít, akár kézzel, akár üzenetből jött. Mellette látszik a forrás, és hogy ki és mikor rögzítette.
- **„Késik” jelölés:** ha a hatályos érkezés vagy indulás későbbi a menetrendinél, a járat mindenhol (napi lista, task nézet, ügynök nézet, sávos nézet) „Késik” címkét kap, az eredeti menetrendi nappal és idővel. Így mindenki látja, hogy késett járatról van szó, nem újról.
- **Törlés (cancelled):** a járatot nem töröljük az adatbázisból, hanem töröltre állítjuk. Az érkezési és az indulási rész külön is töröltre állítható; ha mindkettő törölt, az egész járat törölt.
  - A törölt rész áthúzva látszik a listákon. Nem számít bele a foglaltságba, a forduló típusába, a sávos nézetbe és az ütközésvizsgálatba, és a mérföldköveit hiányzóként sem jelöljük.
  - Ha csak az egyik rész törölt, a járat a megmaradt rész szerint csak érkező vagy csak induló járatként viselkedik (11. időszámítási szabály).
  - A kiosztás megmarad, hogy visszaállításkor ne vesszen el.
  - A törlés visszaállítható. A törlést és a visszaállítást naplózzuk: ki és mikor.
- A késés rögzítése és a törlés a járat módosítására vonatkozó jogosultsághoz kötött.

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
11. **Csak érkező és csak induló járat:**
   - Csak érkező (a gép itt marad): csak az érkezési rész mérföldkövei tartoznak hozzá. Az érkezési horgony az 1. szabály szerint számol; indulási horgony, késés és forduló típus nincs.
   - Csak induló (a gép már itt van): csak az indulási rész mérföldkövei tartoznak hozzá. Az indulási horgony a hatályos ETD, ennek hiányában az STD (érkezési horgony nincs, így a `minTurnaroundMinutes` sem játszik); a késés a 7. szabály szerint számol; forduló típus nincs.
   - A hiányzó rész mérföldkövei, köztük az ATA, illetve az ATD, nem jelennek meg, és hiányzóként sem jelöljük őket.

## Ügynök-foglaltság

A foglaltsági ablakokra már most legyen függvény és teszt (a forduló típusához is kell). A létszámigény-számítás és a felület később jön.

- **Gyors forduló:** egy foglaltsági ablak, érkezési horgony − `travelMinutes`-tól tervezett off-block + `postDepartureMinutes`-ig. (A demo sablonnal ez 45 perc.)
- **Hosszú forduló, két ablak:**
  - érkezési rész: érkezési horgony − `travelMinutes` → utolsó érkezési mérföldkő + `travelMinutes`
  - indulási rész: indulási horgony − `departureReportMinutes` − `travelMinutes` → tervezett off-block + `postDepartureMinutes`
  - (Feltételezés: a szünetben az ügynök bemegy, ezért számolunk vissza- és kiutazással. Később pontosítható.)
- **Csak érkező vagy csak induló járat** (11. szabály): egy foglaltsági ablak, a hosszú forduló megfelelő részének képlete szerint (érkezési rész, illetve indulási rész).
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

### Beosztás rétegei

- **Tervezet:** a tervező szerkeszti, csak a tervező és az admin látja.
- **Publikált:** a tervező egy szabadon választott időszakot (kezdő és záró nap, Europe/Budapest) publikál; az időszak tervezetei ekkor publikálttá válnak. A publikált beosztás ezután nem módosítható. Egy nap csak egyszer publikálható.
- **Valós:** publikáláskor a publikált beosztás másolataként jön létre. Minden későbbi változás (csere, új műszak, átalakított részek) ide kerül; a tervező és a műszakvezető módosíthatja.
- A sávos nézet és a kiosztás mindig a valós rétegből dolgozik.

### Műszak és műszakrészek

- Egy műszak egy ügynöké, és egy vagy több részből áll. Minden résznek kezdete, vége és típusa van, opcionálisan helyszíne és leírása. Egy műszak részei nem fedhetik át egymást.
- A műszak átnyúlhat éjfélen; a táblázatban a kezdése napjánál jelenik meg. Ugyanannak az embernek egy rétegen belül nem lehet két átfedő műszakja.
- A résztípusok listáját a tervező bővíti (pl. Műszak, TRN). Minden típusnál jelölve van, hogy operatív-e: járatos taskot csak operatív részre lehet kiosztani.

### Nem operatív részek blokkja

- Egy részen a tervező bepipálhatja, hogy a napi kiosztásban blokként jelenjen meg (pl. oktatás).
- A részhez oda- és visszautazási idő adható meg. A blokk: a rész kezdete − odautazás → a rész vége + visszautazás. Így az ügynök nem kerülhet olyan járatra, amelyről nem érne oda.
- A blokk a részből származik, nem külön rögzített elem: ha a rész változik, a blokk vele mozog. Nincsenek mérföldkövei és státusza.
- A blokk az ügynök sávján és az ügynök nézetében is látszik, a típussal, a helyszínnel és a leírással.

### Beosztás felülete

- Név × nap táblázat, cellánként a publikált és a valós műszakkal; ahol a kettő eltér, az kiemelve.
- A cellára kattintva a műszak részei rétegenként látszanak, és ott szerkeszthetők, a jogosultság szerint.
- A tervező a tervezetet ugyanitt készíti, és innen publikál időszakot.

### Sávos idősoros nézet

Műszakvezetői, tervezői és admin nézet, asztali gépre. Telefonon ne törjön el, de nem arra optimalizált.

- Napválasztó, ugyanaz a naptári nap, mint a napi járatlistán.
- Egy sáv egy ügynök, akinek arra a napra van valós műszakja. Az operatív részek kiemeltek, a nem operatív részek a típusuk szerinti mintázattal jelennek meg, a műszakon kívüli idő halvány.
- A taskok a foglaltsági ablakaik szerinti dobozok (lásd Ügynök-foglaltság). Hosszú fordulónál két külön doboz, gyors fordulónál egy. A dobozon a járatszám és az állóhely látszik. A dobozok a hatályos időkből számolnak, így a valós helyzetnek megfelelően mozognak.
- A nem operatív részek blokkjai is megjelennek a sávon.
- Legfelül „Kiosztatlan” sáv a még ki nem osztott részekkel. Függőleges vonal jelzi a mostani időt.
- Ha egy ügynöknek van kiosztott taskja, de arra a napra nincs valós műszakja, akkor is kap sávot, megjelölve.
- Létszámigény ezen a nézeten nem jelenik meg.

### Kiosztás és ütközés

- A doboz ráhúzása egy sávra hozzárendelés: az érkezési doboz az érkezési, az indulási doboz az indulási ügynököt állítja be. Gyors fordulónál egy doboz van, és mindkét rész az érkezési ügynöké (8. szabály). A kiosztatlan sávra visszahúzva a hozzárendelés törlődik.
- Ütközéskor a rendszer figyelmeztet, de engedi a mentést, és az érintett dobozok jelölve maradnak. Ütközés (félig nyitott intervallumokkal):
  - két foglaltsági ablak átfed ugyanannál az ügynöknél;
  - egy foglaltsági ablak átfed egy nem operatív rész blokkjával;
  - egy foglaltsági ablak nem esik teljes egészében az ügynök operatív részeibe.

### Lépésterv

1. Jogosultsági rendszer, adatréteg: a jogosultságok listája a kódban (magyar megnevezéssel), szerepkörök és csapatok az adatbázisban, felhasználónként több szerepkör és egyéni jogosultságok, hatókörrel. A jogosultsági függvények, a proxy és minden szerverművelet jogosultságra ellenőriz, nem szerepkörnévre. Migráció: a meglévő felhasználók a mostani szerepkörüknek megfelelő alapértelmezett szerepkört kapják, a demo ügynökök egy demo csapatba kerülnek a műszakvezető vezetésével, a viselkedés nem változik. Tesztekkel
2. Jogosultsági rendszer, admin felület: szerepkör × jogosultság táblázat pipákkal és hatókörrel, új szerepkör létrehozása, felhasználónként szerepkörök és egyéni jogosultságok, csapatok kezelése, valamint a felhasználó oldalán a tényleges jogosultságai, mindegyiknél a forrásával
3. Prisma: PLANNER szerepkör, SegmentType, Publication, Shift, ShiftSegment, migráció; seed (1 tervező, Műszak és TRN típus, publikált és valós beosztás a demo ügynököknek a futtatás napjára, köztük egy utazási idős TRN rész blokkal, és egy nap, ahol a valós eltér a publikálttól)
4. Jogosultságok a tervezőhöz és a beosztáshoz, tesztekkel
5. Résztípusok kezelése (tervező)
6. Beosztás táblázat és a tervezet szerkesztése
7. Publikálás időszakra, a valós réteg létrehozása, a publikált zárolása
8. A valós réteg szerkesztése, az eltérések kiemelése
9. Csak érkező és csak induló járatok (11. időszámítási szabály): a Flight érkezési és indulási része külön-külön opcionális, legalább az egyik kötelező; `lib/turnaround.ts` tesztekkel; a járat űrlapja, a napi lista, a task és az ügynök nézet kezelje őket; seed: legalább egy csak érkező és egy csak induló járat
10. Késés és törlés (lásd a „Késés és törlés” szakaszt): külön „Késés rögzítése” művelet forrás-megjegyzéssel, a hatályos ETA/ETD a legutóbbi érték, „Késik” jelölés az eredeti menetrendi nappal, az érkezési és az indulási rész töröltre állítása és visszaállítása naplózva; tesztekkel
11. Szerveroldali adatréteg: foglaltsági ablakok, blokkok, ütközésvizsgálat, unit tesztekkel
12. Sávos nézet olvasásra
13. Drag and drop kiosztás, ütközés-figyelmeztetéssel
14. Ügynök nézet: a saját blokkjai megjelennek
15. README és STATUS.md frissítése

## További eldöntött szabályok

Ezeket a kérdéseket a megrendelő 2026. szeptember 22-én jóváhagyta; a kód is ezekre a számokra hivatkozik.

1. **Napi járatlista:** naptári nap (00:00–24:00, Europe/Budapest), dátumválasztóval. Egy járat azon a napon jelenik meg, amelyre az érkezési horgonya (1. időszámítási szabály) vagy a hatályos indulása esik; a hatályos indulás a hatályos ATD, ennek hiányában az indulási horgony (2. szabály). Az éjfélen átnyúló forduló mindkét napon megjelenik. Így a napokat késő járat a tényleges napján látszik, az eredeti napján nem. Rendezés az érkezési horgony szerint. Ugyanez a napszűrés érvényes az ügynök nézetre és a sávos nézetre is. (Módosítva 2026. szeptember 24-én; korábban az STA/STD napja és STA szerinti rendezés.)
2. **Lezárt task visszanyitása:** a státusz bármelyik irányba váltható. A pillanatkép minden lezáráskor elkészül; visszanyitáskor törlődik, és újra a sablon aktuális állapota számít.
3. **Rögzítés törlése:** nincs törlés, csak javítás (a Szerepkörök szerint).
4. **Sablon szerkesztése:** rögzítéssel rendelkező mérföldkő nem törölhető. Az ATA és az ATD horgonya, offsetje, része és kötelező volta zárolt (ATA: ARRIVAL, 0, érkezési; ATD: DEPARTURE, 0, indulási). Az ATA az első, az ATD az utolsó, és az érkezési rész mérföldkövei mind az indulási rész előtt vannak.
5. **Hiányzó kötelező mérföldkő jelölése:** akkor jelöljük, ha a tervezett ideje már elmúlt, vagy a task lezárt.
6. **Járat űrlap:** ha mindkét rész megvan, az STD-nek később kell lennie az STA-nál; csak érkező vagy csak induló járat is felvehető (2. mérföldkő); a járat sablonja nem módosítható, ha a taskon már van rögzítés.
7. **Eltérés-küszöbök:** globális beállítás, az admin felületen szerkeszthető; alapérték 0 és 5 perc.
8. **Jelszó:** jelszót csak az admin állít. Önkiszolgáló jelszóváltoztatás és kötelező csere nincs.
9. **Ügynök nézet időkerete:** naptári nap, dátumválasztóval, ugyanúgy, mint a műszakvezetői listán.
10. **„Most” gomb:** rögzítés után „Javítás”-ra vált, hogy egy véletlen érintés ne írjon felül kész időt.
11. **Törlés:** légitársaság, sablon, felhasználó és rögzítés egyelőre nem törölhető; a felhasználó inaktiválható, a járat pedig törlés helyett töröltre állítható (lásd „Késés és törlés”). A légitársaságra és a sablonra a végleges szabály még nyitott.

## Később (most ne építsd)

- **3. mérföldkő – üzenetek** (MVT, LDM, CPM, UCM, később PTM és PSM). A formátumok, a kódok, az ellenőrzések és a valós minták leírása: `docs/messages.md`.
  - Fogadás és feldolgozás: a nyers szöveg és a feldolgozott adat tárolása járatonként, verziózva (a javított üzenet nem írja felül a korábbit, de mindig a legfrissebb érvényes látszik). Hibatűrő feldolgozó; az ellenőrzések eltérésnél figyelmeztetnek. A minták tesztadatok.
  - Járatonként egy fül, amit az ügynök is lát.
  - Az ATA és az ATD forrása az MVT (on-block, illetve off-block). A BUD-ra érkező járat ETA-ja az indulási állomás MVT-jéből jön.
  - Előállítás: a BUD-ról induló és oda érkező járatok üzeneteit a BUD-i handling küldi, ezért az alkalmazásnak elő kell tudnia állítani őket, elsőként az MVT-t az ügynök rögzítéseiből (a korrekciós MVT-vel együtt).
  - A párosításhoz a Flight lajstrom (registration) mezőt kap.
  - A személyes adatot tartalmazó üzenetek (pl. PTM, PSM) hozzáférését és megőrzési idejét külön tisztázni kell.
- Járat-infografika: a feldolgozott üzenetekből összegzett nézet (total pax, compartment-terheltség, speciális utasok és információk), a forrásüzenet idejével.
- Személyre szabható elrendezés: az ügynök drag and droppal állítja be, mit lát és hogyan, felhasználónként mentve. Csak azután, hogy a fix elrendezés bevált.
- A lezárt taskok utólagos javításának jogosultsága
- **Tervezői nézet, automatikus kiosztással** (külön mérföldkő, a sorrendje később dől el):
  - Névtelen pozíciókkal dolgozik: a program az előre ismert járatokból pozíciókat számol (időtartam és szükséges képesítések), a tervező ezekhez neveket rendel, és ebből lesz a beosztás tervezete. A megjelenítés a sávos nézetre épül, sávonként egy pozícióval.
  - Feltételei: jogosítások (a Képzések és jogosítások nyilvántartásból, lásd lent) és előre ismert járatrend (lásd Járatrend-import).
  - Beállítható tervezési paraméterek: pihenőidő két task között, megengedett átfedés két task között, a műszak minimális és maximális hossza, munkaközi szünet, megengedett létszámtöbblet a minimumhoz képest. Ezek a tervezés szabályai, függetlenek az operatív ütközés-figyelmeztetésektől.
  - A cél sorrendje: 1. egyenletes terhelés a pozíciók között, 2. minél kevesebb ember, 3. minél kevesebb munkaóra, 4. minél kevesebb üresjárat a műszakon belül. Az egyenletes terhelés a megengedett létszámon belül értendő, hogy a program ne vegyen fel több embert csak a kiegyenlítés kedvéért.
  - Algoritmus, külső AI nélkül. Az eredmény a tervező által kézzel módosítható.
- **Képzések és jogosítások** (külön mérföldkő, a sorrendje később dől el):
  - Jogosítás: név, kód, alapértelmezett érvényességi idő. Képzés: név, az általa adott jogosítás (opcionális), van-e dolgozat, és ha igen, milyen eredménnyel sikeres.
  - Képzési rekord: ügynök, képzés, teljesítés dátuma, a dolgozat eredménye, sikeres-e, az érvényesség vége (a dátumból számolva, felülírható), csatolt fájlok.
  - Az ügynök jogosításai a rekordokból származnak: mindig a legutolsó sikeres rekord érvényessége számít, külön kézi lista nincs.
  - Új alapértelmezett szerepkör: Oktatási koordinátor, a képzési jogosultságokkal; ő rögzít és szerkeszt. Az ügynök a saját adatait látja, a csapatvezető a csapata tagjaiét (hatókör, lásd Szerepkörök). A csapatok már a 2. mérföldkőben létrejönnek.
  - A feladatok jogosításokat követelhetnek meg (pl. légitársaságonként vagy sablononként). Ha a kiosztott ügynöknek nincs érvényes jogosítása, a rendszer figyelmeztet, de nem tiltja.
  - Lista a hamarosan lejáró jogosításokról a koordinátornak és a csapatvezetőnek.
  - Fájlfeltöltés saját tárhelyre (Docker-kötet), méret- és típuskorláttal. A képzési adatok és a fájlok munkavállalói személyes adatok; a megőrzési idejüket tisztázni kell.
- Ügynöki beosztásnézet: az ügynök lássa a saját publikált és valós beosztását.
- Létszámigény: számítás (egy adott időpontban az átfedő foglaltsági ablakok száma, 15 perces sávokra bontva; a sávon belüli számolás módja még nyitott) és külön nézet (idősávos táblázat vagy grafikon). A sávos idősoros nézeten nem jelenik meg: a tervezés más logika szerint működik.
- Járatinfó: a sablonban definiált egyedi mezők taskonként (pl. utaslétszám, különleges igények)
- Szolgáltatások rögzítése taskonként, időpontokkal
- Késéskód rögzítése, ha van késés (az MVT DL sorába kerül)
- Kimutatások légitársaságonként (kiszállítás és beszállítás hossza, földi idő, késések)
- **Járatrend-import** (külön mérföldkő, a tervezői nézet előtt): fájlfeltöltés (CSV, JSON, XLSX, XLS) oszlop-párosítással, elmenthető párosítási profilokkal, időszak-kibontással és a fordulók képzésével. Csak a menetrendi mezőket írja; az ETA, ETD, ATA és ATD az üzenetekből jön, és az import nem írja felül őket. A leírás és a mintafájl tanulságai: `docs/schedule-import.md`.
- Üzenetek küldése a külső rendszer felé (az előállítás a 3. mérföldkő része; a küldés csatornája még nyitott)
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
