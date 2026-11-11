# Járatok, taskok és időszámítás

A járat, a sablon, a feladattípus, a task és a rögzítés szabályai, az időszámítás, az ügynök-foglaltság, a késés és a törlés, valamint a járatos nézetek. A számítások tiszta függvények a `lib/turnaround.ts` modulban, unit tesztekkel.

## Fogalmak

- **Forduló (turnaround):** a gép megérkezik, kiszolgálják, majd újra elindul. Egy fordulóhoz feladattípusonként egy task tartozik.
- **STA / ETA / ATA:** tervezett / várható / tényleges érkezés (ATA = on-block).
- **STD / ETD:** tervezett / várható indulás.
- **ATD / off-block:** tényleges indulás, amikor a gép elhagyja az állóhelyet.
- **Adatok pontossága:** a menetrendi STA/STD-t felülírja a várható ETA/ETD, azokat pedig a tényleges ATA/ATD. A tényleges érték a legpontosabb.
- **Mérföldkő (milestone):** egyetlen időpont a fordulón belül (pl. „Last pax out”). Az ügynök egy gombnyomással rögzíti a tényleges idejét.
- **Gyors forduló:** a kiszolgálás folyamatos, egy ügynök végzi.
- **Hosszú forduló:** az érkezési és az indulási rész között szünet van, a két részt végezheti ugyanaz vagy két külön ügynök.
- **Állomás:** a repülőtér, ahol a kiszolgálás folyik. Ma egy állomás van (BUD, Europe/Budapest), minden adat az övé; a több állomás terve: `docs/tervek/14-tobb-allomas.md`.
- **Időpontok:** minden időpontot UTC-ben tárolunk, a felületen helyi időben (Europe/Budapest) jelenítjük meg.

## Járat

- Egy járat egy forduló egy állomáson: egy érkezési és egy indulási rész, közös légitársasággal és állóhellyel.
  - Érkezési rész: járatszám, STA, ETA (opcionális), ATA (opcionális, rendszerből kapott érték), indulóállomás, lajstrom.
  - Indulási rész: járatszám, STD, ETD (opcionális), ATD (opcionális, rendszerből kapott érték), célállomás, lajstrom.
- A két rész külön-külön opcionális, de legalább az egyiknek meg kell lennie. Ha csak az érkezési rész van, a gép itt marad (csak érkező járat); ha csak az indulási, a gép már itt van (csak induló járat). Lásd a 11. időszámítási szabályt.
- **Rendszerből kapott ATA és ATD:** üzenetből (MVT, `docs/spec/uzenetek.md`) vagy az Ikarus-importból (`docs/spec/jaratrend-import.md`) érkezik; kézzel nem állítható.
- **Forrás:** a járat kézzel, járatrend-importból vagy Ikarus-importból jön létre. A járat létrehozásakor a taskok automatikusan létrejönnek (lásd Feladattípusok).
- **Járat űrlap** (aki járatot kezelhet, alapból a műszakvezető): légitársaság, járatszámok, STA, STD, állóhely, indulóállomás, célállomás, lajstrom. Ha mindkét rész megvan, az STD-nek később kell lennie az STA-nál; csak érkező vagy csak induló járat is felvehető. Sablon az űrlapon nem választható: a sablon a task tulajdonsága.
- **A járat légitársasága** csak akkor módosítható, ha még nincs rögzítés; ilyenkor a taskok újra létrejönnek.
- **Egy rész elhagyása:** egy rész nem hagyható el a járatból, ha már van hozzá rögzítés vagy rendszerből kapott ATA/ATD.
- **Állóhely:** nem kötelező; a járatrend-importból jött járatnak nincs, a műszakvezető tölti ki. Az Ikarus-import kitölti és felülírja, ha a mentés ad állóhelyet.
- **Menetrendi dátum:** a járat üzemnapja, vagyis az indulás napja az indulóállomáson. Ez azonosítja a két részt, és ez szerepel az üzenetek fejlécében is.
- **Kézzel felvett járat üzemnapja:** alapból a menetrendi idő budapesti napja.

## Sablon és mérföldkövek

- A sablon egy légitársaság egy feladattípusához tartozik, és állhat érkezési részből, indulási részből vagy mindkettőből.
- **A sablon paraméterei** (a demo értékek helyőrzők):
  - `minTurnaroundMinutes` (gyors forduló ATA-tól off-blockig): 25
  - `travelMinutes` (kiutazás / visszautazás): 5
  - `postDepartureMinutes` (pushback + visszautazás + papírmunka): 15
  - `departureReportMinutes` (hosszú fordulónál ennyivel az indulás előtt kint kell lenni): 40
  - `minBreakMinutes` (hosszú fordulónál a két foglaltsági ablak között legalább ennyi szabad időnek kell lennie, különben a forduló gyors, összekapcsolt taskként számít; nem lehet negatív): 15
- **Mérföldkő-definíció:** sorrend, kód, név, horgony (ARRIVAL | DEPARTURE), offset percben, kötelező-e, rész (érkezési | indulási). A horgony és a rész független egymástól.
- **ATA és ATD mérföldkő:** az `ATA` kódú mérföldkő megvan minden sablonban, amelynek van érkezési része, az `ATD` kódú minden sablonban, amelynek van indulási része. Kötelezők, nem törölhetők, a kódjuk nem módosítható, mert ezekhez kapcsolódik a rendszerből kapott érték. Ezt a szerver is ellenőrzi.
- **Sablon szerkesztése:** rögzítéssel rendelkező mérföldkő nem törölhető. Az ATA és az ATD horgonya, offsetje, része és kötelező volta zárolt (ATA: ARRIVAL, 0, érkezési; ATD: DEPARTURE, 0, indulási). Az ATA az első, az ATD az utolsó, és az érkezési rész mérföldkövei mind az indulási rész előtt vannak.
- **A sablon részei** a létrehozásakor dőlnek el.
- **Lezárt task pillanatképe:** amikor a task COMPLETED lesz, elmenti a sablon akkori paramétereit és mérföldkő-definícióit. A lezárt task ezután ebből számol, a sablon későbbi módosítása nem változtatja meg.
- **Lezárt task visszanyitása:** a státusz bármelyik irányba váltható. A pillanatkép minden lezáráskor elkészül; visszanyitáskor törlődik, és újra a sablon aktuális állapota számít.

### Demo sablon (demo fapados légitársaság)

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

## Feladattípusok

Egy járathoz feladattípusonként egy task tartozik (pl. GOU és HDS). Ezeket különböző emberek végzik, külön időablakkal.

- **Feladattípus:** név és rövid kód (pl. GOU, HDS), az admin kezeli; nem törölhető.
- **A légitársaság feladattípusai:** légitársaságonként megadható, milyen feladattípusok kellenek a járataihoz, típusonként a használt sablonnal, aktív jelöléssel. A jogosítás-követelmények is itt adhatók meg (`docs/spec/kepzes.md`).
- **Elsődleges feladattípus:** légitársaságonként egy. Ha nincs rendszerből kapott ATA/ATD, az elsődleges task `ATA`/`ATD` rögzítése a járat hatályos értéke. A többi taskban az ATA és az ATD sora a járat hatályos értékét mutatja; saját rögzítés ott is lehet, de az nem hatályos.
- **Taskok létrehozása:** a járat létrehozásakor (kézzel vagy importtal) a légitársaság minden aktív feladattípusához létrejön egy task. A feladattípusok későbbi módosítása csak az új járatokat érinti.
- **A task részei:** azok a részek, amelyek a sablonban és a járat meglévő, nem törölt részei között is megvannak.
- **Taskonként önálló:** mérföldkövek és rögzítések, státusz, érkezési és indulási ügynök, forduló típusa (a saját sablonja paramétereivel), foglaltsági ablakok.
- **Járatszintű, közös:** menetrendi, várható és tényleges idők, késés, törlés, állóhely, járatnapló, üzenetek.
- **Különböző emberek:** ugyanazon a járaton a különböző feladattípusokat különböző emberek végzik. Ha ugyanaz az ember kapná, a rendszer figyelmeztet, de engedi (kiosztás, sávos nézet).
- **Megjelenítés:** a napi listán járatonként a taskok, típussal, ügynökkel és státusszal; a task és az ügynök nézetben a feladattípus; a sávos nézet dobozain a feladattípus kódja.
- **„Alap” feladattípus:** a rendszer alapértelmezett feladattípusa; az Ikarus-import az új légitársaságokhoz ezt veszi fel.
- A demo adatokban a demo légitársaságnak egy második, helyőrző feladattípusa is van, csak indulási részből álló sablonnal. A valós GOU- és HDS-sablonokat a projekt gazdája adja meg.
- **Elsődleges jelölés:** a taskon is tárolódik.
- **Járatszintű megjelenítés** (napszűrés, sorrend, „Késik”, késés): az elsődleges task szerint.
- **Közös rész nélküli task:** „nincs teendő” állapotú.

## Task, státusz és rögzítés

- **Task:** járatonként és feladattípusonként egy, saját sablonnal; státusza PLANNED, IN_PROGRESS vagy COMPLETED. Van érkezési és indulási ügynöke (mindkettő opcionális, lehet ugyanaz a személy); csak érkező járatnál csak érkezési, csak induló járatnál csak indulási ügynök van.
- A task létrehozáskor PLANNED.
- Az első mérföldkő rögzítésekor a PLANNED task automatikusan IN_PROGRESS lesz.
- Ezen kívül a státuszt a taskhoz rendelt ügynök váltja; a műszakvezető és az admin is módosíthatja.
- A hiányzó kötelező (`required`) mérföldkövet a rendszer jelöli, de semmit nem tilt le, a lezárást sem.
- A lezárt task rögzítései utólag is javíthatók, a szokásos jogosultsági szabályok szerint (`docs/spec/jogosultsag.md`).
- **Rögzítés:** az ügynök a mérföldkő tényleges idejét a „Most” gombbal vagy kézi megadással rögzíti, percre pontosan (10. időszámítási szabály). Taskonként és mérföldkövenként legfeljebb egy rögzítés van; látszik, ki és mikor rögzítette, és ki módosította utoljára.
- **„Most” gomb:** rögzítés után „Javítás”-ra vált, hogy egy véletlen érintés ne írjon felül kész időt.
- **Rögzítés törlése:** nincs törlés, csak javítás (`docs/spec/jogosultsag.md`).
- **Hiányzó kötelező mérföldkő jelölése:** akkor jelöljük, ha a tervezett ideje már elmúlt, vagy a task lezárt.
- **ATA és ATD sora** (task nézet és ügynök nézet): a rendszerből kapott érték és az ügynök saját rögzítése egymás mellett látszik. Az ügynök akkor is rögzíthet saját értéket, ha van rendszerérték.

## Időszámítási szabályok

A szabályok száma állandó: a kód és a többi leírás ezekre a számokra hivatkozik („N. időszámítási szabály”).

1. **Érkezési horgony:** a hatályos ATA (9. pont), ha van, különben az ETA, ha van, különben az STA.
2. **Indulási horgony (tervezett off-block):** az ETD (ha van, különben az STD) és az (érkezési horgony + `minTurnaroundMinutes`) közül a későbbi. Így ha a gép késve érkezik, a rendszer magától gyors forduló szerint számol.
3. **Tervezett mérföldkő-idő:** horgony + offset. Egy mérföldkő tervezett ideje nem lehet korábbi az előző mérföldkő tervezett idejénél; ha az lenne, az előző idejére kerül. (Például gyors fordulónál a „First pax in” a „Last pax out” idejére tolódik.)
4. **Ellenőrzés gyors fordulóra (STD = ATA + 25):** a tervezett idők ATA-hoz képest: 0, +1, +1, +2, +10, +10, +20, +22, +24, +25.
5. **Eltérés:** tényleges − tervezett. Az ATA és az ATD sorában a tényleges idő a hatályos érték (9. pont). Színjelölés a beállítás szerint, alapérték: legfeljebb 0 perc zöld, 1–5 perc sárga, 5 perc fölött piros. A küszöbök az admin felületen állíthatók. Amint van ATA, a tervezett idők attól számolódnak (1. pont), így az ATA sor eltérése 0.
6. **Sorrend-ellenőrzés:** ha egy rögzített idő korábbi, mint egy előtte lévő mérföldkő rögzített ideje, a rendszer figyelmeztet, de nem tiltja le a mentést. Az ATA és az ATD sorában itt is a hatályos érték (9. pont) számít.
7. **Késés:** hatályos ATD (9. pont) − STD, ha pozitív.
8. **Forduló típusa:** a két foglaltsági ablak közötti szabad idő dönti el.
   - érkezési ablak vége = utolsó érkezési mérföldkő tervezett ideje + `travelMinutes`
   - indulási ablak eleje = indulási horgony − `departureReportMinutes` − `travelMinutes`
   - szünet = indulási ablak eleje − érkezési ablak vége
   - Ha a szünet legalább `minBreakMinutes`: hosszú forduló. A két rész ügynöke külön választható, a műszakvezető dönt.
   - Egyébként gyors forduló, egy összefüggő foglaltsági ablakkal, és mindkét részt az érkezési ügynök végzi. Ha a járat késése miatt egy hosszú forduló gyorssá válik, az indulási rész is automatikusan az érkezési ügynökhöz kerül.
   - Így a két ablak soha nem fedheti át egymást.
9. **Hatályos ATA / ATD:** a járat rendszerből kapott `ata` / `atd` értéke, ha ki van töltve; különben az `ATA` / `ATD` kódú mérföldkő rögzített értéke. Az ügynök saját rögzítése a rendszerérték mellett is megmarad és látható, de a számításokban a rendszerből kapott érték számít.
10. **Percpontosság:** minden időt percre pontosan rögzítünk, a másodperceket levágjuk (nem kerekítjük). Ez a „Most” gombra és a kézi megadásra is vonatkozik.
11. **Csak érkező és csak induló járat:**
   - Csak érkező (a gép itt marad): csak az érkezési rész mérföldkövei tartoznak hozzá. Az érkezési horgony az 1. szabály szerint számol; indulási horgony, késés és forduló típus nincs.
   - Csak induló (a gép már itt van): csak az indulási rész mérföldkövei tartoznak hozzá. Az indulási horgony a hatályos ETD, ennek hiányában az STD (érkezési horgony nincs, így a `minTurnaroundMinutes` sem játszik); a késés a 7. szabály szerint számol; forduló típus nincs.
   - A hiányzó rész mérföldkövei, köztük az ATA, illetve az ATD, nem jelennek meg, és hiányzóként sem jelöljük őket.
   - A mérföldkő horgonya és része a sablonban független egymástól. Ha egy mérföldkő horgonya hiányzik (egy oldalas vagy részben törölt járat), a meglévő horgonytól számol, és a 3. szabály szerint nem kerülhet az előző mérföldkő elé.

## Ügynök-foglaltság

A foglaltsági ablakokból számol a forduló típusa, a sávos nézet, a tervező és a létszámigény.

- **Gyors forduló:** egy foglaltsági ablak, érkezési horgony − `travelMinutes`-tól tervezett off-block + `postDepartureMinutes`-ig. (A demo sablonnal ez 45 perc.)
- **Hosszú forduló, két ablak:**
  - érkezési rész: érkezési horgony − `travelMinutes` → utolsó érkezési mérföldkő + `travelMinutes`
  - indulási rész: indulási horgony − `departureReportMinutes` − `travelMinutes` → tervezett off-block + `postDepartureMinutes`
  - (Feltételezés: a szünetben az ügynök bemegy, ezért számolunk vissza- és kiutazással. Később pontosítható.)
- **Csak érkező vagy csak induló járat** (11. időszámítási szabály): egy foglaltsági ablak, a hosszú forduló megfelelő részének képlete szerint (érkezési rész, illetve indulási rész).
- Az ablakok félig nyitott intervallumok (kezdet ≤ t < vég), így az egymásba érő ablakok nem számítanak átfedésnek.
- Unit tesztek: a küszöb körüli esetek (szünet = `minBreakMinutes` − 1 és = `minBreakMinutes`), és annak ellenőrzése, hogy hosszú fordulónál a két ablak soha nem fedi át egymást.

## Késés és törlés

- **Késés rögzítése:** a járaton külön művelet, amellyel új várható érkezés és/vagy indulás adható meg, a forrás megjegyzésével (pl. „email a légitársaságtól”). A járat azonosítója (légitársaság + járatszám + menetrendi nap) nem változik: nem jön létre új járat, és a később érkező üzenetek is ehhez a járathoz párosulnak.
- **Hatályos ETA/ETD:** mindig a legutóbbi érték számít, akár kézzel, akár üzenetből, akár az Ikarus-importból jött. Mellette látszik a forrás, és hogy ki és mikor rögzítette.
- **„Késik” jelölés:** ha a hatályos érkezés vagy indulás több mint a sárga eltérés-küszöbbel (beállítás, alapérték 5 perc) későbbi a menetrendinél, a járat mindenhol (napi lista, task nézet, ügynök nézet, sávos nézet) „Késik” címkét kap, az eredeti menetrendi nappal és idővel. Így mindenki látja, hogy késett járatról van szó, nem újról.
- **Törlés (cancelled):** a járatot nem töröljük az adatbázisból, hanem töröltre állítjuk. Az érkezési és az indulási rész külön is töröltre állítható; ha mindkettő törölt, az egész járat törölt. A törölt jelzést csak kézzel lehet állítani.
  - A törölt rész áthúzva látszik a listákon. Nem számít bele a foglaltságba, a forduló típusába, a sávos nézetbe és az ütközésvizsgálatba, és a mérföldköveit hiányzóként sem jelöljük.
  - Ha csak az egyik rész törölt, a járat a megmaradt rész szerint csak érkező vagy csak induló járatként viselkedik (11. időszámítási szabály).
  - A kiosztás megmarad, hogy visszaállításkor ne vesszen el.
  - A törlés visszaállítható. A törlést és a visszaállítást naplózzuk: ki és mikor.
- A késés rögzítése és a törlés a járat módosítására vonatkozó jogosultsághoz kötött. A késéskódok: `docs/spec/uzenetek.md`.
- **ETA/ETD módosítása:** csak a „Késés rögzítése” művelettel; minden változás a járatnaplóba kerül.
- **Törölt rész:** nem rögzíthető rá mérföldkő és késés. A listán a saját napján marad, áthúzva; a napszűrés a meglévő részek szerint számol.

## Nézetek

- **Napi járatlista** (műszakvezető): a nap járatai idő szerint, járatonként a taskokkal (feladattípus, státusz, érkezési és indulási ügynök), a „Késik”, a „Slot hh:mm” és az „az utolsó importból hiányzik” jelöléssel. Innen is kiosztható az ügynök.
  - A nap: naptári nap (00:00–24:00, Europe/Budapest), dátumválasztóval. Egy járat azon a napon jelenik meg, amelyre az érkezési horgonya (1. időszámítási szabály) vagy a hatályos indulása esik; a hatályos indulás a hatályos ATD, ennek hiányában az indulási horgony (2. szabály). Az éjfélen átnyúló forduló mindkét napon megjelenik. Így a napokat késő járat a tényleges napján látszik, az eredeti napján nem. Rendezés az érkezési horgony szerint. Ugyanez a napszűrés érvényes az ügynök nézetre és a sávos nézetre is.
- **Task nézet:** mérföldkő-idővonal, soronként tervezett / tényleges / eltérés, „Most” gomb a rögzítéshez, kézi időmódosítás, ki rögzítette és ki módosította, a hiányzó kötelező mérföldkövek jelölése, státuszváltás, a feladattípus; az „Üzenetek” fül (`docs/spec/uzenetek.md`).
- **Ügynök nézet:** a hozzá rendelt taskok, a feladattípussal. Telefonra optimalizálva, nagy gombokkal, mert az ügynökök a forgalmi előtéren telefonról használják. Csak azoknak a járatoknak a taskjait tölti be és számolja ki, amelyeken a felhasználó ügynök vagy gyakornok (a járat többi taskjával együtt, mert a járat napja és sorrendje az elsődleges task szerint dől el).
- **Ügynök nézet időkerete:** naptári nap, dátumválasztóval, ugyanúgy, mint a műszakvezetői listán.
- **Az ügynök kezdőoldala:** belépés után a saját taskjai, akkor is, ha a beosztást megtekintheti.

## Admin

- A légitársaságok, a feladattípusok, a légitársaság feladattípusai és a sablonok szerkesztése (a sablon paraméterei, valamint a mérföldkövek sorrendje, horgonya, offsetje, kötelező volta és része), és a beállítások (eltérés-küszöbök). A felhasználók és a szerepkörök: `docs/spec/jogosultsag.md`.
- **Törlés:** légitársaság, sablon, felhasználó és rögzítés egyelőre nem törölhető; a felhasználó inaktiválható, a járat pedig törlés helyett töröltre állítható (lásd „Késés és törlés”). A légitársaságra és a sablonra a végleges szabály még nyitott.
