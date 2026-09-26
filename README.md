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

- **Számolás** (`Tervezés` menü, „Tervezés” jogosultsággal: Admin és Tervező): a tervező egy legfeljebb 31 napos időszakot választ, a program naponként névtelen pozíciókat számol a járatok foglaltsági ablakaiból (gyors fordulónál egy, hosszúnál két ablak, a törölt rész kimarad; egy nap feladatai az azon a napon kezdődő ablakok). Külső AI nélkül; a 6. mérföldkő óta a jogosításokkal is számol (lent).
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

**6. mérföldkő – képzések és jogosítások**

- **Jogosítások és képzések** (`Képzések` menü, „Képzések kezelése” jogosultsággal: Oktatási koordinátor és Admin): a jogosítás neve, kódja és érvényességi ideje hónapban (üresen nem jár le); a képzés az általa adott jogosítással, dolgozattal és sikerességi határral. Az inaktív jogosítás nem választható, és az ellenőrzések figyelmen kívül hagyják.
- **Képzési rekordok:** ügynök, képzés, teljesítés napja, dolgozat eredménye (a sikerességet a határ dönti el; dolgozat nélkül a koordinátor jelöli), érvényesség vége (a teljesítés + a jogosítás hónapjai, kézzel felülírható), megjegyzés, ki rögzítette és módosította. A rekord javítható, nem törölhető.
- **Fájlok:** PDF, JPG vagy PNG, legfeljebb 10 MB, a tartalma alapján ellenőrizve; saját tárhelyen (Dockerben az `uploads` kötet). Az eltávolítás a fájlt törli a lemezről, a naplósor (ki, mikor) megmarad. A letöltés ugyanúgy korlátozott, mint a rekord megtekintése.
- **Az ügynök jogosításai** a rekordokból számolódnak: jogosításonként a legutolsó sikeres rekord érvényessége számít, egy későbbi sikertelen próbálkozás nem veszi el. Állapot egy adott napon: érvényes, hamarosan lejár (a lejáratig legfeljebb a beállított napok száma, alapból 30; `Admin → Beállítások`), lejárt, hiányzik.
- **Nézetek** („Képzési adatok megtekintése” hatókörrel): az ügynök a sajátjait látja (telefonon is), a csapatvezető a csapata táblázatát (ember × jogosítás, állapotszínekkel), a koordinátor és az admin mindenkiét. A lejáró jogosítások listája két csoportban: hamarosan lejár, lejárt.
- **Követelmények** (`Admin → Légitársaságok és sablonok`, a légitársaság feladattípusainál): részenként (érkezés, indulás) a szükséges jogosítások. Egy ablakot végző ügynöknek az ablak kezdőnapján mindegyik érvényes kell legyen; gyors fordulón a két rész követelménye együtt.
- **Figyelmeztetések:** ha a kiosztott ügynök nem felel meg, a napi lista kiosztása, a sávos nézet (új ütközéstípus), a „Kiosztás átvétele” és a tervezői névadás megnevezi a hiányzó vagy lejárt jogosítást, de semmit nem tilt.
- **Tervező:** minden ablak a saját részének követelményét kapja, a pozícióé a taskjaié együtt. Hogy egy nap pozíciói betölthetők-e különböző aktív ügynökökkel, akiknél a pozíció minden jogosítása érvényes, azt párosítás dönti el (nem jogosításonkénti számolás). A számolás erre törekszik; ha így sem megy, a terv elkészül, és jelzi a betölthetetlen pozíciókat, jogosításonként a „kell / van” számokkal. A névadás listája elöl a megfelelő ügynököket mutatja, a többit a hiányzó jogosítással. Az érvényességet mindig a terv napjára vizsgálja.

**7. mérföldkő – üzenetek (MVT, LDM, CPM, UCM)**

A formátumok, a párosítás és a minták: [`docs/messages.md`](docs/messages.md).

- **Fogadás:** minden üzenet ugyanazon a feldolgozáson megy át, akár a fogadó API-n (`POST /api/messages`, API-kulccsal), akár kézi bemásolással (`Üzenetek` menü, Műszakvezető és Admin). Egy szövegben több üzenet is lehet; a típussor előtti sorok (Type B fejléc, email szöveg) borítékként megmaradnak. Az azonos szöveg (sorvégi szóközöktől függetlenül) nem kerül be kétszer. A PTM és a PSM tartalma nem tárolódik, csak a típusa, a járata és a dátuma.
- **Feldolgozás:** hibatűrő, típusonként; a mezőket mintázat alapján ismeri fel (a CPM pozíciósorában a súly, a cél, a kontúr és a kategória sorrendje tetszőleges). Az ismeretlen sor figyelmeztet, a nyers szöveg mindig megmarad. Ellenőrzések (csak figyelmeztetnek): LDM- és CPM-összegek, TOW = ZFW + felszállási üzemanyag, LDM–CPM rakterenként, UCM–CPM a ULD-halmokra, a késéskódok összege a késéssel.
- **Párosítás:** légitársaság-kód (a rendszer légitársaságaiból) + járatszám + üzemnap + állomás; a csak napot tartalmazó fejléc a beérkezéshez legközelebbi dátum. Ami nem párosítható, az „Üzenetek → Párosítatlan üzenetek” listába kerül okkal; ott hozzárendelhető egy járatrészhez vagy elvethető.
- **Hatás a járatra:** a BUD-i indulási MVT (AD) off-blockja a járat ATD-je, a DL sor kódjai késésrekordok; a BUD-i érkezési MVT (AA) on-blockja az ATA; a más állomásról jövő EA … BUD a járat ETA-ja (a hatályos ETA a legutóbbi, kézi vagy üzenet). Az üzenet kitölti a hiányzó lajstromot. Minden változás a járatnaplóba kerül. Ugyanarra a járatrészre érkező azonos fajtájú üzenet új verzió; a legfrissebb számít.
- **„Üzenetek” fül** a task nézetben (az ügynök is látja a saját taskjai járataiét): részenként a verziók, a nyers és a feldolgozott tartalom, a figyelmeztetések, és egy **infografika** (utasok, rakomány rakterenként és kategóriánként, ULD-k, üres ULD-halmok, különleges kódok, súlyadatok), minden blokknál a forrásüzenettel.
- **Késéskódok:** kódtábla (`Admin → Üzenetküldés`); a járat indulási részén kézzel vagy üzenetből rögzített kódok és percek, figyelmeztetéssel, ha az összegük eltér a késéstől.
- **Indulási MVT küldése:** az Üzenetek fülön előnézet a járat adataiból és rögzítéseiből (szerkeszthető), majd küldés a címjegyzék címzettjeinek (`Admin → Üzenetküldés`). Email SMTP-n; SITA-átjáró még nincs, a Type B szöveg másolható. **Beállított csatorna nélkül semmi nem hagyja el a rendszert**, a küldés címzettenként „nem küldhető” állapottal naplózódik. Az érkezési (AA) és a korrekciós MVT előállítása minta hiányában még nincs meg.

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
| `koordinator` | Oktató Olga | Oktatási koordinátor |

### A képzések kipróbálása

A seed helyőrző jogosításokat tölt be (a valós GOU- és HDS-követelményeket a projekt gazdája adja meg): „Helyőrző A” (HA, 12 hónap), „Helyőrző B” (HB, 24 hónap) és „Helyőrző C” (HC, nem jár le), mindegyikhez egy képzéssel (A és C dolgozattal). A demo légitársaság „Alap” taskjainak érkezési része HA-t, indulási része HB-t, a „Helyőrző” taskok indulási része HC-t követel. A rekordok a betöltés napjához igazodnak, így minden állapot látszik:

- Kiss Péter: HA hamarosan lejár (egy 5 napja sikertelen megújító próbálkozás nem vette el), HB és HC érvényes, a HB rekordhoz egy minta PDF tartozik.
- Nagy Eszter: HA lejárt, HB érvényes, HC hiányzik.

1. `koordinator`-ként a `Képzések` menüben rögzíts rekordot, tölts fel hozzá fájlt, és nézd meg a lejáró jogosítások listáját.
2. `ugynok1`-ként a `Képzések` menüben a saját jogosítások, `vezeto`-ként a csapat táblázata látszik.
3. `vezeto`-ként a napi listán és a sávos nézetben Nagy Eszter érkezési részeinél figyelmeztetés jelzi a lejárt HA-t.
4. `tervezo`-ként egy mai terv jelzi, hogy a két demo ügynökkel nem tölthető be minden pozíció, és jogosításonként kiírja a hiányt.

### Az üzenetek kipróbálása

A seed a mintákból átírt demo üzeneteket is betölti a mai demo járatokhoz, a műszakvezető kézi bemásolásaként:

- ZZ1101/ZZ1102: indulási MVT (ATD, felszállás, várható érkezés, DL 93), LDM és CPM – a task nézet „Üzenetek” fülén az infografikával; a „Késéskódok” szakaszban a 93-as kód üzenetből.
- ZZ1203/ZZ1204: az indulóállomás MVT-je az érkezés ETA-ját a kézzel rögzítettnél későbbre teszi („Késik”).
- ZZ1305/ZZ1306: a P7 5535/16 mintái (LDM, CPM, UCM) – ULD-k, üres ULD-halmok, és az ismert UCM–CPM eltérés figyelmeztetése.
- Egy párosítatlan MVT (ET 3365, a légitársaság nincs a rendszerben) az `Üzenetek → Párosítatlan üzenetek` listában, és egy PTM, amelyből csak a fejléce naplózódott.
- A címjegyzékben csak nem létező címek vannak (`@example.invalid`, kitalált SITA-cím); a három késéskód (36, 68, 93) leírását a projekt gazdája adja meg.

A fogadó API kipróbálása: `admin`-ként az `Admin → Üzenetküldés` oldalon hozz létre egy API-kulcsot (csak egyszer látszik), majd:

```bash
curl -X POST http://localhost:3000/api/messages -H "Authorization: Bearer <kulcs>" -H "Content-Type: text/plain" --data-binary $'MVT\nZZ1204/26.HAZZB.BUD\nAD261035/261044 EA261240 STN'
```

JSON is küldhető, a beérkezés idejével és a forrással:

```bash
curl -X POST http://localhost:3000/api/messages -H "Authorization: Bearer <kulcs>" -H "Content-Type: application/json" -d '{"text":"MVT\nZZ1204/26.HAZZB.BUD\nAD261035/261044","source":"teszt","receivedAt":"2026-09-26T10:50:00Z"}'
```

A válasz üzenetenként megadja a típust, az állapotot (tárolva, duplikátum, nem támogatott), a párosítást és a figyelmeztetéseket. (A `26` a mai nap helyére írandó.)

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

# Minden adat törlése (az adatbázis- és a fájlkötettel együtt)
docker compose down -v
```

### Éles használat előtt

- Állíts be saját titkos kulcsot a munkamenetekhez: `AUTH_SECRET=<hosszú véletlen szöveg> docker compose up -d` (generálás: `npx auth secret` vagy `openssl rand -base64 32`).
- Cseréld le az adatbázis jelszavát a `docker-compose.yml`-ben.
- Változtasd meg vagy inaktiváld a demo felhasználókat.
- A képzési rekordok fájljai az `uploads` kötetben vannak; az adatbázissal együtt mentsd. Automatikus törlés nincs.
- Üzenetküldés emailben: állítsd be az `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` környezeti változókat az app szolgáltatásnál, és az `Admin → Üzenetküldés` oldalon a feladó címét. Cseréld le a demo címjegyzéket. Amíg nincs SMTP, a küldés csak naplóz; SITA-átjáró még nincs.

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

A feltöltött fájlok fejlesztéskor az `uploads/` mappába kerülnek (`UPLOAD_DIR` környezeti változóval máshová tehetők).

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
| `lib/planning/` | Tervezés: bemenet (napi ablakok), a pozíció szabályai, minimális pozíciószám, kiegyenlítés és mutatók, betölthetőség párosítással, a terv nézete, mentés a tervezetbe, kiosztás átvétele; tiszta függvények tesztekkel |
| `lib/telex/` | Üzenetek: szétválasztás, fejléc, MVT/LDM/CPM/UCM feldolgozók, párosítás, ellenőrzések, hatás a járatra, infografika, MVT előállítása, kézbesítési döntések; tiszta függvények, tesztek a docs/messages.md mintáival |
| `lib/data/messages.ts`, `lib/data/outbound.ts` | Üzenetek tárolása, verziózása, hatása a járatra; kimenő üzenetek küldése címzettenkénti állapottal |
| `lib/qualifications.ts`, `lib/training.ts` | Jogosítások: a rekordokból számolt érvényesség és állapot, a task részeinek követelménye és teljesülése; a rekord szabályai és a fájlok ellenőrzése |
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
