# Ground Handling App – projektleírás

*Verzió: 41 · 2026. október 2.*

Nyílt forráskódú webalkalmazás repülőtéri földi kiszolgálás (ground handling) szervezésére. Minden járatfordulóhoz feladattípusonként egy task tartozik, benne mérföldkövekkel, amelyeknek van tervezett és tényleges időpontja. A mérföldkövek légitársaságonként testreszabható sablonokból jönnek. A hozzáférés szerepkör alapú.

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

- **Forduló (turnaround):** a gép megérkezik, kiszolgálják, majd újra elindul. Egy fordulóhoz feladattípusonként egy task tartozik (az 5. mérföldkőtől; addig egy).
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
- **TaskType** (5. mérföldkő): name, code. **AirlineTaskType** (5. mérföldkő): airline, taskType, template, active, primary. A sablon feladattípushoz tartozik.
- **Airline:** name, iataCode, defaultTemplate (3. mérföldkő), késéskód-dokumentum (opcionális; a 8. mérföldkő utómunkája)
- **TurnaroundTemplate:** airline, name, és a paraméterek:
  - `minTurnaroundMinutes` (gyors forduló ATA-tól off-blockig): 25
  - `travelMinutes` (kiutazás / visszautazás): 5
  - `postDepartureMinutes` (pushback + visszautazás + papírmunka): 15
  - `departureReportMinutes` (hosszú fordulónál ennyivel az indulás előtt kint kell lenni): 40
  - `minBreakMinutes` (hosszú fordulónál a két foglaltsági ablak között legalább ennyi szabad időnek kell lennie, különben a forduló gyors, összekapcsolt taskként számít; nem lehet negatív): 15
- **MilestoneDefinition:** template, order, code, name, anchor (ARRIVAL | DEPARTURE), offsetMinutes, required, part (ARRIVAL_PART | DEPARTURE_PART)
  - Az `ATA` és az `ATD` kódú mérföldkő (az 5. mérföldkőtől: az `ATA`, ha a sablonnak van érkezési része, az `ATD`, ha indulási része) minden sablonban megvan, kötelező és nem törölhető, a kódja nem módosítható, mert ezekhez kapcsolódik a külső rendszerből érkező érték. Ezt szerveroldalon is ellenőrizni kell.
- **Flight:** airline, stand (a sablon az 5. mérföldkőtől a task tulajdonsága), valamint
  - érkezési rész: inboundFlightNumber, sta, eta (opcionális), ata (opcionális, külső rendszerből)
  - indulási rész: outboundFlightNumber, std, etd (opcionális), atd (opcionális, külső rendszerből)
  - A két rész külön-külön opcionális, de legalább az egyiknek meg kell lennie (2. mérföldkő, 9. lépés; addig mindkettő kötelező). Ha csak az érkezési rész van, a gép itt marad (csak érkező járat); ha csak az indulási, a gép már itt van (csak induló járat). Lásd a 11. időszámítási szabályt.
  - Részenként: cancelled (igen/nem), cancelledBy, cancelledAt. Az ETA-hoz és az ETD-hez: forrás (kézi | üzenet), megjegyzés (opcionális), ki és mikor rögzítette. (2. mérföldkő, 10. lépés; lásd a „Késés és törlés” szakaszt.)
- **Task:** flight (a járat létrehozásakor automatikusan létrejön; az 5. mérföldkőig 1:1, utána feladattípusonként egy, saját sablonnal), status (PLANNED | IN_PROGRESS | COMPLETED), arrivalAgent (opcionális), departureAgent (opcionális). A két ügynök lehet ugyanaz a személy. Csak érkező járatnál csak érkezési, csak induló járatnál csak indulási ügynök van.
- **MilestoneRecord:** task, milestoneDefinition, actualTime, recordedBy, recordedAt, updatedBy, updatedAt. Taskonként és mérföldkövenként legfeljebb egy rekord.
- **Setting** (globális beállítások, egyetlen sor): az eltérés színküszöbei percben (alapérték: zöld legfeljebb 0, sárga legfeljebb 5); a „hamarosan lejár” napjai (6. mérföldkő); a feladó email-címe és Type B címe (7. mérföldkő); a slot-tűrés percben (8. mérföldkő). Az admin szerkeszti.
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
- **„Késik” jelölés:** ha a hatályos érkezés vagy indulás több mint a sárga eltérés-küszöbbel (globális beállítás, alapértelmezés 5 perc) későbbi a menetrendinél, a járat mindenhol (napi lista, task nézet, ügynök nézet, sávos nézet) „Késik” címkét kap, az eredeti menetrendi nappal és idővel. Így mindenki látja, hogy késett járatról van szó, nem újról.
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
9. **Hatályos ATA / ATD:** a Flight `ata` / `atd` mezője (külső rendszerből; a 7. mérföldkőtől az MVT-ből), ha ki van töltve; különben az `ATA` / `ATD` kódú mérföldkő rögzített értéke. Az ügynök saját rögzítése a rendszerérték mellett is megmarad és látható, de a számításokban a rendszerből kapott érték számít.
10. **Percpontosság:** minden időt percre pontosan rögzítünk, a másodperceket levágjuk (nem kerekítjük). Ez a „Most” gombra és a kézi megadásra is vonatkozik.
11. **Csak érkező és csak induló járat:**
   - Csak érkező (a gép itt marad): csak az érkezési rész mérföldkövei tartoznak hozzá. Az érkezési horgony az 1. szabály szerint számol; indulási horgony, késés és forduló típus nincs.
   - Csak induló (a gép már itt van): csak az indulási rész mérföldkövei tartoznak hozzá. Az indulási horgony a hatályos ETD, ennek hiányában az STD (érkezési horgony nincs, így a `minTurnaroundMinutes` sem játszik); a késés a 7. szabály szerint számol; forduló típus nincs.
   - A hiányzó rész mérföldkövei, köztük az ATA, illetve az ATD, nem jelennek meg, és hiányzóként sem jelöljük őket.
   - A mérföldkő horgonya és része a sablonban független egymástól. Ha egy mérföldkő horgonya hiányzik (egy oldalas vagy részben törölt járat), a meglévő horgonytól számol, és a 3. szabály szerint nem kerülhet az előző mérföldkő elé.

## Ügynök-foglaltság

A foglaltsági ablakokra már most legyen függvény és teszt (a forduló típusához is kell). A létszámigény-számítás és a felülete a 9. mérföldkőben épül meg.

- **Gyors forduló:** egy foglaltsági ablak, érkezési horgony − `travelMinutes`-tól tervezett off-block + `postDepartureMinutes`-ig. (A demo sablonnal ez 45 perc.)
- **Hosszú forduló, két ablak:**
  - érkezési rész: érkezési horgony − `travelMinutes` → utolsó érkezési mérföldkő + `travelMinutes`
  - indulási rész: indulási horgony − `departureReportMinutes` − `travelMinutes` → tervezett off-block + `postDepartureMinutes`
  - (Feltételezés: a szünetben az ügynök bemegy, ezért számolunk vissza- és kiutazással. Később pontosítható.)
- **Csak érkező vagy csak induló járat** (11. szabály): egy foglaltsági ablak, a hosszú forduló megfelelő részének képlete szerint (érkezési rész, illetve indulási rész).
- Az ablakok félig nyitott intervallumok (kezdet ≤ t < vég), így az egymásba érő ablakok nem számítanak átfedésnek.
- Unit tesztek: a küszöb körüli esetek (szünet = `minBreakMinutes` − 1 és = `minBreakMinutes`), és annak ellenőrzése, hogy hosszú fordulónál a két ablak soha nem fedi át egymást.

## 1. mérföldkő (MVP) – kész

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

Kész (2026. szeptember 24.). A leírás a megépült működés referenciája.

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

## 3. mérföldkő – járatrend-import

**Kész** (2026. szeptember 24.); az utómunkával együtt. A részletes leírás, a mintafájl tanulságai és a tesztadat várt eredményei: `docs/schedule-import.md`. A tesztadat: `ryanair-netline-bud-sample.xlsx` (a projekt tesztadatai közé, pl. `tests/fixtures/schedule/`).

### Szabályok

- A jogosult felhasználó (új jogosultság: „járatrend importálása”, alapértelmezés szerint a Tervező és az Admin szerepkörben) fájlt tölt fel: CSV, JSON, XLSX vagy XLS.
- Az oszlopokat a mi mezőinkhez párosítja, átalakításokkal. A párosítás profilként elmenthető, és azonos fejlécű fájlnál a rendszer felajánlja.
- Csak a BUD-ot érintő sorok és a megadott dátumtartomány kerülnek be.
- A fordulókat a következő-járat oszlop alapján képezzük: az érkezést a következő járat első olyan példányával párosítjuk, amely az érkezés után indul BUD-ról. Ahol nincs következő járat, csak érkező járat lesz; az az indulás, amely egyetlen érkezés következő járata sem, csak induló járat lesz (11. időszámítási szabály).
- Mentés előtt próbafuttatás összesítéssel; semmi nem íródik, amíg a felhasználó jóvá nem hagyja.
- Az import csak a menetrendi mezőket írja (járatszámok, STA, STD, típus; a 7. mérföldkőtől az indulóállomás és a célállomás is). Az ETA, ETD, ATA, ATD, a késés, a törlés és a kiosztás érintetlen marad.
- Azonosítás: légitársaság + járatszám + menetrendi dátum + állomás. A meglévő járat frissül, nem duplikálódik.
- A légitársaságot a járatszám légitársasági kódja adja, a sablon a légitársaság alapértelmezett sablonja. Ha a légitársaság nem létezik, vagy nincs alapértelmezett sablonja, a sor hibásként jelenik meg az előnézetben.
- Hiányzó járat: ha egy korábban ugyanazzal a profillal importált járat a fájl időszakán belül hiányzik az új fájlból, nem törlődik és nem kerül töröltre, hanem „az utolsó importból hiányzik” jelölést kap, és a tervező dönt róla.
- Minden import naplózott: ki, mikor, milyen fájlt, milyen profillal, és az összesítés.
- Összevonás újraimportáláskor: ha két korábbi egyoldalú járatból az új fájl szerint forduló lesz, a kettő összevonható, és a kikerülő járat törlődik, de csak akkor, ha az importból jött létre, és nincs rajta üzemi adat (rögzítés, kiosztás, késés, törlés). Minden más esetben „párosítás változott” jelzés, kézi döntés.

### Lépésterv

1. Adatmodell és migráció: a légitársaság alapértelmezett sablonja (az admin felületen beállítható); a járat forrása (kézi vagy import) és a hiányzó-jelölés; importprofil (név, fejléc-ujjlenyomat, párosítás); importnapló. Új jogosultság: „járatrend importálása”
2. Fájlbeolvasás: CSV, JSON, XLSX, XLS; munkalap és fejlécsor választása; előnézet; tesztek a mintafájllal
3. Átalakítások tiszta, tesztelt függvényekként: szóközlevágás, járatszám-egységesítés, dátum és idő összevonása, időszak-kibontás napminta szerint, napeltolás, időzóna (UTC vagy helyi)
4. Fordulók képzése, tesztekkel a mintafájl várt eredményeire (`docs/schedule-import.md`)
5. Párosító felület: oszlop-hozzárendelés, átalakítások, BUD- és dátumtartomány-szűrés, profil mentése és felajánlása
6. Próbafuttatás és összesítés: új, változott, változatlan, hibás, párosítatlan és hiányzó sorok; semmi nem íródik
7. Mentés: upsert, csak menetrendi mezők, hiányzó-jelölés (látszik a napi listán és a járaton), importnapló
8. README és STATUS.md frissítése

### Utómunka (a 4. mérföldkő előtt)

1. Seed: Ryanair (FR) légitársaság a demo sablonnal mint alapértelmezett sablonnal, és a NetLine-export párosítási profilja, hogy a README-ben leírt próba beállítás nélkül elvégezhető legyen.
2. Egyoldalú járatok összevonása újraimportáláskor, a fenti szabály szerint, tesztekkel.

## 4. mérföldkő – tervezői nézet, automatikus kiosztással

**Kész** (2026. szeptember 24.); az utómunkával együtt. Jogosítások nélkül: a jogosítás-feltételek a 6. mérföldkővel kerülnek bele. Algoritmus, külső AI nélkül.

### Folyamat

1. A tervező kiválaszt egy időszakot (kezdő és záró nap); a program naponként számol.
2. **Bemenet:** a nap járatainak foglaltsági ablakai (lásd Ügynök-foglaltság). Gyors fordulónál egy ablak, hosszú fordulónál kettő (külön pozícióba is kerülhetnek), csak érkező és csak induló járatnál egy; a törölt részek kimaradnak. Egy nap feladatai azok az ablakok, amelyek az adott napon kezdődnek (Europe/Budapest).
3. **Számítás:** névtelen pozíciók („1. pozíció”, „2. pozíció” …), mindegyik egy leendő műszak.
4. **Áttekintés és módosítás:** a sávos nézet, sávonként egy pozícióval, napváltóval, a mutatókkal. A tervező a taskokat kézzel áthúzhatja egyik pozícióból a másikba; ha ez megsért egy korlátot, a rendszer figyelmeztet, de engedi.
5. **Nevek hozzárendelése:** pozíciónként egy ügynök, majd „Mentés a tervezetbe”: pozíciónként egy műszak a beosztás tervezet rétegében. Innen a 2. mérföldkő publikálása és valós rétege viszi tovább.
6. **Kiosztás átvétele:** külön gombbal a terv kiosztása átvehető a taskokra (lásd lent).

### Pozíció és műszak

- Egy pozíció a hozzá rendelt ablakok sorozata. A műszak kezdete az első ablak kezdete, vége az utolsó ablak vége. Ha így rövidebb a minimális műszakhossznál, a vége kitolódik a minimumig. A műszak nem lehet hosszabb a maximális műszakhossznál.
- Két egymást követő ablak között a rés legalább a pihenőidő. Ha átfedés megengedett, a rés legfeljebb ennyivel lehet negatív. Egyszerre csak az egyik paraméter lehet nullánál nagyobb.
- Szünet: ha a műszak hosszabb a szünetküszöbnél, a pozícióban kell lennie legalább szünethossznyi feladatmentes résnek; a program ezt a rést szünetként jelöli a tervben.
- Mentéskor a műszak egyetlen operatív részből áll (alapértelmezés szerint a Műszak típussal); a szünet a tervben jelölve marad.

### Cél és algoritmus

1. **Minimális pozíciószám a korlátok mellett:** időrendben haladva minden ablak egy olyan meglévő pozícióba kerül, amelyben a korlátok teljesülnek; új pozíció csak akkor nyílik, ha ilyen nincs. Korlátok nélkül ez bizonyíthatóan minimális: a pozíciók száma a legnagyobb egyidejű átfedés (félig nyitott ablakokkal).
2. **Egyenletes terhelés** a megengedett létszámon belül (minimum + a megengedett létszámtöbblet): a pozíciók foglaltsági perceinek különbségét áthelyezéssel és cserével csökkenti, a korlátok megtartásával.
3. **Döntetlennél** a kevesebb munkaóra (a műszakhosszak összege), majd a kevesebb üresjárat (műszakidő − foglaltsági idő) dönt.

- Az eredmény determinisztikus: ugyanarra a bemenetre mindig ugyanaz. Tiszta függvények (`lib/planning/`), unit tesztekkel.
- Mutatók: pozíciószám; pozíciónként foglaltsági perc, műszakhossz és üresjárat; összes munkaóra; a terhelés minimuma, maximuma és különbsége.

### Tervezési beállítások

Globális beállítás, a Tervező és az Admin szerkeszti. Számoláskor a terv lemásolja, így a későbbi módosítás a régi terveket nem változtatja meg. Az értékek helyőrzők, a szünetszabályt a Munka törvénykönyve szerint ellenőrizni kell.

- minimális műszakhossz: 240 perc; maximális: 720 perc
- szünet: 20 perc, ha a műszak hosszabb 360 percnél
- pihenőidő két task között: 0 perc; megengedett átfedés: 0 perc (egyszerre csak az egyik lehet nullánál nagyobb)
- megengedett létszámtöbblet a minimumhoz képest: 0

### A terv

- Tartalma: időszak, a beállítások másolata, naponként a pozíciók, az ablak–pozíció hozzárendelés, a kézi módosítások jelölése és a pozíciókhoz rendelt nevek.
- Az újraszámolás felülírja a kézi módosításokat, ezért előtte megerősítést kér.
- Ha a járatok a számolás után változnak (import, késés, törlés), a terv „elavult” jelzést kap, és újraszámolható.

### Nevek és tervezet

- Pozíciónként egy ügynök választható. Ha az ügynöknek a tervezet rétegben már van átfedő műszakja, a mentés nem lehetséges (a 2. mérföldkő szabálya).
- A mentés csak a még nem publikált napokra ír, mert a publikált beosztás zárolt.

### Kiosztás átvétele

- Külön gomb, a taskok kiosztására vonatkozó jogosultsághoz kötve (alapértelmezés szerint a Műszakvezető).
- A terv alapján beállítja az érkezési és az indulási ügynököt, **csak a még kiosztatlan részeken**; a már kiosztottakat kihagyja és listázza. Gyors fordulónál mindkét rész ugyanahhoz az ügynökhöz kerül.
- Az ütközés-figyelmeztetések a szokásosak (2. mérföldkő).

### Jogosultság

- Új jogosultság: „tervezés” (tervezői nézet, számolás, beállítások, nevek, mentés a tervezetbe), alapértelmezés szerint a Tervező és az Admin szerepkörben.

### Lépésterv

1. Adatmodell és migráció: tervezési beállítások, terv (időszak, beállítás-másolat, napok, pozíciók, ablak–pozíció hozzárendelés, kézi jelölés, nevek); „tervezés” jogosultság; seed: a beállítások alapértékei
2. Bemenet: a napi ablakok kigyűjtése a tervhez, tiszta függvényként (tesztek: gyors, hosszú, egyoldalú, törölt, éjszakázó)
3. Algoritmus, 1. lépés: minimális pozíciószám a korlátokkal (tesztek: korlát nélkül = legnagyobb egyidejű átfedés; pihenő; átfedés; maximális műszakhossz; szünet)
4. Algoritmus, 2–3. lépés: kiegyenlítés és döntetlen-feloldás, mutatók (tesztek: determinisztikus eredmény, a létszámtöbblet betartása, a korlátok megtartása)
5. Tervezési beállítások felülete
6. Tervezői felület: időszak, számolás, napváltó, sávos nézet pozíciókkal, mutatók, kézi áthúzás figyelmeztetéssel, újraszámolás megerősítéssel, elavultság jelzése
7. Nevek hozzárendelése és mentés a tervezetbe (csak nem publikált napokra)
8. Kiosztás átvétele gomb
9. README és STATUS.md frissítése

### Utómunka (az 5. mérföldkő előtt)

1. „Kiosztás átvétele” a teljes tervre is, a megnyitott nap mellett; továbbra is csak a kiosztatlan részekre.

## 5. mérföldkő – feladattípusok (több task járatonként)

**Kész** (2026. szeptember 25.). Ez az eddigi legnagyobb modellváltozás: az „egy járatforduló = egy task” helyett egy járathoz feladattípusonként egy task tartozik (pl. GOU és HDS). Ezeket különböző emberek végzik, külön időablakkal. A már megépített működés nem változhat: a meglévő adatok egy „Alap” feladattípus alá kerülnek, és a meglévő tesztek zöldek maradnak.

### Szabályok

- **Feladattípus:** név és rövid kód (pl. GOU, HDS), az admin kezeli.
- **A légitársaság feladattípusai:** légitársaságonként megadható, milyen feladattípusok kellenek a járataihoz, típusonként a használt sablonnal, aktív jelöléssel. Ez váltja a légitársaság alapértelmezett sablonját. A jogosítás-követelmények is ide kerülnek, a 6. mérföldkőben.
- **Elsődleges feladattípus:** légitársaságonként egy. Ha nincs rendszerből kapott ATA/ATD, az elsődleges task `ATA`/`ATD` rögzítése a járat hatályos értéke. A többi taskban az ATA és az ATD sora a járat hatályos értékét mutatja; saját rögzítés ott is lehet, de az nem hatályos.
- **Sablon:** feladattípushoz tartozik, és állhat érkezési részből, indulási részből vagy mindkettőből. Az `ATA` mérföldkő akkor kötelező, ha van érkezési rész, az `ATD` akkor, ha van indulási rész.
- **Taskok létrehozása:** a járat létrehozásakor (kézzel vagy importtal) a légitársaság minden aktív feladattípusához létrejön egy task. A feladattípusok későbbi módosítása csak az új járatokat érinti.
- **A task részei:** azok a részek, amelyek a sablonban és a járat meglévő, nem törölt részei között is megvannak.
- **Taskonként önálló:** mérföldkövek és rögzítések, státusz, érkezési és indulási ügynök, forduló típusa (a saját sablonja paramétereivel), foglaltsági ablakok.
- **Járatszintű, közös:** menetrendi, várható és tényleges idők, késés, törlés, állóhely, járatnapló, később az üzenetek.
- **Különböző emberek:** ugyanazon a járaton a különböző feladattípusokat különböző emberek végzik. Ha ugyanaz az ember kapná, a rendszer figyelmeztet, de engedi (kiosztás, sávos nézet).
- **Megjelenítés:** a napi listán járatonként a taskok, típussal, ügynökkel és státusszal; a task és az ügynök nézetben a feladattípus; a sávos nézet dobozain a feladattípus kódja.
- **Tervező:** minden task ablaka bemenet. Egy pozícióba több feladattípus is kerülhet, de ugyanannak a járatnak két különböző feladattípusú taskja nem. A kiosztás átvétele taskonként történik.
- **Import:** a járathoz a légitársaság aktív feladattípusai szerinti taskok jönnek létre; az újraimportálás a taskokat nem érinti.
- **Migráció:** létrejön az „Alap” feladattípus. Minden meglévő sablon ehhez kerül; minden légitársaságnál az „Alap” lesz az egyetlen, elsődleges feladattípus a mostani alapértelmezett sablonjával; a meglévő taskok „Alap” típusúak. A viselkedés nem változik.
- **Seed:** a demo légitársaságnál egy második, helyőrző feladattípus is, egy egyszerű, csak indulási részből álló helyőrző sablonnal, hogy a több task kipróbálható legyen. A valós GOU- és HDS-sablonokat a projekt gazdája adja meg.

### Lépésterv

1. Adatmodell és migráció: feladattípus; a légitársaság feladattípusai (sablon, aktív, elsődleges); sablon–feladattípus; a járathoz több task, a task saját sablonnal; a meglévő adatok az „Alap” típus alá. A viselkedés változatlan, a meglévő tesztek zöldek
2. Időszámítás és foglaltság taskonként (a task sablonjával és részeivel), az elsődleges task ATA/ATD-szabálya, tesztekkel
3. Járat létrehozása és import: a taskok a légitársaság aktív feladattípusai szerint
4. Admin: feladattípusok, a légitársaság feladattípusai (sablon, aktív, elsődleges), a sablonszerkesztő egy- és kétrészes sablonokkal
5. Napi lista, task nézet, ügynök nézet több taskkal járatonként
6. Sávos nézet és kiosztás taskonként; figyelmeztetés, ha ugyanazon a járaton két feladattípust ugyanaz az ember kapna
7. Tervező és kiosztás átvétele taskonként; ugyanannak a járatnak különböző feladattípusú taskjai nem kerülhetnek egy pozícióba
8. Seed (második, helyőrző feladattípus), README, STATUS.md

## 6. mérföldkő – képzések és jogosítások

**Kész** (2026. szeptember 25.). A képzési nyilvántartásból adódnak az ügynökök jogosításai, a feladatok pedig jogosításokat követelnek meg. Hiány esetén a rendszer mindenhol figyelmeztet, de nem tilt; a tervező pedig azt is ellenőrzi, hogy a pozíciók betölthetők-e valódi, érvényes jogosítású emberekkel.

### Fogalmak

- **Jogosítás (funkció):** név, kód, alapértelmezett érvényességi idő hónapban (üresen hagyva nem jár le), aktív jelölés. Egy jogosítás több légitársaság feladatához is kellhet (pl. az Altéa az A3 és a PC járatokhoz); ez a követelményekből adódik, külön lista nem kell.
- **Képzés:** név, az általa adott jogosítás (opcionális), van-e dolgozat, és ha van, a sikeresség határa százalékban.
- **Képzési rekord:** ügynök, képzés, teljesítés dátuma, a dolgozat eredménye százalékban (ha van dolgozat), sikeres-e, az érvényesség vége, megjegyzés, csatolt fájlok, ki és mikor rögzítette és módosította.
  - Dolgozatos képzésnél a sikeresség az eredményből és a határból számolódik; dolgozat nélkül a koordinátor jelöli.
  - Az érvényesség vége a teljesítés dátuma + a jogosítás érvényességi ideje; felülírható.
  - A rekord javítható, de nem törölhető (a rögzítések szabályához hasonlóan). A csatolt fájl eltávolítható, mert tévesen feltöltött dokumentum személyes adatot tartalmazhat; az eltávolítás naplózott.
- **Az ügynök jogosításai** a rekordokból számolódnak: jogosításonként a legutolsó sikeres rekord érvényessége számít. Egy későbbi sikertelen próbálkozás nem veszi el a még érvényes jogosítást. Külön, kézzel karbantartott lista nincs.
- **Érvényesség egy adott napon:** a jogosítás érvényes, ha az érvényesség vége nem korábbi az adott napnál (Europe/Budapest). A feladatoknál a task ablakának kezdőnapja számít.
- **Állapot:** érvényes; hamarosan lejár (a lejáratig legfeljebb a beállított napok száma van hátra, helyőrző: 30 nap, globális beállítás); lejárt; hiányzik.

### Követelmények

- A légitársaság feladattípusainál részenként (érkezés, indulás) megadható, milyen jogosítás vagy jogosítások kellenek. Az érkezéshez és az induláshoz jellemzően két külön jogosítás tartozik. Az admin kezeli.
- A task egy részének követelménye a légitársaság adott feladattípusának az adott részre megadott jogosításai. Az ügynök akkor felel meg, ha mindegyik érvényes nála a task ablakának kezdőnapján.

### Figyelmeztetések

- Ha a kiosztott ügynök nem felel meg a követelménynek, a rendszer figyelmeztet, de engedi: a napi lista kiosztásánál, a sávos nézetben (új ütközéstípusként), a „Kiosztás átvételénél” és a tervezői névadásnál. A figyelmeztetés megnevezi a hiányzó vagy lejárt jogosítást.

### Tervező

- A számolás bemenetében minden ablak megkapja a saját részének követelményét. Egy pozíció követelménye a taskjai követelményeinek uniója.
- Jelöltek: az aktív ügynökök. Egy nap pozíciói akkor tölthetők be, ha minden pozícióhoz rendelhető egy-egy különböző ügynök, akinél a pozíció minden követelménye érvényes aznap. Ezt párosítással kell ellenőrizni: nem elég jogosításonként megszámolni (pl. 3 PRM-es és 3 DG-s ember mellett, ha csak egynek van mindkettő, legfeljebb egy pozíció igényelheti mindkettőt).
- A számolás a betölthetőségre törekszik: egy ablakot lehetőleg olyan pozícióba tesz, amelynek követelménye már lefedi az ablakét, és nem bővít úgy egy pozíciót, hogy a nap betölthetetlenné váljon. A kiegyenlítés sem ronthatja el a betölthetőséget. A cél sorrendje egyébként változatlan.
- Ha a nap így sem tölthető be, a terv elkészül, de jelzi a hiányt: a be nem tölthető pozíciókat, és jogosításonként, hány pozíció igényli és hány ember rendelkezik vele (pl. „PRM: kell 4, van 3”).
- Névadásnál a lista elöl a megfelelő ügynököket mutatja; a többi választható, figyelmeztetéssel.

### Nézetek és jogosultságok

- **Oktatási koordinátor** (új alapértelmezett szerepkör): jogosítások, képzések és rekordok kezelése, fájlfeltöltés, a lejáró jogosítások listája; mindenkire.
- **Ügynök:** a saját képzései, jogosításai és azok állapota, telefonon is jól olvashatóan.
- **Csapatvezető:** a csapata tagjainak táblázata (ember × jogosítás, állapotszínekkel) és a csapata lejáró jogosításai.
- Új jogosultságok: „képzések kezelése” (Oktatási koordinátor, Admin) és „képzési adatok megtekintése” hatókörrel (Ügynök: saját; Műszakvezető: csapat; Oktatási koordinátor és Admin: összes). A követelmények beállítása az admin légitársaság-kezelésének része.

### Fájlok

- Saját tárhely (Docker-kötet), a rekordhoz csatolva. Megengedett típusok: PDF, JPG, PNG; legfeljebb 10 MB fájlonként (helyőrző).
- A fájl letöltése ugyanahhoz a jogosultsághoz és hatókörhöz kötött, mint a rekord megtekintése.
- Automatikus törlés nincs; a megőrzési idő még nyitott kérdés.

### Lépésterv

1. Adatmodell és migráció: jogosítás, képzés, képzési rekord, csatolmány; követelmények a légitársaság feladattípusainál, részenként; „hamarosan lejár” beállítás; új jogosultságok és az Oktatási koordinátor alapértelmezett szerepkör
2. Jogosítás-számítás tiszta függvényekként: az ügynök érvényes jogosításai egy adott napon, az állapot, a task részének követelménye és annak teljesülése; tesztek (legutolsó sikeres rekord, későbbi sikertelen próbálkozás, lejárat napja, nem lejáró jogosítás)
3. Koordinátori felület: jogosítások, képzések, rekordok rögzítése és javítása, a dolgozat eredménye, fájlfeltöltés és -eltávolítás, a lejáró jogosítások listája
4. Nézetek: ügynök (saját), csapatvezető (csapat-táblázat), koordinátor és admin (mindenki)
5. Admin: követelmények a légitársaság feladattípusainál, részenként
6. Figyelmeztetések: napi lista, sávos nézet, „Kiosztás átvétele”, tervezői névadás
7. Tervező: a követelmények a számolásban, betölthetőség párosítással, hiányjelzés, a névadás sorrendje; tesztek (köztük a 3 PRM / 3 DG / 1 mindkettő eset)
8. Seed (egy oktatási koordinátor felhasználó; jogosítások és képzések; a demo ügynököknél érvényes, hamarosan lejáró, lejárt és hiányzó jogosítás is, hogy minden állapot kipróbálható legyen), README, STATUS.md

## 7. mérföldkő – üzenetek: fogadás, feldolgozás, infografika, késéskód, MVT-küldés

**Kész** (2026. szeptember 26.), az érkezési és a korrekciós MVT előállítása nélkül: ezek a 8. mérföldkőben készültek el. A formátumok, a kódok, az ellenőrzések, a párosítás részletei és a valós minták: `docs/messages.md`. A PTM és a PSM ebben a mérföldkőben kimaradt; a 8. mérföldkőtől csak darabszámokkal dolgozzuk fel őket.

### Fogadás

- **Egyetlen belépési pont:** minden üzenet ugyanazon a feldolgozáson megy át. A külső források (később egy email- vagy SITA-átjáró, szkriptek) a fogadó API-n keresztül küldik be az üzeneteket; a kézi bemásolás a felületen ugyanezt a feldolgozást hívja.
- **Fogadó API:** `POST /api/messages`, API-kulccsal (`Authorization: Bearer …`). A törzs lehet nyers szöveg vagy JSON (`text`, opcionálisan `source` és `receivedAt`). A válasz üzenetenként megadja a felismert típust, a párosítás eredményét és a figyelmeztetéseket. Méretkorlát kérésenként: 256 KB (helyőrző).
- **API-kulcsok:** az admin hozza létre (név, aktív). A kulcs csak létrehozáskor látható, hash-elve tároljuk, visszavonható; látszik az utolsó használat ideje. Minden API-hívás naplózott (kulcs, idő, eredmény).
- **Szétválasztás:** egy szövegben több üzenet is lehet. Új üzenet ott kezdődik, ahol egy sor pontosan egy ismert típuskód (támogatott: MVT, LDM, CPM, UCM, a 8. mérföldkőtől a PSM és a PTM is; a lista bővíthető; az ADEXP slotüzeneteket a `-TITLE` sor kezdi, lásd a 8. mérföldkőt). Az UCM `IN` és `OUT` sora nem új üzenet. A típussor előtti sorokat (pl. Type B fejléc, email szöveg) a feldolgozó átugorja.
- **Nem támogatott típus** (a 8. mérföldkőig a PTM és a PSM): a tartalmát nem tároljuk. A naplóba csak a típus, a fejléc (járat, dátum) és a beérkezés ideje kerül.
- **Duplikátum:** azonos nyers szöveg nem kerül be kétszer (hash alapján), mert az átjárók újraküldhetnek; a második beküldés a meglévő üzenetre hivatkozik.

### Feldolgozás és ellenőrzés

- Típusonként hibatűrő feldolgozó, a `docs/messages.md` szerint; a mezőket mintázat alapján ismeri fel, nem csak a helyük alapján. Az ismeretlen sor figyelmeztetést ad, a feldolgozás folytatódik. A nyers szöveg mindig megmarad.
- Az ellenőrzések (összegek, UCM–CPM, LDM–CPM, késések összege) tiszta függvények; eltérésnél figyelmeztetnek, semmit nem utasítanak el.

### Párosítás a járattal

- Járatszám (a légitársaság-kód a rendszer légitársaságai alapján) + üzemnap + állomás, a `docs/messages.md` szerint; ebből dől el a járat része is (érkezési vagy indulási). A lajstrom másodlagos: ha a járaton nincs, az üzenet kitölti; ha eltér, figyelmeztetés.
- Ami nem párosítható egyértelműen, a „Párosítatlan üzenetek” listába kerül; ott kézzel hozzárendelhető egy járat részéhez, vagy elvethető (a nyers szöveg ekkor is megmarad).

### Verziók

- Ugyanarra a járatrészre érkező, azonos fajtájú üzenet (lásd `docs/messages.md`) új verzió: a korábbit nem írja felül, de mindig a legfrissebb érvényes látszik, és az számít.

### Hatás a járatra

- **Indulási MVT (BUD, AD):** az off-block a járat rendszerből kapott ATD-je (9. időszámítási szabály); a felszállás és a célállomás várható érkezése eltárolódik; a DL sor késéskódjai a járat késésrekordjai közé kerülnek (forrás: üzenet).
- **Érkezési MVT (BUD, AA):** az on-block a járat rendszerből kapott ATA-ja; a földet érés eltárolódik.
- **A BUD-ra érkező járat indulási MVT-je (más állomásról, EA … BUD):** a várható érkezés a járat ETA-ja (forrás: üzenet). A hatályos ETA/ETD a legutóbbi érték, kézi vagy üzenet (lásd „Késés és törlés”).
- **LDM, CPM, UCM:** a járatrész infografikájának forrásai; a járat idejét nem változtatják.
- Minden változás a járatnaplóba kerül, az üzenetre hivatkozva.

### „Üzenetek” fül és infografika

- A járaton új fül, a műszakvezető és az ügynök is látja (a jogosultság szerint): bejövő és kimenő üzenetek járatrészenként, a verziókkal; a nyers és a feldolgozott tartalom; a figyelmeztetések.
- **Infografika, fix elrendezésben,** járatrészenként, az adott rész érvényes üzeneteiből (akár bejövők, akár a mi kimenőink), telefonon is jól olvashatóan:
  - utasok: férfi, nő, gyerek, infant és összesen;
  - rakomány: összesen, rakterenként, főfedélzet; kategóriánként, ha az üzenet megadja;
  - ULD-k pozíció szerint, kategóriával és különleges kóddal; az üres ULD-halmok;
  - különleges kódok összesítése (pl. ELI, ELM, PER, BIG), pozíciókkal;
  - az SI szabad szövegként, változatlanul (a 8. mérföldkőtől; az SI-ből nem olvasunk súlyadatot);
  - a figyelmeztetések, és minden blokknál a forrásüzenet és a beérkezés ideje.
- A személyre szabható elrendezés később jön.

### Késéskód

- **Kódtábla:** kód, leírás, aktív; az admin kezeli. A seedben csak a mintákban szereplő kódok (36, 68, 93, a 8. mérföldkőtől a slotok miatt a 81 és a 82 is), a leírásuk az IATA-szabvány szerinti. A légitársaság saját kódjai dokumentumként tölthetők fel (a 8. mérföldkő utómunkája).
- **Késésrekord a járat indulási részén:** kód és perc, több is lehet; forrása kézi vagy üzenet; ki és mikor rögzítette. Rögzítheti, aki az indulási részt módosíthatja.
- **Ellenőrzés:** ha a késések összege nem egyezik a késéssel (7. időszámítási szabály), figyelmeztetés.

### MVT előállítása és küldése

- **Előállítás** a járat adataiból és a rögzítésekből, szerkeszthető előnézettel:
  - indulási MVT: fejléc (járatszám, üzemnap, lajstrom, BUD), `AD` a hatályos off-blockkal és a kézzel megadott felszállással, `EA` a célállomással (kézzel), `DL` a késésrekordokból, SI;
  - érkezési MVT: `AA` a kézzel megadott földet éréssel és a hatályos on-blockkal;
  - korrekciós MVT: egy korábban küldött MVT alapján.
  - Az érkezési és a korrekciós MVT pontos formátumához még nincs minta; amíg a projekt gazdája nem ad, ezt a kettőt ne építsd meg, és jelezd a STATUS.md-ben.
  - Az előállított szöveget a saját feldolgozónk visszaolvassa, és ugyanazokat az értékeket kell kapnia (teszt).
- **Címjegyzék:** légitársaságonként és üzenettípusonként címzettek; egy címzett email-cím vagy SITA Type B cím (7 karakter). A feladó email-címe és Type B címe globális beállítás. Az admin kezeli.
- **Küldés** az előnézetből, egy gombbal, a jóváhagyott szöveggel:
  - email: SMTP-n, a kapcsolat adatai környezeti változókban (nem az adatbázisban);
  - SITA: átjárón keresztül. Az átjáró fajtája még nyitott, ezért a küldés cserélhető csatorna. Amíg nincs átjáró beállítva, a SITA-címzett „nem küldhető – nincs átjáró” állapotot kap, és a szöveg másolható.
  - **Biztonsági alapállás:** ha nincs beállítva valódi csatorna, a küldés csak naplóz, semmi nem hagyja el a rendszert. A demo és a fejlesztői környezet így nem küldhet véletlenül valódi címre.
- **Kimenő üzenet:** tárolódik a járat „Üzenetek” fülén, címzettenkénti állapottal (elküldve, hiba, nem küldhető), ki és mikor küldte. A kimenő MVT a járat idejét nem változtatja, mert az a rögzítésekből készült.

### Jogosultságok

- „Üzenetek megtekintése” hatókörrel (Ügynök: a saját taskjai járatai; Műszakvezető és Admin: összes).
- „Üzenetek rögzítése” (kézi bemásolás, párosítatlanok kezelése): Műszakvezető, Admin.
- „Üzenetek küldése” hatókörrel (Ügynök: a saját indulási, illetve érkezési része; Műszakvezető és Admin: összes).
- „Üzenetküldés beállításai” (API-kulcsok, címjegyzék, késéskód-tábla, a légitársaságok késéskód-dokumentuma): Admin.

### Adatmodell (kiegészítés)

- **Flight:** részenként lajstrom (registration); az érkezési részhez indulóállomás (origin), az indulási részhez célállomás (destination). Az import a meglévő `Orig`/`Dest` oszlopból tölti.
- **Message:** irány (bejövő, kimenő), típus, nyers szöveg, hash, forrás (kézi, API a kulcs nevével, előállított), beérkezés ideje, fejlécmezők, feldolgozott adat, figyelmeztetések, járat és rész (opcionális: párosítatlan), a verziókulcs, melyik verziót váltja, érvényes-e, ki rögzítette.
- **MessageDelivery:** kimenő üzenet, címzett, csatorna, állapot, hibaüzenet, idő.
- **DelayCode**, **DelayRecord**, **ApiKey**, **AddressBookEntry**; az API-hívások és a nem támogatott üzenetek naplója.

### Lépésterv

1. Adatmodell és migráció a fenti kiegészítésekkel; új jogosultságok; az import tölti a lajstromot, az indulóállomást és a célállomást, ha a párosítás megadja
2. Feldolgozó alapok: szétválasztás, típusfelismerés, fejléc (járatszám, nap vagy teljes dátum, lajstrom, állomás), a „nincs” változatai; tesztek a mintákkal (köztük: az UCM `OUT` sora nem új üzenet; Type B fejléc a típussor előtt)
3. Típusonkénti feldolgozók: MVT, LDM, CPM (mezősorrend-független), UCM; tesztek mind a nyolc mintára
4. Párosítás járatra és részre, a párosítatlanok; tesztek (köztük az ET3365/12: 17-én jön, a 12-i járathoz párosul)
5. Ellenőrzések tiszta függvényként; tesztek a két ismert hibára (`docs/messages.md`)
6. Hatás a járatra és verziózás: ATD/ATA, ETA, késésrekordok, járatnapló; tesztek
7. Fogadó API és API-kulcsok (admin), naplózás, duplikátumszűrés, méretkorlát; kézi bemásoló felület; „Párosítatlan üzenetek” lista
8. „Üzenetek” fül (műszakvezető és ügynök)
9. Infografika, fix elrendezésben
10. Késéskód-tábla (admin) és késésrekordok a járaton, ellenőrzéssel
11. Indulási MVT előállítása előnézettel és visszaolvasási teszttel; címjegyzék; küldés email és SITA csatornán, biztonságos alapállással; kimenő üzenetek állapottal. Az érkezési és a korrekciós MVT csak minta után
12. Seed (demo üzenetek a demo járatokhoz, a minták alapján; minta címjegyzék nem létező címekkel; a három késéskód), README (API-példa `curl`-lel, a küldés beállítása), STATUS.md

## 8. mérföldkő – üzenetek bővítése: pontosabb feldolgozás, érkezési és korrekciós MVT, PSM, PTM, slot

**Kész** (2026. szeptember 28.); az utómunkával együtt (2026. szeptember 30.). A leírás a megépült működés referenciája; a megvalósítás pontosításai a „További eldöntött szabályok” 55–65. pontjában. A formátumok, a Lufthansa-változatok, a PSM, a PTM, a slotüzenetek és az új minták: `docs/messages.md`. Az „Ellenőrzés a Lufthansa-mintán” táblázat a feldolgozó elvárt eredménye.

**Az SI-t nem dolgozzuk fel.** A tartalma légitársaságonként és üzenetenként nagyon eltér, ezért ebben a mérföldkőben csak az üzenet törzsét olvassuk; az SI szabad szövegként, változatlanul marad meg és jelenik meg.

### A feldolgozó javításai

A 7. mérföldkő feldolgozója a 2026. szeptember 27-i mintacsomagon ezeken a pontokon hibázik; ezeket kell javítani:

1. **Szétválasztás:** a típussor előtti `COR` sor a következő üzenethez tartozik, és korrekciót jelez; a `-TITLE` sor új üzenetet kezd. Így a PTM után jövő slotüzenet nem olvad bele a PTM-be.
2. **LDM:** az infant nem számít bele a PAX-összegbe; a Lufthansa-változat előtag nélküli főfedélzeti mezője; a `JMP`, `CRW` és `PAD` (osztályonként) felismerése. A `CRW` és a `PAD` jelentése nyitott, ezek nyersen megmaradnak. (A `DHC` az SI része, lásd a 4. pontot.)
3. **CPM:** egy pozíción több tétel; a kategória utáni számjegy a szabad negyedek száma (`BY0` = BY, 0 negyed szabad); `VR` kézi rakodású pozíción; `D` a személyzet poggyásza, nem rakomány; `Q` sürgős cargo; a Lufthansa-kódok (`XOM`, `XCS`) kódként megmaradnak; állomás nélküli fejléc.
4. **SI:** nem dolgozzuk fel. Az `SI` sortól az üzenet végéig (a CPM-nél a `CPM END`-ig) minden sor szabad szöveg: változatlanul megmarad és megjelenik, és **nem** ad „ismeretlen sor” figyelmeztetést. A `docs/messages.md` leírja a mintákban látott SI-elemeket, de ezek feldolgozása későbbi.
5. **Ellenőrzések** csak az üzenet törzséből, a `docs/messages.md` szerint: férfi + nő + gyerek = PAX (infant nélkül); főfedélzet + rakterek = T; a CPM-pozíciók rakterenként, a személyzet poggyásza (D) nélkül = az LDM rakterei. A Lufthansa-minta ezeken figyelmeztetés nélkül megy át; a korábbi nyolc minta viselkedése nem változik (a két ismert hibát továbbra is jelzi).

### Érkezési és korrekciós MVT

- **Érkezési MVT előállítása:** `AA földetérés/on-block`; a földet érést kézzel, az on-blockot a hatályos ATA-ból. Előnézettel, visszaolvasási teszttel, ugyanazzal a címjegyzékkel és küldéssel, mint az indulási.
- **Korrekciós MVT:** egy korábban küldött MVT-ből, a javított értékekkel, előtte `COR` sorral. Az eredeti kimenő üzenet megmarad, a korrekció új verzió.
- **Bejövő korrekció:** új verzió „Korrekció” jelöléssel. Ha ATD-t vagy ATA-t hoz, a rendszerérték a korrekció szerint frissül, a járatnaplóba kerül.
- **Más állomásról jövő `AA`** egy BUD-ról induló részhez: célállomási érkezés, tájékoztatásként látszik, a járat idejét nem változtatja.

### PSM és PTM, név nélkül

- **Csak a származtatott darabszámokat tároljuk:**
  - PSM: célállomásonként, kódonként (pl. WCHR, WCHS) és osztályonként a darabszám;
  - PTM: továbbjáratonként (járatszám és célállomás) és osztályonként az utasszám, a poggyász darabszáma és súlya.
- **Nem tároljuk:** a nevet, az ülést, a csatlakozó járatot az egyes utasoknál, a nyers szöveget és annak hash-ét. A feldolgozási figyelmeztetés, a napló és az API-válasz sem tartalmazhat sort a szövegből. Duplikátumszűrés a fejléc, a rész száma és a származtatott adat alapján.
- Több rész (`PART1`, `PART2` …): részenként külön verzió, együtt adják az állapotot.
- Unit teszt biztosítja, hogy a mintákból semmilyen név nem kerül a tárolt adatba és a figyelmeztetésekbe.
- A PSM és a PTM a meglévő „Üzenetek megtekintése” jogosultsággal látszik, mert név nincs benne.

### Slotüzenetek (SAM, SRM)

- ADEXP-feldolgozó a `docs/messages.md` szerint. Más `TITLE`: felismerve, nyersen tárolva, „nem feldolgozott” jelzéssel.
- **Repülőtér-tábla:** IATA-kód, ICAO-kód, név; az admin kezeli. Seed: BUD/LHBP és a demo- és mintajáratok repülőterei.
- **Párosítás** a `docs/messages.md` szerint: először az `IFPLID` alapján, különben útvonal + `EOBD` + `EOBT` (±2 óra, helyőrző), pontosan egy jelölttel; egyébként párosítatlan. Kézi hozzárendeléskor az `IFPLID` a járatrészhez kötődik, így a későbbi SRM magától párosul.
- **Az indulási részen:** CTOT, gurulási idő, cél off-block (CTOT − gurulási idő), a szabályozások, az ok és a késéskód. A napi listán és a járaton „Slot hh:mm” jelöléssel.
- **Figyelmeztetés,** ha a tervezett off-block (indulási horgony) később van, mint a cél off-block + slot-tűrés (globális beállítás, helyőrző: 10 perc).
- A slot nem írja át az ETD-t. A „Késés rögzítése” és az indulási MVT DL sora felajánlja a slotból adódó időt és késéskódot (pl. 81).

### Infografika bővítése

- Legfelül: a legutóbbi LDM és CPM SI-szövege változatlanul, jól láthatóan, feldolgozás nélkül. Így a keretezett üzemi utasítás (pl. „TAILTIPPING CRITICAL AIRCRAFT…”) és a DAA is látszik.
- Pozíciónként a kategóriák súlya; a konténerek szabad negyedei.
- A sürgős (Q) cargo kiemelve; a személyzet poggyásza (D) külön.
- Érkezési részen: a PSM darabszámai kódonként és osztályonként (pl. „WCHR: 1, business”); az átszálló utasok továbbjáratonként (PTM).
- Indulási részen: a slot és a cél off-block.

### Adatmodell (kiegészítés)

- **Airport:** iataCode, icaoCode, name.
- A slot a járat indulási részéhez tartozó érvényes slotüzenetből adódik; a párosításhoz az `IFPLID` a járatrészen tárolódik.
- **Setting:** slot-tűrés percben (helyőrző: 10).
- A PSM és a PTM üzenetnél a nyers szöveg és a hash helyén a származtatott adat van.

### Jogosultság

- A repülőtér-tábla és a slot-tűrés az „Üzenetküldés beállításai” jogosultsághoz tartozik (Admin).

### Lépésterv

1. Szétválasztás javítása (`COR`, `-TITLE`), tesztekkel a teljes 2026. szeptember 27-i mintacsomagra egyben
2. LDM és CPM javításai és a Lufthansa-változatok, az SI szabad szövegként, a törzsből számolt ellenőrzések; teszt: a Lufthansa-minta figyelmeztetés nélkül, a régi minták változatlanul
3. PSM és PTM feldolgozása, csak darabszámokkal; teszt, hogy név nem kerül a tárolt adatba és a figyelmeztetésekbe
4. Érkezési és korrekciós MVT előállítása, a bejövő korrekció kezelése, más állomásról jövő AA; visszaolvasási tesztek
5. ADEXP-feldolgozó (SAM, SRM), repülőtér-tábla (admin), párosítás, slot a járaton, slot-figyelmeztetés, felajánlás a késésnél és az MVT-nél
6. Infografika bővítése
7. Seed (a 2026. szeptember 27-i minták a demo járatokra átírva, egy SAM és egy SRM a demo indulásokra, repülőtér-tábla), README, STATUS.md

### Utómunka (a 9. mérföldkő előtt)

1. **Késéskódok légitársaságonként:** a légitársasághoz feltölthető a saját késéskód-dokumentuma (PDF, legfeljebb 10 MB, helyőrző), amely a járatról megnyitható: a késésrekordoknál, a „Késés rögzítése” műveletnél és az indulási MVT DL sorának szerkesztésénél. Ha a légitársaságnak nincs dokumentuma, ugyanott az alapértelmezett, közös kódtábla nyílik meg (kód és leírás). A kódtábla közös marad; a benne nem szereplő kód továbbra is megmarad, figyelmeztetéssel.
   - Légitársaságonként egy dokumentum. Az új feltöltés cseréli a régit, a régi fájl a tárhelyről törlődik; a dokumentum el is távolítható. A feltöltés, a csere és az eltávolítás naplózott (ki, mikor, milyen fájl).
   - Feltölteni az „Üzenetküldés beállításai” jogosultsággal lehet (Admin); megnyitni az is, aki a járat valamelyik taskját látja. A fájl a képzési csatolmányok tárhelyén (Docker-kötet) van, a letöltés jogosultságát a szerver ellenőrzi.
   - Seed: az alapértelmezett tábla leírásai az IATA-szabvány szerint: 36 tankolás vagy üzemanyag-leeresztés (üzemanyag-szállító); 68 a kabinszemélyzet hibája vagy külön kérése; 81 útvonali légiforgalmi korlátozás vagy kapacitás; 82 útvonali légiforgalmi korlátozás létszámhiány vagy berendezéshiba miatt; 93 gépforgás: a gép késve érkezett egy másik járatról vagy az előző szakaszról. A demo légitársasághoz egy saját készítésű minta-PDF (nem valódi légitársasági dokumentum).

## 9. mérföldkő – létszámigény

**Kész** (2026. szeptember 30.); az utómunkával együtt (2026. október 1.). A leírás a megépült működés referenciája; a megvalósítás pontosításai a „További eldöntött szabályok” 66–72. pontjában. Hány ügynök kell egyszerre, 15 perces sávokban, a foglaltsági ablakokból, és ez hogyan viszonyul a valós beosztáshoz. Tiszta függvények, külső AI nélkül. A sávos idősoros nézeten továbbra sem jelenik meg, mert a tervezés más logika szerint működik. A légitársaságonkénti kimutatások később jönnek, a valós adatokkal.

### Számítás

- **Sáv:** 15 perc, a naptári napon (00:00–24:00, Europe/Budapest), a nap elejétől számolva. Óraátállítás napján a sávok a valós időt követik (92 vagy 100 sáv).
- **Igény egy sávban:** a sávon belül a legtöbb egyszerre futó foglaltsági ablak (lásd Ügynök-foglaltság), félig nyitott intervallumokkal: a sáv elejével végződő és a sáv végével kezdődő ablak nem számít bele.
- **Bemenet:** minden task foglaltsági ablaka, minden feladattípusból, a hatályos időkből, így a késéssel együtt mozog. A törölt részek és a „nincs teendő” taskok kimaradnak. Az éjfélen átnyúló ablak mindkét nap sávjaiba beleszámít. Az igény a kiosztástól független.
- **Bontás:** feladattípusonként és összesen. Az összesen a minden ablakból együtt számolt csúcs, nem a feladattípusonkénti csúcsok összege.
- **Beosztás:** sávonként azoknak az ügynököknek a száma, akik a valós rétegben operatív részben vannak, és éppen nincsenek egy nem operatív rész blokkjában; a sáv értéke a sávon belüli legkisebb szám. A beosztás nincs feladattípusra és jogosításra bontva, mert az ügynökök nincsenek feladattípushoz kötve.
- **Hiány és többlet:** az összesített igény és a beosztás különbsége sávonként; a hiány kiemelve.

### Nézet

Külön oldal, asztali gépre; telefonon ne törjön el, de nem arra optimalizált. Minden idő helyi időben (Europe/Budapest).

- **Napi nézet** napválasztóval: lépcsős grafikon (a sáv értéke állandó) az összesített és a feladattípusonkénti igénnyel, a beosztás vonalával és a hiányos sávok kiemelésével; alatta táblázat sávonként: idő, igény feladattípusonként és összesen, beosztás, hiány vagy többlet.
- **Többnapos áttekintés:** legfeljebb 31 napos időszak; nap × sáv táblázat az összesített igénnyel, színezve, a hiányos sávok kiemelve; naponként a napi csúcs és az ideje, valamint a legnagyobb hiány. Egy napra kattintva a napi nézet nyílik.

### Jogosultság

- Új jogosultság: „létszámigény megtekintése”, alapértelmezés szerint a Tervező, a Műszakvezető és az Admin szerepkörben. Hatókör nélkül: mindig az összes járatból számol.

### Lépésterv

1. Utómunka: késéskód-dokumentum légitársaságonként, az alapértelmezett tábla IATA-leírásai (lásd fent)
2. Tiszta függvények (`lib/staffing/`): a nap sávjai óraátállítással, csúcs a sávban, feladattípusonként és összesen; tesztek (félig nyitott határ, egyperces ablak, éjfélen átnyúló ablak, óraátállítás napja, törölt rész, az összesen nem a típusok összege)
3. Beosztás és hiány: operatív részek a blokkok nélkül, a sáv legkisebb értéke; tesztek (részben lefedett sáv, blokk a sáv közepén, éjfélen átnyúló műszak)
4. Adatréteg: a nappal átfedő ablakok (nem csak az aznap kezdődők, mint a tervezőnél), a valós réteg műszakjai és blokkjai, a sávos nézet meglévő adatrétegére építve; a „létszámigény megtekintése” jogosultság, szerveroldali ellenőrzéssel
5. Napi nézet: grafikon és táblázat
6. Többnapos áttekintés
7. Seed (a demo napon legalább egy hiányos sáv), README, STATUS.md

### Utómunka (a 10. mérföldkő előtt)

1. **Tervezet a létszámigényben:** a még nem publikált napokon a tervezet réteg műszakjai adják a beosztást, ugyanazzal a számítással (operatív rész, blokkon kívül, a sáv legkisebb értéke), „tervezet” jelöléssel; a hiány és a többlet ugyanúgy látszik. A napi nézetben és a többnapos áttekintésben is jelölve van, melyik nap számol a tervezetből. A tervezetből számolt beosztást csak az látja, aki a beosztás tervezetét is láthatja (alapból a Tervező és az Admin); a többieknek ezeken a napokon csak az igény látszik, mint eddig. Tesztekkel; README, STATUS.md.

## 10. mérföldkő – oktatás: e-vizsga, on the job gyakorlás (OJT) és kibocsátás

**Kész** (2026. október 1.); az utómunkával együtt. A leírás a megépült működés referenciája; a megvalósítás pontosításai a „További eldöntött szabályok” 73–79. pontjában. A 6. mérföldkő képzéseire épül. Egy képzésnek lehet elméleti és gyakorlati része, mindkettő vizsgával. Akinek minden előírt része sikeres, azt egy jogosult ember kibocsátja: ettől dolgozhat önállóan, mert a kibocsátás hozza létre a sikeres képzési rekordot, és abból adódik a jogosítás (6. mérföldkő). A meglévő működés nem változik: a képzési rekord kézi rögzítése megmarad (pl. papíron vagy korábban teljesített képzésekhez), és ez adja az első mentorok és vizsgáztatók jogosítását is.

### A képzés részei

- Képzésenként beállítható: elméleti rész (e-vizsgával), gyakorlati rész (OJT és gyakorlati vizsga), vagy mindkettő. Például az első képzés elmélet, OJT és gyakorlati vizsga; egy ismétlő képzés csak elmélet.
- Az elméleti vizsga sikerességi határa a képzés meglévő határa.
- **OJT-követelmény** képzésenként: legalább hány megfelelő gyakorlás kell (helyőrző: 10). Megfelelő az a gyakorlás, amelyet a mentor megfeleltnek értékelt, és amelynek automatikus mutatói elérik a képzés küszöbeit: a kötelező mérföldkövek teljessége (helyőrző: 100%) és a zöld vagy sárga eltérésű rögzítések aránya (helyőrző: 0%, vagyis nincs küszöb).

### Képzési folyamat

- Egy ügynök részvétele egy képzésben, a koordinátor indítja. Részenként látszik az állapota (elméleti vizsga, OJT, gyakorlati vizsga), a kísérletek és az értékelések. Állapot: folyamatban, kibocsátható, kibocsátva, megszakítva.
- Egy ügynöknek egy képzésből egyszerre egy nyitott folyamata lehet.

### Elméleti e-vizsga

- **Kérdésbank:** a kérdés szövege és típusa (egy helyes válasz, több helyes válasz, szöveges válasz), a válaszlehetőségek és a helyesek, pontszám, témakör (opcionális), aktív.
- **Vizsgalap:** név, képzés, a kérdések sorrendben, időkorlát (opcionális). A kérdésbank és a vizsgalap szabadon létrehozható és szerkeszthető a „vizsgák szerkesztése” jogosultsággal.
- **Kitöltés:** a vizsgáztató vagy a koordinátor megnyitja a kísérletet a vizsgázónak, aki a saját belépésével tölti ki, telefonon is. A kísérlet megnyitáskor elmenti a vizsgalap és a kérdések másolatát, így a későbbi szerkesztés nem változtatja meg (mint a lezárt task pillanatképe).
- **Javítás:** a választós kérdéseket a rendszer javítja (több helyes válasznál csak a teljesen helyes válasz ér pontot, helyőrző), a szöveges válaszokat a vizsgáztató pontozza, megjegyzéssel. Amíg van javítatlan szöveges válasz, a kísérlet „javításra vár”. Az eredmény a pontok aránya százalékban; sikeres, ha eléri a határt.
- **Visszajelzés és belső megjegyzés,** két külön mező. A visszajelzést a vizsgázó is látja. A belső megjegyzést (mi nem sikerült, mire figyeljen a következő vizsgáztató) csak a vizsgáztatók, a kibocsátásra jogosultak és a koordinátor látják; a következő kísérletnél a korábbiak látszanak.
- A vizsgázó a saját eredményét, pontjait és a visszajelzést látja, a helyes válaszokat nem, hogy a kérdésbank újrahasznosítható maradjon.
- A vizsga ismételhető; minden kísérlet megmarad.

### On the job gyakorlás (OJT)

- **Gyakornok a mentor mellett:** a task részéhez (érkezési, indulási) egy gyakornok vehető fel; a rész kiosztott ügynöke a mentor. Gyors fordulónál mindkét rész az érkezési gyakornoké, ahogy az ügynöknél (8. időszámítási szabály). Felvételkor meg kell adni a gyakornok nyitott képzési folyamatát, amelybe a gyakorlás számít.
- Felveheti, aki taskot oszthat ki. Csak olyan rész mellé vehető fel, amelynek ügynöke mentor lehet; ha az ügynök később olyanra változik, aki nem lehet mentor, figyelmeztetés.
- A gyakornok a taskot az ügynök nézetében „OJT” jelöléssel látja, és a rész mérföldköveit rögzítheti; a rögzítésnél látszik, hogy gyakornok rögzítette. A mentor a gyakornok rögzítéseit javíthatja. A számításokban ezek ugyanúgy számítanak, mint az ügynök rögzítései.
- A gyakornok foglaltsága a sávos nézetben a saját sávján „OJT” jelöléssel látszik, és az ütközésvizsgálatba beleszámít; a létszámigénybe nem.
- **Értékelés gyakorlásonként:** a mentor a task után megfelelt vagy nem felelt meg, szöveges megjegyzéssel. Mellette az automatikus mutatók a rész rögzítéseiből: a kötelező mérföldkövek teljessége, a gyakornok által rögzített mérföldkövek aránya, az eltérések színek szerint. A folyamatban látszik, hány gyakorlás megfelelő, és teljesül-e a követelmény.

### Gyakorlati vizsga

- Valódi járaton, egy task részén, a vizsgáztató értékel. Értékelési szempontok képzésenként (a „vizsgák szerkesztése” jogosultsággal szerkeszthetők), mindegyik megfelelt vagy nem felelt meg, megjegyzéssel; a végeredmény sikeres vagy sikertelen; visszajelzés és belső megjegyzés, mint az e-vizsgánál.
- Ha az OJT-követelmény még nem teljesül, figyelmeztet, de engedi.

### Kibocsátás

- Ha a képzés minden előírt része sikeres (elméleti vizsga, OJT-követelmény, gyakorlati vizsga), a folyamat „kibocsátható”. A kibocsátásra jogosult egy gombbal kibocsátja: létrejön a sikeres képzési rekord (a teljesítés napja a kibocsátás napja, az érvényesség a jogosítás szerint, a dolgozat eredménye az elméleti vizsgáé), hivatkozással a folyamatra. Ettől érvényes a jogosítás.
- A kibocsátás naplózott (ki, mikor).

### Mentor és vizsgáztató

- Mentor az lehet, akinek „mentorálás” jogosultsága van, és a képzés jogosítása nála érvényes a gyakorlás napján. Vizsgáztató az, akinek „vizsgáztatás” jogosultsága van, és a képzés jogosítása nála érvényes a vizsga napján. Jogosítást nem adó képzésnél elég a jogosultság.

### Jogosultságok

- „Vizsgák szerkesztése” (kérdésbank, vizsgalapok, gyakorlati szempontok, a képzés részei és OJT-követelménye): Oktatási koordinátor, Admin.
- „Mentorálás”: új alapértelmezett Mentor szerepkör, Admin.
- „Vizsgáztatás” (e-vizsga megnyitása és javítása, gyakorlati vizsga): új alapértelmezett Vizsgáztató szerepkör, Oktatási koordinátor, Admin.
- „Kibocsátás”: Oktatási koordinátor, Admin. A folyamat indítása és megszakítása a meglévő „képzések kezelése” jogosultsággal.
- A gyakornok felvétele a taskok kiosztására vonatkozó jogosultsággal.
- A folyamat, az eredmények és a visszajelzések a meglévő „képzési adatok megtekintése” jogosultsággal és hatókörével látszanak (ügynök: saját; csapatvezető: csapat; koordinátor és admin: összes). A belső megjegyzést csak a vizsgáztatás, a kibocsátás vagy a képzések kezelése jogosultsággal lehet látni.

### Lépésterv

1. Adatmodell és migráció: a képzés részei és OJT-követelménye; kérdésbank, vizsgalap, vizsgakísérlet másolattal; képzési folyamat; gyakornok a task részén, gyakorlás-értékelés; gyakorlati vizsga szempontokkal; kibocsátás; új jogosultságok, a Mentor és a Vizsgáztató alapértelmezett szerepkör. A meglévő működés változatlan, a tesztek zöldek
2. Tiszta függvények: az e-vizsga pontozása és eredménye; az OJT-mutatók és a követelmény teljesülése; a folyamat állapota; mentor és vizsgáztató alkalmassága; tesztek
3. Kérdésbank, vizsgalap, gyakorlati szempontok és a képzés részeinek szerkesztése
4. E-vizsga: megnyitás, kitöltés (telefonon is), automatikus javítás, a szöveges válaszok javítása, visszajelzés és belső megjegyzés
5. Képzési folyamat: indítás, megszakítás, áttekintés részenként (koordinátor, vizsgáztató, csapatvezető, ügynök)
6. OJT a taskon: a gyakornok felvétele, nézete és rögzítései, a mentor javítása és értékelése, a mutatók, a sávos nézet
7. Gyakorlati vizsga
8. Kibocsátás: „kibocsátható” jelzés, jóváhagyás, a képzési rekord létrehozása
9. Seed (egy Mentor és egy Vizsgáztató felhasználó; egy képzés mindkét résszel, rövid kérdésbankkal; egy félúton lévő és egy kibocsátható folyamat), README, STATUS.md

### Utómunka (a 11. mérföldkő előtt)

1. **Kizáró szempontok a gyakorlati vizsgán:** az értékelési szempontnál jelölhető, hogy kizáró-e. Ha egy kizáró szempont nem felelt meg, a vizsga végeredménye automatikusan sikertelen, és a vizsgáztató nem írhatja át; ha minden kizáró szempont megfelelt, a végeredményt továbbra is a vizsgáztató adja. A vizsga elmenti a szempontok akkori kizáró jelölését, így a későbbi szerkesztés nem változtatja meg. Tesztekkel; seed: legalább egy kizáró szempont; README, STATUS.md.

## 11. mérföldkő – földi eszközök és hibajegy

**Kész** (2026. október 1.). A leírás a megépült működés referenciája; a megvalósítás pontosításai a „További eldöntött szabályok” 80–87. pontjában. Az összes földi eszköz (motoros és nem motoros: pushback, szalagkocsi, busz, lépcső, GPU, dolly …) műszaki nyilvántartása, és hibajegy, amelyet bárki beadhat, a Műszaki pedig kezel.

### Eszközök

- **Eszköztípus:** név, kód, aktív, és a műszaki adatok mezőlistája (lásd lent). A Műszaki és az Admin kezeli.
- **Eszköz:** típus, azonosító (pl. flottaszám), rendszám (opcionális), leírás, állapot (üzemképes, üzemképtelen, kivonva), megjegyzés. Nem törölhető, csak kivonható.
- **Műszaki adatok:** eszköztípusonként szerkeszthető, kézzel bővíthető mezőlista. Mezőfajták:
  - határidő (dátum, lejárat-figyeléssel: érvényes, hamarosan lejár, lejárt, mint a jogosításoknál);
  - számláló (üzemóra vagy km, kézzel rögzített értékkel, opcionális esedékességi értékkel; figyelmeztet, ha elérte);
  - szöveg.
  - Alapmezők a seedben: műszaki vizsga lejárata (határidő), szerviz esedékessége (határidő és számláló), üzemóra vagy km (számláló).
  - Az értékek eszközönként szerkeszthetők; minden változás naplózott (ki, mikor, régi és új érték).
- **Dokumentumok:** eszközönként feltölthető fájlok (pl. forgalmi, szervizlap, fotó; PDF, JPG, PNG, legfeljebb 10 MB, helyőrző) a meglévő tárhelyen; az eltávolítás naplózott.
- **„Hamarosan lejár”** az eszközöknél: külön globális beállítás napokban (helyőrző: 30).
- **Lejáró határidők listája:** két csoport (hamarosan lejár, lejárt), csak aktív, nem kivont eszközökkel.

### Hibajegy

- **Jelentés:** bárki, aki be van lépve, hibát jelenthet egy eszközre, telefonról is: eszköz, leírás, fotók (opcionális), és jelölheti, hogy az eszköz üzemképtelen.
- Az üzemképtelennek jelentett eszköz állapota azonnal üzemképtelen lesz; üzemképesre a Műszaki állítja vissza.
- **Állapotok:** nyitott → folyamatban (a Műszaki átvette) → lezárva (javítva, vagy nem hiba). Megjegyzések a jegyen, időrendben, ki és mikor írta. Minden állapotváltás naplózott.
- **Kinek látszik:** a Műszaki minden jegyet lát és kezel; a műszakvezető minden jegyet és az eszközök állapotát látja; a jelentő a saját jegyeit. Az eszközlistán az állapot, a nyitott jegyek száma és a legközelebbi határidő látszik.
- **Jelzés:** a Műszakinak a menüben a nyitott jegyek száma. Emailes értesítés később.

### Jogosultságok

- „Eszközök kezelése” (eszköztípusok és mezőlisták, eszközök, műszaki adatok, dokumentumok): új alapértelmezett Műszaki szerepkör, Admin.
- „Hibajegyek kezelése” (átvétel, megjegyzés, lezárás, az állapot visszaállítása): Műszaki, Admin.
- „Hiba jelentése”: minden alapértelmezett szerepkör.
- „Hibajegyek megtekintése” hatókörrel (Ügynök: saját; Műszakvezető, Műszaki, Admin: összes).

### Lépésterv

1. Adatmodell és migráció: eszköztípus mezőlistával, eszköz, mezőértékek naplóval, dokumentumok, hibajegy fotókkal és megjegyzésekkel; új jogosultságok és a Műszaki alapértelmezett szerepkör; az eszközök „hamarosan lejár” beállítása
2. Tiszta függvények: a határidő és a számláló állapota, az eszköz állapota a hibajegyekből, a hibajegy állapotátmenetei; tesztek
3. Eszköztípusok és mezőlisták szerkesztése
4. Eszközök: lista, adatlap, a műszaki adatok szerkesztése naplóval, dokumentumok
5. Hibajegy jelentése telefonról, fotóval
6. Hibajegyek kezelése (Műszaki): átvétel, megjegyzések, lezárás; a műszakvezető és a jelentő nézete
7. Lejáró határidők listája; jelzés a menüben
8. Seed (egy Műszaki felhasználó; néhány eszköztípus és eszköz minden határidő-állapottal; egy nyitott, egy folyamatban lévő és egy lezárt jegy), README, STATUS.md

## 12. mérföldkő – ügynöki beosztásnézet

**Kész** (2026. október 2.). A leírás a megépült működés referenciája; a megvalósítás pontosításai a „További eldöntött szabályok” 88–90. pontjában. Az ügynök a telefonján látja a saját beosztását, a publikáltat és a valósat, és azonnal észreveszi, ha a valós eltér a publikálttól. A beosztását a naptárába is mentheti, vagy feliratkozhat rá, így a változások maguktól megjelennek.

### Szabályok

- **Jogosultság:** a meglévő „beosztás megtekintése” jogosultság hatókörrel; az Ügynök szerepkör alapból megkapja, saját hatókörrel. Így a beosztás táblázatában is csak a saját sorát látja. A tervezetet továbbra sem látja (2. mérföldkő).
- **„Beosztásom” nézet,** telefonra optimalizálva, az ügynök nézetéből elérhetően:
  - heti lista, lapozható, a beosztás táblázatának heti ablakához igazodva; naponként a műszak kezdete és vége;
  - a napra koppintva a műszak részei: típus, kezdet, vég, helyszín, leírás; a blokk az oda- és visszautazási idővel;
  - a valós réteg az elsődleges; ahol eltér a publikálttól, kiemelve, a publikált mellette, és hogy mikor módosult (pl. „Publikált: 06:00–14:00 → Valós: 08:00–16:00, módosult: 10. 02. 07:30”). Az eltérés ugyanazzal az összevetéssel számol, mint a beosztás táblázatában. A módosulás ideje a valós műszak vagy bármely részének legutóbbi változása; ehhez a műszak módosítási ideje a részek változásakor is frissül;
  - a még nem publikált napon „Még nincs publikálva”; a nap, amelyen nincs műszakja, „Szabad”.
- **Napi összefoglaló:** az ügynök napi taskjai fölött a napi műszak (kezdet, vég, a blokkok), az eltérés jelölésével.
- Az éjfélen átnyúló műszak a kezdése napjánál jelenik meg (2. mérföldkő).
- **Naptár:** szabványos iCalendar (.ics), így bármelyik naptárral működik (Outlook és Microsoft 365, Google, Apple, Thunderbird stb.). Külső szolgáltatás, regisztráció és céges IT-engedély nem kell hozzá: a saját szerverünk adja, és az alkalmazás üzemeltetője kezeli. Az Outlook-kompatibilitásra külön figyelünk, mert céges környezetben gyakori.
  - **Mentés a naptárba:** a „Beosztásom” nézetből .ics fájl tölthető le a megjelenített hétre vagy egy választott időszakra (legfeljebb 31 nap), amelyet a telefon vagy a gép naptára importál. Ez egyszeri másolat, a későbbi változásokat nem követi.
  - **Feliratkozás:** az ügynök személyes feliratkozási linket kér, és a naptárában URL-ből feliratkozik rá (Outlookban: „Naptár hozzáadása → Feliratkozás a webről”); a naptár ezután magától frissíti a beosztását.
  - A link a felhasználóhoz kötött titkos kulcsot tartalmaz, mert a naptárprogram nem tud belépni. Csak olvasásra jó, és csak a saját beosztását adja. A kulcsot hash-elve tároljuk; a link csak létrehozáskor látszik (mint az API-kulcsnál); újragenerálással a régi érvénytelenné válik. Inaktív felhasználó linkje nem működik. Látszik az utolsó lekérés ideje; az admin a felhasználó oldalán visszavonhatja.
  - **Tartalom** (a letöltésben és a feliratkozásban ugyanaz): a publikált napok valós műszakjai; a feliratkozásban a mai naptól 7 napra visszamenőleg és minden jövőbeli publikált nap (helyőrző). Nem publikált nap és tervezet nincs benne. Műszakonként egy esemény: a cím a műszak ideje (pl. „Műszak 06:00–14:00”), a leírásban a részek (típus, idő, helyszín, leírás, a blokk az utazási idővel), és ha a valós eltér a publikálttól, a megjegyzésben: „Módosult: <a módosulás ideje>. Publikált: <a publikált műszak ideje és részei>”. Az esemény azonosítója a műszakhoz kötött, így módosításkor frissül, nem duplikálódik; a törölt műszak eltűnik.
  - Az idők Europe/Budapest szerint, óraátállítással helyesek. A széles kompatibilitás (köztük az Outlook) miatt: az időpontok UTC-ben (a naptárprogram a saját időzónájára váltja), a naptár neve „Beosztás – <név>”, a javasolt frissítési idő admin beállítás (helyőrző: 1 óra; `REFRESH-INTERVAL`, `X-PUBLISHED-TTL`; a naptárprogram figyelmen kívül hagyhatja), a link `https`, és `.ics`-re végződik.
  - **Üzemeltetés:** a feliratkozási link a szerver nyilvános címéből készül, amelyet az üzemeltető környezeti változóban ad meg (pl. `APP_PUBLIC_URL`). Ha nincs beállítva, feliratkozás nem kérhető, csak a letöltés működik, és a felület ezt jelzi. Az admin látja, kinek van élő linkje és mikor kérték le utoljára, és bármelyiket visszavonhatja.
  - A frissítés gyakoriságát a naptárprogram dönti el (az Outlook a weben nagyjából 3 óránként, de akár 24 óránál is lassabban; a Google akár naponta egyszer), ezért azonnali értesítésre nem alkalmas. A feliratkozáshoz a szervernek elérhetőnek kell lennie onnan, ahonnan a naptár lekéri (az Outlook a weben és a Google a saját szervereiről, tehát interneten át, HTTPS-sel); a céges Microsoft 365-ben az IT a külső naptárra való feliratkozást korlátozhatja. Ezt a README írja le.

### Lépésterv

1. Jogosultság (az Ügynök szerepkör saját hatókörrel, migrációval) és adatréteg: az ügynök saját publikált és valós műszakjai egy hétre, az eltérés a meglévő összevetéssel; tesztek
2. „Beosztásom” nézet telefonra: heti lista, napi részletek, eltérés kiemelése, „Még nincs publikálva”, „Szabad”
3. Napi összefoglaló az ügynök nézetében
4. Naptár: az .ics előállítása tiszta függvényként (tesztek: stabil eseményazonosító, óraátállítás, éjfélen átnyúló műszak, a módosulás és a publikált műszak a leírásban, a szöveg szabványos escape-elése és sortördelése, az Outlook-kompatibilis fejléc); letöltés; feliratkozási link (kulcs hash-elve, újragenerálás, visszavonás, utolsó lekérés), tesztekkel
5. Seed (ha kell: legalább egy eltérő és egy nem publikált nap a demo ügynököknél), README (a feliratkozás beállítása a gyakori naptárakban: Outlook, Google, Apple; az üzemeltetés feltételei: nyilvános HTTPS-cím, például fordított proxyval és automatikus tanúsítvánnyal, és az `APP_PUBLIC_URL`), STATUS.md

## 13. mérföldkő – üzemeltetés: éles telepítés bérelt szerverre

**Ezt építjük most,** a szokásos terv-jóváhagyással. A projekt gazdája egy bérelt Linux szerveren (VPS) üzemelteti az alkalmazást, saját domainnel és HTTPS-sel. A cél: egy ember néhány paranccsal telepíteni, frissíteni, menteni és visszaállítani tudja, és lássa, ha baj van. A domainen és a szerveren kívül külső szolgáltatás nem kell.

### Telepítés

- Külön éles Compose-fájl (pl. `docker-compose.prod.yml`): az alkalmazás, az adatbázis, a mentés és egy Caddy fordított proxy, amely automatikusan szerez és megújít tanúsítványt (Let's Encrypt) a megadott domainre. Kívülről csak a 80-as és a 443-as port látszik; az adatbázisé és az alkalmazásé nem.
- A beállítások egy `.env` fájlban; a mintája a repóban van, értékek nélkül: domain, `APP_PUBLIC_URL`, az Auth.js titka, az adatbázis jelszava, SMTP. Titok nem kerül a repóba és a naplóba. Ha egy kötelező beállítás hiányzik, az alkalmazás nem indul el, és megmondja, mi hiányzik.
- **Éles módban nincs demo adat:** a demo seed éles módban nem fut le (megtagadja). Az első admin felhasználót egy egyszeri parancs hozza létre (név, felhasználónév, jelszó bekérve), ha még nincs admin.
- Induláskor a migrációk lefutnak; ha egy migráció hibázik, az alkalmazás nem indul el.

### Biztonság

- Csak HTTPS (a HTTP átirányít), HSTS, biztonságos sütik.
- **Belépési kísérletek korlátozása:** felhasználónként és IP-címenként legfeljebb 5 sikertelen kísérlet 15 percen belül (helyőrző), utána várakozni kell; naplózva. A fogadó API és a naptárvégpont is korlátozott a túl sok kérés ellen (helyőrző értékekkel).

### Mentés és visszaállítás

- **Napi automatikus mentés:** az adatbázis és a feltöltött fájlok egy időbélyeges csomagba, a szerver mentési könyvtárába; a régebbiek törlődnek (helyőrző: 14 napot őrzünk). A mentés a Compose része, nem kell hozzá a szerver crontabja.
- **Kézi mentés** egy paranccsal (pl. frissítés előtt).
- **Visszaállítás** egy paranccsal, egy kiválasztott mentésből, megerősítéssel. A README lépésről lépésre leírja, és egy próba-visszaállítást is egy üres környezetbe, hogy kiderüljön, működik-e a mentés.
- A mentés szerveren kívüli másolata az üzemeltető dolga; a README egyszerű módot javasol (pl. letöltés a saját gépre `rsync`-kel).
- Az admin oldalon látszik a legutóbbi sikeres mentés ideje; ha 2 napnál régebbi (helyőrző), figyelmeztetés.

### Frissítés

- Egy szkript: mentés, az új verzió letöltése (git), építés, újraindítás a migrációkkal, végül állapotellenőrzés. Ha az állapotellenőrzés hibát ad, a szkript megáll, és leírja, hogyan lehet visszaállni (az előző verzió és a mentés).
- A futó verzió (commit és dátum) az admin oldalon és az állapotvégponton látszik.

### Állapotfigyelés

- **Állapotvégpont** (pl. `/api/health`): elérhető-e az adatbázis, írható-e a feltöltési könyvtár, melyik a verzió; belépés nélkül, de érzékeny adat nélkül. A Docker ebből látja, ha az alkalmazás beteg, és újraindítja.
- A naplók forgatása méretkorláttal, hogy ne teljen be a lemez.
- A README leírja, hogyan állítható egy külső figyelő (pl. egy ingyenes uptime-figyelő) a végpontra; ez opcionális.

### Dokumentáció

- README „Éles üzemeltetés” fejezet: a szerverigény (memória, lemez; helyőrző értékekkel), a VPS előkészítése (Docker, tűzfal: 22, 80, 443), a domain DNS-beállítása, az első indítás, az első admin, a mentés, a visszaállítás, a frissítés, a hibaelhárítás.

### Lépésterv

1. Éles mód: a beállítások ellenőrzése induláskor, a `.env` mintája, a seed tiltása éles módban, az első admin létrehozása paranccsal; tesztek
2. Éles Compose-fájl Caddyvel (HTTPS, HSTS, csak 80 és 443), naplóforgatás, állapotvégpont és Docker-állapotfigyelés
3. A belépési kísérletek és a nyilvános végpontok korlátozása, naplózással; tesztek
4. Mentés (napi és kézi) és visszaállítás szkriptekkel, megőrzési idővel; a legutóbbi mentés az admin oldalon; próba-visszaállítás
5. Frissítési szkript állapotellenőrzéssel; a verzió az admin oldalon
6. README „Éles üzemeltetés”, STATUS.md

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
12. **Ügynök = csapattag:** a kódban az „ügynök” a csapat tagja; minden ügynök egy csapat tagja.
13. **Beosztás táblázat:** heti ablakban jelenik meg.
14. **Beosztás szerkesztése:** a tervezet és a valós rétegben a rész és a műszak eltávolítható; a publikált réteg zárolt.
15. **Blokk:** csak nem operatív részből képezhető.
16. **Járat részének elhagyása:** egy rész nem hagyható el a járatból, ha már van hozzá rögzítés vagy rendszerből kapott ATA/ATD.
17. **Törölt rész:** nem rögzíthető rá mérföldkő és késés. A listán a saját napján marad, áthúzva; a napszűrés a meglévő részek szerint számol.
18. **ETA/ETD módosítása:** csak a „Késés rögzítése” művelettel; minden változás a járatnaplóba kerül.
19. **Állóhely:** nem kötelező; az importált járatnak nincs, a műszakvezető tölti ki.
20. **Menetrendi dátum:** a járat üzemnapja, vagyis az indulás napja az indulóállomáson. Ez azonosítja a két részt, és ez szerepel az üzenetek fejlécében is.
21. **Újraszámolás:** a kézi módosítások mellett a neveket is törli. A tervezetbe már mentett műszakok megmaradnak, a nap következő mentése cseréli őket.
22. **Elavult terv:** menthető, és a kiosztás átvehető, figyelmeztetéssel; az átvétel a taskok mostani alakja szerint dolgozik.
23. **A terv olvasása:** a kiosztási jogosultsággal is lehet (a Műszakvezetőnek az átvételhez kell); módosítani csak „Tervezés” jogosultsággal lehet.
24. **Pozíció foglaltsága:** az ablakai uniója.
25. **Terv hossza:** legfeljebb 31 nap. A „Mentés a tervezetbe” a teljes tervre szól.
26. **Szünet a tervben:** a műszak közepéhez legközelebbi, elég hosszú rés jelölődik (a teljes rés); a minimumig kitolt műszak üres vége is résnek számít.
27. **Sablon a taskon:** a járat űrlapján légitársaság választható, a sablon a task tulajdonsága.
28. **A járat légitársasága** csak akkor módosítható, ha még nincs rögzítés; ilyenkor a taskok újra létrejönnek.
29. **Elsődleges jelölés:** a taskon is tárolódik.
30. **Járatszintű megjelenítés** (napszűrés, sorrend, „Késik”, késés): az elsődleges task szerint.
31. **Közös rész nélküli task:** „nincs teendő” állapotú.
32. **Sablon és feladattípus:** a sablon részei a létrehozásakor dőlnek el; feladattípus nem törölhető.
33. **Inaktív jogosítás:** nem választható, és az ellenőrzések figyelmen kívül hagyják.
34. **Lejáró jogosítások listája:** két csoport (hamarosan lejár, lejárt), csak aktív jogosításokkal.
35. **Gyors forduló követelménye:** az ablak követelménye a két rész követelményeinek uniója.
36. **Követelmény forrása:** mindig a légitársaság feladattípusának mostani beállítása; a taskon nem fagy be.
37. **Képzési rekord:** az ügynök kivételével minden mezője javítható; az érvényesség vége alapból számolt, kézzel felülírható.
38. **Fájl eltávolítása:** a fájl a tárhelyről törlődik, a naplósor megmarad.
39. **Tervező és jogosítások:** a jelöltek az aktív ügynökök, a beosztástól függetlenül. A hiányjelzés megtekintéskor számolódik, a nyilvántartás aktuális adataival, de az érvényességet mindig a terv adott napjára vizsgálja, nem a mai napra.
40. **„Hamarosan lejár”:** a napok száma globális beállítás (Admin → Beállítások).
41. **Érkezési MVT:** az `AA` sor földet érés / on-block, ugyanabban az alakban, mint az `AD` (a projekt gazdája megerősítette).
42. **Kézzel felvett járat üzemnapja:** alapból a menetrendi idő budapesti napja.
43. **„Üzenetek” fül:** a task nézetben.
44. **Késéskód és MVT:** a járat módosítására jogosult és a rész ügynöke (bármelyik taskon) rögzíti, illetve küldi.
45. **Késés-ellenőrzés:** csak akkor, ha már van ATD.
46. **Duplikátum:** a hash a normalizált szövegből készül, a boríték (Type B fejléc, email szöveg) nélkül.
47. **Törölt rész:** üzenet nem hat rá.
48. **Verziók sorrendje:** a beérkezés sorrendje.
49. **Kimenő üzenetek:** saját verziókulcson; a járat idejére nem hatnak.
50. **Kézi késésrekord:** törölhető, a törlés naplózott; az üzenetből jött késésrekord nem.
51. **Időpont napjának feloldása:** a nappal megadott időpont a menetrendi időhöz legközelebbi; a nap nélküli időpont az előtte álló időt követő első.
52. **UCM:** ha egy UCM-ben `IN` és `OUT` is van, az első számít, figyelmeztetéssel.
53. **CPM `.TW` sor:** összsúlyként olvassuk, amíg a jelentése nem tisztázott.
54. **Küldés:** email nodemailerrel; a seed címei csak `.invalid` doménre mutatnak.
55. **SI a 7. mérföldkő után:** a korábbi SI-feldolgozás (LDM nettó bontás, CPM-súlyok, TOW-ellenőrzés) megszűnt; az SI szabad szöveg.
56. **CPM `Q`:** a `Q` és utána egy karakter kontúrkód (pl. `Q5`); a magában álló `Q` kategória a sürgős cargo.
57. **PSM és PTM tárolása:** a nyers szöveg helyén a darabszámok szöveges alakja áll, boríték és az eredeti szöveg hash-e nélkül; az olvashatatlan sorból csak a darabszám marad, a tartalma nem.
58. **Nem feldolgozott slot-`TITLE`:** nyersen tárolódik, a járatra nincs hatása.
59. **Slot-párosítás:** az útvonalhoz a járat célállomása kell; célállomás nélkül a slotüzenet csak kézzel rendelhető hozzá. Az `IFPLID` a járat indulási részén tárolódik.
60. **Slot-figyelmeztetés:** a task nézetben és a napi listán, az elsődleges task indulási horgonyával.
61. **Slot-felajánlás:** a „Késés rögzítése” az ETD-hez, az MVT DL sora a késéskódhoz; a felajánlott perc = cél off-block − STD.
62. **Korrekciós MVT:** a küldött MVT kártyájáról indítható.
63. **Érkezési MVT:** a 44. szabály szerint küldhető, ha már van hatályos ATA.
64. **Repülőtér:** nem törölhető.
65. **Késéskód-dokumentum megnyitása:** a közös kódtábla helyben nyílik le, a légitársaság PDF-je új lapon. Megnyithatja az is, aki járatot kezel, vagy a dokumentumokat feltöltheti.
66. **Létszámigény és státusz:** minden task beleszámít az igénybe, a státuszától függetlenül.
67. **Beosztás nélküli nap:** ha a nap saját rétegében (publikált napon a valós, nem publikált napon a tervezet) nincs műszak, az igény látszik, hiány nem jelölődik; az előző napról átnyúló műszak sem teszi hiányossá.
68. **Többnapos áttekintés:** az oszlopok a helyi óra negyedórái; óraátállításkor tavasszal üres cellák, ősszel a két azonos negyedóra közül a nagyobb igény és a nagyobb hiány, megjelölve. Alapból mától egy hét; a 31 napnál hosszabb időszakot elutasítja.
69. **Beosztás a létszámigényhez:** mindenki beleszámít, akinek a valós rétegben operatív része van.
70. **Nappal átfedő ablakok:** az előző és a következő nap járatai is betöltődnek; feltevés, mint a tervezőnél: egy ablak legfeljebb a szomszédos napra nyúlik át.
71. **A műszak rétege a létszámigényben:** a műszak a kezdőnapja szerinti rétegből számít (publikált napon a valós, nem publikált napon a tervezet); a nem publikált napra felvitt valós műszak és a publikált napra felvitt tervezet nem számít.
72. **Tervezet láthatósága a létszámigényben:** akinek nincs joga a tervezethez, a nem publikált napon csak az igényt látja, akkor is, ha valós műszak van rá.
73. **Elméleti rész:** csak dolgozattal és sikerességi határral rendelkező képzésnek lehet. Ha a képzésnek dolgozata van, a gyakorlati rész mellé az elméleti is kell, és elméleti résszel a dolgozat nem kapcsolható ki.
74. **E-vizsga pontozása:** a több helyes válaszú kérdés pontozása vizsgalaponkénti paraméter (csak a teljesen helyes válasz ér pontot, vagy arányos). A megválaszolatlan szöveges kérdés 0 pont, nem vár javításra. A kísérlet a sikerességi határt is lemásolja.
75. **E-vizsga kitöltése:** minden válasz azonnal mentődik; az időkorlát a vizsgázó Kezdés gombjától fut, lejártakor a mentett válaszok beadódnak. A folyamat megszakításakor a nyitott kísérlet is a mentett válaszokkal beadódik.
76. **Kérdés és értékelési szempont:** nem törölhető, csak inaktiválható.
77. **OJT-értékelés:** a task lezárása után, egyszer, csak futó folyamatban; a mutatók az értékeléskor rögzülnek.
78. **Gyakorlati vizsga:** a folyamat oldaláról indul, a vizsgázó elmúlt 14 napjának egy olyan task részén, ahol ügynök vagy gyakornok volt; rögzítés után nem módosítható. A végeredményt a vizsgáztató adja (a kizáró szempontokra lásd a 10. mérföldkő utómunkáját).
79. **Kibocsátás:** a teljesítés napja a kibocsátás napja; a rekordba az utolsó sikeres e-vizsga eredménye kerül.
80. **Eszköztípus mezői:** a mező fajtája csak addig módosítható, amíg nincs értéke; mező nem törölhető, csak inaktiválható.
81. **Határidő és számláló:** a határidő a lejárat napján még érvényes, kitöltetlenül „nincs megadva”; a számláló „elérte”, ha az állás eléri az esedékességet. A szerviz esedékessége egy határidő-mező és a számláló esedékessége együtt.
82. **Lejáró határidők listája:** „hamarosan lejár” és „lejárt vagy elérte” (az esedékességet elért számlálók a lejártak között); csak aktív típusú, nem kivont eszközök, aktív mezők.
83. **Hibajelentés:** csak nem kivont eszközre; legfeljebb 5 fotó (JPG, PNG vagy PDF, fájlonként 10 MB, jegyenként összesen 25 MB); az ügynök nézetéből és az eszköz adatlapjáról is indítható.
84. **Hibajegy kezelése:** nyitott jegy közvetlenül is lezárható; visszanyitás nincs. Megjegyzést a Műszaki ír, lezárt jegyhez is (pl. utólagos alkatrész-információ), a jegy ettől nem nyílik újra; a jegyet látók olvassák.
85. **Az eszköz visszaállítása:** üzemképesre a Műszaki külön lépésben állítja, az adatlapon vagy lezáráskor az „az eszköz üzemképes” pipával; az állapotváltás naplója a hibajegyre hivatkozik, ha onnan jött.
86. **Eszközlista:** a műszakvezető (és aki minden hibajegyet lát) olvassa, a Műszaki és az Admin szerkeszti.
87. **Nyitott jegyek száma a menüben:** oldalbetöltéskor és minden műveletnél frissül, nem élőben.
88. **„Beosztásom”:** a hét hétfőtől indul; az éjfélen átnyúló műszak „22:00–06:00 (+1)” alakban látszik; eltérésnél a publikált részek is; a valós rétegből törölt műszaknál a módosulás ideje nem jelenik meg.
89. **Az ügynök kezdőoldala:** belépés után továbbra is a saját taskjai, a beosztás megtekintése ellenére.
90. **Feliratkozási link:** HTTP-n csak `localhost`-on fogadható el (fejlesztéshez), egyébként `https` kell. A rossz vagy visszavont kulcsot, az inaktív felhasználót és azt, aki elvesztette a saját beosztásához való jogát, 404 zárja ki. A linket a felhasználó és az admin is visszavonhatja.

## Később (most ne építsd)

- Személyre szabható elrendezés: az ügynök drag and droppal állítja be, mit lát és hogyan, felhasználónként mentve. Csak azután, hogy a fix elrendezés bevált.
- A lezárt taskok utólagos javításának jogosultsága
- A beosztás TRN részének összekötése egy konkrét képzéssel
- Földi eszközök: az eszköz hozzárendelése a taskhoz; emailes értesítés a hibajegyekről
- Naptár: a kiosztott taskok is a naptárban; értesítés a beosztás változásáról (email vagy push)
- E-vizsga: véletlen kérdéshúzás a kérdésbankból, képek a kérdésekben
- További slotüzenetek (pl. slottörlés), minta után
- Az SI elemeinek feldolgozása (DAA, célállomásonkénti nettó bontás, poggyászdarabszámok, LOAD IN CPTS, B-sorok), ha a minták alapján egységesíthető
- Email- és SITA-átjáró a bejövő üzenetekhez (a fogadó API-ra csatlakozik)
- A BUD-on lévő ULD-készlet követése az UCM-ekből
- Járatinfó: a sablonban definiált egyedi mezők taskonként (pl. utaslétszám, különleges igények)
- Szolgáltatások rögzítése taskonként, időpontokkal
- Kimutatások légitársaságonként (kiszállítás és beszállítás hossza, földi idő, késések), a valós adatok után
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
