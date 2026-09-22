# Ground Handling App – projektleírás

*Verzió: 4 · 2026. szeptember 22.*

Nyílt forráskódú webalkalmazás repülőtéri földi kiszolgálás (ground handling) szervezésére. Minden járatfordulóhoz egy task tartozik, benne mérföldkövekkel, amelyeknek van tervezett és tényleges időpontja. A mérföldkövek légitársaságonként testreszabható sablonokból jönnek. A hozzáférés szerepkör alapú.

Ez a fájl a projekt fő leírása. Ha a domain logika nem egyértelmű, kérdezz, ne találj ki új üzleti szabályt.

## Tech stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth.js (felhasználónév/jelszó alapú belépés)
- Tailwind CSS
- Vitest a unit tesztekhez
- Docker Compose (app + adatbázis), hogy bárki egy paranccsal elindíthassa
- Külső AI API-t nem használunk

## Fogalmak

- **Forduló (turnaround):** a gép megérkezik, kiszolgálják, majd újra elindul. Egy fordulóhoz egy task tartozik.
- **STA / ETA / ATA:** tervezett / várható / tényleges érkezés (ATA = on-block).
- **STD:** tervezett indulás.
- **ATD / off-block:** tényleges indulás, amikor a gép elhagyja az állóhelyet.
- **Mérföldkő (milestone):** egyetlen időpont a fordulón belül (pl. „Last pax out”). Az ügynök egy gombnyomással rögzíti a tényleges idejét.
- **Gyors forduló:** a kiszolgálás folyamatos, jellemzően egy ügynök végzi.
- **Hosszú forduló:** az érkezési és az indulási rész között szünet van, a két részt végezheti ugyanaz vagy két külön ügynök.

## Szerepkörök

| Szerepkör | Jogosultság |
|---|---|
| ADMIN | Mindenhez hozzáfér. Felhasználókat, légitársaságokat és sablonokat kezel. |
| SHIFT_LEAD (műszakvezető) | Járatokat és taskokat hoz létre, módosít. Ügynököket rendel a taskokhoz. Minden taskot lát, bármelyik rögzített időt javíthatja. |
| AGENT (ügynök) | Csak a hozzá rendelt taskokat látja. Rögzíti a mérföldkövek tényleges idejét, a saját rögzítéseit javíthatja. |

A jogosultságot szerveroldalon is ellenőrizni kell, nem elég a felületen elrejteni.

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
- **Flight:** airline, template, inboundFlightNumber, outboundFlightNumber, sta, eta (opcionális), std, stand, ata (opcionális, külső rendszerből), atd (opcionális, külső rendszerből)
- **Task:** flight (1:1), status (PLANNED | IN_PROGRESS | COMPLETED), arrivalAgent (opcionális), departureAgent (opcionális). A két ügynök lehet ugyanaz a személy.
- **MilestoneRecord:** task, milestoneDefinition, actualTime, recordedBy, recordedAt, updatedBy, updatedAt

Minden időpontot UTC-ben tárolunk, a felületen helyi időben (Europe/Budapest) jelenítjük meg.

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
2. **Indulási horgony (tervezett off-block):** az STD és az (érkezési horgony + `minTurnaroundMinutes`) közül a későbbi. Így ha a gép késve érkezik, a rendszer magától gyors forduló szerint számol.
3. **Tervezett mérföldkő-idő:** horgony + offset. Egy mérföldkő tervezett ideje nem lehet korábbi az előző mérföldkő tervezett idejénél; ha az lenne, az előző idejére kerül. (Például gyors fordulónál a „First pax in” a „Last pax out” idejére tolódik.)
4. **Ellenőrzés gyors fordulóra (STD = ATA + 25):** a tervezett idők ATA-hoz képest: 0, +1, +1, +2, +10, +10, +20, +22, +24, +25.
5. **Eltérés:** tényleges − tervezett. Az ATA és az ATD sorában a tényleges idő a hatályos érték (9. pont). Színjelölés: legfeljebb 0 perc zöld, 1–5 perc sárga, 5 perc fölött piros (a küszöbök később beállíthatók legyenek).
6. **Sorrend-ellenőrzés:** ha egy rögzített idő korábbi, mint egy előtte lévő mérföldkő rögzített ideje, a rendszer figyelmeztet, de nem tiltja le a mentést.
7. **Késés:** hatályos ATD (9. pont) − STD, ha pozitív.
8. **Forduló típusa:** a két foglaltsági ablak közötti szabad idő dönti el.
   - érkezési ablak vége = utolsó érkezési mérföldkő tervezett ideje + `travelMinutes`
   - indulási ablak eleje = indulási horgony − `departureReportMinutes` − `travelMinutes`
   - szünet = indulási ablak eleje − érkezési ablak vége
   - Ha a szünet legalább `minBreakMinutes`: hosszú forduló. A két rész ügynöke külön választható, a műszakvezető dönt.
   - Egyébként gyors forduló, egy összefüggő foglaltsági ablakkal. A rendszer ugyanazt az ügynököt javasolja mindkét részre.
   - Így a két ablak soha nem fedheti át egymást.
9. **Hatályos ATA / ATD:** a Flight `ata` / `atd` mezője (külső rendszerből), ha ki van töltve; különben az `ATA` / `ATD` kódú mérföldkő rögzített értéke. Az ügynök saját rögzítése a rendszerérték mellett is megmarad és látható, de a számításokban a rendszerből kapott érték számít.

## Ügynök-foglaltság (a későbbi létszámszámításhoz)

Már most legyen függvény és teszt rá, a felület a 2. mérföldkőben jön.

- **Gyors forduló:** egy foglaltsági ablak, érkezési horgony − `travelMinutes`-tól tervezett off-block + `postDepartureMinutes`-ig. (A demo sablonnal ez 45 perc.)
- **Hosszú forduló, két ablak:**
  - érkezési rész: érkezési horgony − `travelMinutes` → utolsó érkezési mérföldkő + `travelMinutes`
  - indulási rész: indulási horgony − `departureReportMinutes` − `travelMinutes` → tervezett off-block + `postDepartureMinutes`
  - (Feltételezés: a szünetben az ügynök bemegy, ezért számolunk vissza- és kiutazással. Később pontosítható.)
- **Létszámigény:** egy adott időpontban az átfedő foglaltsági ablakok száma, 15 perces sávokra bontva.
- Az ablakok félig nyitott intervallumok (kezdet ≤ t < vég), így az egymásba érő ablakok nem számítanak átfedésnek.
- Unit tesztek: a küszöb körüli esetek (szünet = `minBreakMinutes` − 1 és = `minBreakMinutes`), és annak ellenőrzése, hogy hosszú fordulónál a két ablak soha nem fedi át egymást.

## 1. mérföldkő (MVP) – ezt építsd most

1. Projekt alapváz: Next.js + TypeScript, Prisma, PostgreSQL, Tailwind, ESLint, Vitest, Docker Compose.
2. Prisma séma a fenti adatmodell szerint, migrációval.
3. Seed adatok: 1 admin, 1 műszakvezető, 2 ügynök; 1 demo fapados légitársaság a fenti sablonnal; 4 példajárat egy napra (legalább egy gyors, egy hosszú, és kettő, amelyek időben átfedik egymást). Legalább egy járatnál legyen kitöltve a rendszerből kapott `ata` és `atd`, hogy a megjelenítés kipróbálható legyen.
4. Belépés és szerepkör alapú védelem (middleware + szerveroldali ellenőrzés minden műveletnél).
5. `lib/turnaround.ts` az időszámítási és foglaltsági szabályokkal, unit tesztekkel, köztük a 4. pont gyors fordulós ellenőrzésével.
6. Oldalak:
   - **Napi járatlista** (műszakvezető): idő szerint rendezve, task-státusszal, ügynök-hozzárendeléssel (érkezési és indulási rész).
   - **Task nézet:** mérföldkő-idővonal, soronként tervezett / tényleges / eltérés, „Most” gomb a rögzítéshez, és kézi időmódosítás.
   - **Ügynök nézet:** csak a saját taskjai. Telefonra optimalizálva, nagy gombokkal, mert az ügynökök a forgalmi előtéren telefonról használják.
   - Az ATA és az ATD sorában (task nézet és ügynök nézet) a rendszerből kapott érték és az ügynök saját rögzítése egymás mellett látszik. Az ügynök akkor is rögzíthet saját értéket, ha van rendszerérték.
   - **Admin:** légitársaságok és sablonok szerkesztése (a sablon paraméterei, valamint a mérföldkövek sorrendje, horgonya, offsetje, kötelező volta és része).
7. README: telepítés és indítás Docker Compose-zal.

A külső rendszerből való ATA/ATD-átvételt most nem építjük meg; a Flight `ata` és `atd` mezője a seed adatokon kívül üres maradhat.

## Később (most ne építsd)

- Létszámigény nézet (idősávos táblázat vagy grafikon)
- Járatinfó: a sablonban definiált egyedi mezők taskonként (pl. utaslétszám, különleges igények)
- Szolgáltatások rögzítése taskonként, időpontokkal
- Késéskód rögzítése, ha van késés
- Kimutatások légitársaságonként (kiszállítás és beszállítás hossza, földi idő, késések)
- Járatadatok importja, köztük az ATA és az ATD átvétele külső rendszerből
- Korrekciós üzenet küldése a külső rendszer felé (ATA/ATD javítása)
- Több nyelv támogatása

## Munkamód

- Kódban, azonosítókban és commit üzenetekben angol nyelv; a felület szövegei magyarok, egy helyen összegyűjtve, hogy később fordíthatók legyenek.
- Kis lépésekben haladj: minden lépés után legyen futtatható állapot és commit.
- Új funkció előtt röviden vázold a tervet, és várd meg a jóváhagyást.
- Ha ezt a fájlt módosítod, a tetején lévő verziószámot növeld eggyel, és frissítsd a dátumot.
