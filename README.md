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

- **Fogadás:** minden üzenet ugyanazon a feldolgozáson megy át, akár a fogadó API-n (`POST /api/messages`, API-kulccsal), akár kézi bemásolással (`Üzenetek` menü, Műszakvezető és Admin). Egy szövegben több üzenet is lehet; a típussor előtti sorok (Type B fejléc, email szöveg) borítékként megmaradnak. Az azonos szöveg (sorvégi szóközöktől függetlenül) nem kerül be kétszer. A PSM-ből és a PTM-ből csak a darabszámok maradnak meg (lent).
- **Feldolgozás:** hibatűrő, típusonként; a mezőket mintázat alapján ismeri fel (a CPM pozíciósorában a súly, a cél, a kontúr és a kategória sorrendje tetszőleges). Az ismeretlen sor figyelmeztet, a nyers szöveg mindig megmarad; az SI szabad szöveg, nem dolgozzuk fel. Ellenőrzések (csak figyelmeztetnek, csak az üzenet törzséből): LDM- és CPM-összegek, LDM–CPM rakterenként (a személyzet poggyásza nélkül), UCM–CPM a ULD-halmokra, a késéskódok összege a késéssel.
- **Párosítás:** légitársaság-kód (a rendszer légitársaságaiból) + járatszám + üzemnap + állomás; a csak napot tartalmazó fejléc a beérkezéshez legközelebbi dátum. Ami nem párosítható, az „Üzenetek → Párosítatlan üzenetek” listába kerül okkal; ott hozzárendelhető egy járatrészhez vagy elvethető.
- **Hatás a járatra:** a BUD-i indulási MVT (AD) off-blockja a járat ATD-je, a DL sor kódjai késésrekordok; a BUD-i érkezési MVT (AA) on-blockja az ATA; a más állomásról jövő EA … BUD a járat ETA-ja (a hatályos ETA a legutóbbi, kézi vagy üzenet). Az üzenet kitölti a hiányzó lajstromot. Minden változás a járatnaplóba kerül. Ugyanarra a járatrészre érkező azonos fajtájú üzenet új verzió; a legfrissebb számít.
- **„Üzenetek” fül** a task nézetben (az ügynök is látja a saját taskjai járataiét): részenként a verziók, a nyers és a feldolgozott tartalom, a figyelmeztetések, és egy **infografika** (legfelül az LDM és a CPM SI-je, ahogy érkezett; utasok, rakomány rakterenként és kategóriánként, ULD-k, üres ULD-halmok, különleges kódok, PSM, PTM, slot), minden blokknál a forrásüzenettel.
- **Késéskódok:** kódtábla (`Admin → Üzenetküldés`); a járat indulási részén kézzel vagy üzenetből rögzített kódok és percek, figyelmeztetéssel, ha az összegük eltér a késéstől.
- **Indulási MVT küldése:** az Üzenetek fülön előnézet a járat adataiból és rögzítéseiből (szerkeszthető), majd küldés a címjegyzék címzettjeinek (`Admin → Üzenetküldés`). Email SMTP-n; SITA-átjáró még nincs, a Type B szöveg másolható. **Beállított csatorna nélkül semmi nem hagyja el a rendszert**, a küldés címzettenként „nem küldhető” állapottal naplózódik. Az érkezési és a korrekciós MVT a 8. mérföldkőben készült el.

**8. mérföldkő – üzenetek bővítése**

- **Szétválasztás:** a típussor előtti `COR` sor az üzenethez tartozik, és korrekciót jelez („Korrekció” címke); a `-TITLE` sor új (slot)üzenetet kezd, így a PTM után jövő slotüzenet nem olvad bele.
- **Lufthansa-változatok:** az LDM előtag nélküli főfedélzete, `JMP`, `CRW`, osztályonkénti `PAD`; a CPM-ben egy pozíción több tétel, szabad negyedek (`BY0`, `VR3`), `D` a személyzet poggyásza (nem rakomány), `Q` sürgős cargo, `XOM`/`XCS` kódok, állomás nélküli fejléc. A PAX-ellenőrzésbe az infant nem számít.
- **PSM és PTM, név nélkül:** a PSM-ből célállomásonként, kódonként és osztályonként a darabszám, a PTM-ből továbbjáratonként az utasok, a poggyász darabja és súlya. Nevet, ülést, csatlakozó járatot és nyers szöveget nem tárolunk, a figyelmeztetések és a napló sem idéznek a szövegből; teszt bizonyítja.
- **Érkezési és korrekciós MVT:** az érkezési rész Üzenetek fülén előállítható az érkezési MVT (`AA földetérés/on-block`, az on-block a hatályos ATA); a küldött MVT-k kártyáján „Korrekció” (COR sorral, új verzió). A bejövő korrekció ATD-t vagy ATA-t frissít (naplózva); a célállomás AA sora a BUD-ról induló részhez kerül, tájékoztatásként.
- **Slotüzenetek (SAM, SRM):** párosítás az IFPLID, különben az útvonal (repülőtér-tábla, `Admin → Üzenetküldés`) + EOBD + EOBT ±2 óra alapján. A járaton és a napi listán „Slot hh:mm”, a task nézetben a cél off-block (CTOT − gurulás), a szabályozások és az ok; figyelmeztetés, ha a tervezett off-block a cél off-block + tűrésnél (alapból 10 perc) későbbi. A slot nem írja át az ETD-t: a „Késés rögzítése” felajánlja a cél off-blockot, a késéskódok a slot okának kódját.
- **Késéskódok légitársaságonként (utómunka):** a légitársasághoz feltölthető a saját késéskód-dokumentuma (`Admin → Üzenetküldés`; csak PDF, legfeljebb 10 MB, légitársaságonként egy; az új feltöltés cseréli a régit, a feltöltés, a csere és az eltávolítás naplózott). A járatról a „Késéskódok” hivatkozás nyitja meg – a késésrekordoknál, a „Késés rögzítése” műveletnél és az indulási MVT DL soránál –, új lapon. Ha a légitársaságnak nincs dokumentuma, ugyanott helyben a közös kódtábla nyílik le (kód és leírás). Megnyithatja, aki a járat valamelyik taskját látja.

**9. mérföldkő – létszámigény**

- **Igény** (`Létszámigény` menü, „Létszámigény megtekintése” jogosultsággal: Tervező, Műszakvezető, Admin): hány ügynök kell egyszerre, 15 perces sávokban. A sáv értéke a sávon belüli csúcs: a legtöbb egyszerre futó foglaltsági ablak, minden task minden feladattípusából, a hatályos időkkel (a késéssel együtt mozog), a kiosztástól függetlenül. A törölt részek és a „nincs teendő” taskok kimaradnak; az éjfélen átnyúló ablak mindkét napba beleszámít.
- **Bontás:** feladattípusonként és összesen. Az összesen a minden ablakból együtt számolt csúcs, nem a feladattípusok csúcsainak összege.
- **Beosztás:** sávonként a valós réteg operatív részeiben lévő, nem operatív rész blokkjában (az utazási idővel) éppen nem lévő ügynökök száma, a sávon belüli legkisebb érték; aki a sávnak csak egy részében van bent, nem számít. **Hiány és többlet:** beosztás − összesített igény.
- **Napi nézet:** napválasztó, lépcsős grafikon (összesített igény, feladattípusok, a beosztás vonala, a hiányos sávok pirossal), a napi csúcs és a legnagyobb hiány az idejével, alatta táblázat sávonként.
- **Áttekintés:** legfeljebb 31 napos időszak, naponként egy sor, negyedóránként egy cella az összesített igénnyel, az igény nagysága szerint színezve, a hiányos sávok pirossal; naponként a csúcs és a legnagyobb hiány. A napra kattintva a napi nézet nyílik.
- **Még nem publikált nap (utómunka):** a beosztás a tervezet réteg műszakjaiból számol, ugyanúgy, hiánnyal és többlettel, „Tervezet” jelöléssel (a napi nézetben címke, pontozott beosztásvonal és „Beosztás (tervezet)”; az áttekintésben „T” a nap mellett). Ezt csak az látja, aki a beosztás tervezetét is láthatja („Beosztás tervezése” jogosultság: Tervező, Admin); a többieknek ezeken a napokon csak az igény látszik. Egy műszak a kezdőnapja szerinti rétegből számít, így az éjfélen átnyúló műszak a publikált és a nem publikált nap határán is jól számol; a nem publikált napra felvitt valós műszak és a publikált napra felvitt tervezet nem számít.
- **Beosztás nélküli nap** (a publikált napon nincs valós, a nem publikált napon nincs tervezett műszak): az igény látszik, de hiányként nem jelöljük.
- **Óraátállítás:** a sávok a valós időt követik, a nap 92 vagy 100 sávból áll. Az áttekintés oszlopai a helyi óra negyedórái: tavasszal a nem létező óra cellái üresek, ősszel a kétszer előforduló óra cellája a nagyobb igényt és a nagyobb hiányt mutatja (a napi nézetben mindkét sáv látszik).
- Tiszta függvények (`lib/staffing/`), külső AI nélkül. A sávos nézeten a létszámigény nem jelenik meg.

**10. mérföldkő – oktatás: e-vizsga, on the job gyakorlás (OJT) és kibocsátás**

- **A képzés részei** (`Képzések → Vizsgák`, „Vizsgák szerkesztése”: Oktatási koordinátor, Admin): elméleti rész e-vizsgával (csak dolgozattal és sikerességi határral rendelkező képzésnél), gyakorlati rész OJT-val és gyakorlati vizsgával. Az OJT-követelmény képzésenkénti paraméter: a megfelelő gyakorlások száma (alapból 10), a kötelező mérföldkövek teljessége (100%) és a zöld vagy sárga rögzítések aránya (0%, vagyis nincs küszöb); az alapértékek helyőrzők.
- **Kérdésbank és vizsgalapok:** egy helyes, több helyes és szöveges kérdés; a vizsgalapon a kérdések sorrendje, időkorlát, és a többválaszos pontozás módja (paraméter: csak a teljesen helyes válasz ér pontot, vagy arányos). Kérdés és szempont nem törölhető, csak inaktiválható.
- **Képzési folyamat** (`Képzések → Képzési folyamatok`): a koordinátor indítja és szakíthatja meg; egy ügynöknek egy képzésből egy nyitott folyamata lehet. Állapota folyamatban, kibocsátható, kibocsátva vagy megszakítva, részenként az előrehaladással. A koordinátor, a vizsgáztatók és a kibocsátásra jogosultak mindenkiét látják, a csapatvezető a csapatáét, az ügynök a sajátját („Képzéseim”).
- **E-vizsga:** a vizsgáztató vagy a koordinátor nyitja meg; a vizsgázó a saját belépésével tölti ki, telefonon is. Minden válasz azonnal mentődik; az időkorlát a Kezdés gombtól fut, lejártakor a mentett válaszok beadódnak. A kísérlet a vizsgalap másolatát kapja, így a későbbi szerkesztés nem változtatja meg. A választós kérdéseket a rendszer pontozza, a szöveges válaszokat a vizsgáztató; sikeres, ha az eredmény eléri a képzés határát. Visszajelzés (a vizsgázó is látja) és belső megjegyzés (csak a vizsgáztatók, a kibocsátásra jogosultak és a koordinátor); a vizsgázó a helyes válaszokat nem látja.
- **OJT a taskon:** aki a taskot kiosztja, a task részéhez gyakornokot vesz fel, ha a rész ügynöke mentorálhat („Mentorálás” és a képzés jogosítása a gyakorlás napján). A gyakornok az ügynök nézetében „OJT” jelöléssel látja a taskot, a rész mérföldköveit rögzítheti (a rögzítésnél „gyakornok” látszik), a mentor ezeket javíthatja. A task lezárása után a mentor értékel; a mutatók (teljesség, a gyakornok aránya, eltérések színenként) ekkor rögzülnek. A sávos nézeten a gyakornok sávján „OJT” doboz, amely az ütközésvizsgálatba beleszámít, a létszámigénybe nem.
- **Gyakorlati vizsga:** a folyamat oldaláról, a vizsgázó elmúlt 14 napjának egy task részén, ahol ügynök vagy gyakornok volt; szempontonként megfelelt / nem felelt meg, végeredmény, visszajelzés, belső megjegyzés. Figyelmeztet, ha az OJT még nem teljesül. **Kizáró szempont (utómunka):** a szempont kizárónak jelölhető; ha egy kizáró szempont nem felelt meg, a végeredmény automatikusan sikertelen, és a vizsgáztató nem írhatja át (a szerver is így számol). A vizsga a szempontok akkori kizáró jelölését őrzi.
- **Kibocsátás** („Kibocsátás”: Oktatási koordinátor, Admin): a kibocsátható folyamatból egy gombbal létrejön a sikeres képzési rekord (a mai nappal, az érvényesség a jogosítás szerint, az utolsó sikeres e-vizsga eredményével), és ettől érvényes a jogosítás. A képzési rekord kézi rögzítése megmarad.
- Vizsgáztatni és értékelni a jogosultsággal és a képzés aznap érvényes jogosításával lehet; tiszta függvények (`lib/exams/`) tesztekkel.

**11. mérföldkő – földi eszközök és hibajegy**

- **Eszköztípusok** (`Eszközök → Eszköztípusok`, „Eszközök kezelése”: Műszaki, Admin): név, kód, aktív, és a műszaki adatok mezőlistája sorrenddel. Mezőfajták: határidő (dátum), számláló (állás és opcionális esedékesség, pl. üzemóra vagy km) és szöveg. A mező fajtája csak addig módosítható, amíg nincs értéke; mező nem törölhető, csak inaktiválható.
- **Eszközök** (`Eszközök`): típus, azonosító (pl. flottaszám), rendszám, leírás, megjegyzés, állapot (üzemképes, üzemképtelen, kivonva). Nem törölhető, csak kivonható. A listán az állapot, a nyitott jegyek száma és a legközelebbi határidő; a műszakvezető (és aki minden hibajegyet lát) olvassa, a Műszaki és az Admin szerkeszti.
- **Adatlap:** a műszaki adatok szerkesztése mezőnként; minden változás naplózott (ki, mikor, régi és új érték). A határidő állapota érvényes, hamarosan lejár, lejárt vagy nincs megadva (mint a jogosításoknál, a lejárat napján még érvényes); a számláló „elérte”, ha az állás eléri az esedékességet. A szerviz esedékessége egy határidő-mező és a számláló esedékessége együtt. Dokumentumok (PDF, JPG, PNG, legfeljebb 10 MB) a meglévő tárhelyen; az eltávolítás naplózott. Az állapotváltások naplója a hibajegyre hivatkozik, ha onnan jött. Az eszköz hibajegyei.
- **Lejáró határidők** (`Eszközök → Lejáró határidők`): két csoport, „hamarosan lejár” és „lejárt vagy elérte” (az esedékességet elért számlálók a lejártak között). Csak aktív típusú, nem kivont eszközök, aktív mezők. A „hamarosan lejár” napjai: `Admin → Beállítások` (helyőrző: 30).
- **Hibajegy jelentése** (`Hibajegyek → Hiba jelentése`, az ügynök nézetéből és az eszköz adatlapjáról is; minden alapértelmezett szerepkör): eszköz a nem kivontak közül, leírás, legfeljebb 5 fotó (JPG, PNG vagy PDF, fájlonként 10 MB), és „üzemképtelen” jelölés. Telefonra méretezve. Az üzemképtelennek jelölt jelentés az eszközt azonnal üzemképtelenre állítja.
- **Hibajegy kezelése** („Hibajegyek kezelése”: Műszaki, Admin): nyitott → folyamatban (átvétel) → lezárva (javítva vagy nem hiba); nyitott jegy közvetlenül is lezárható, visszanyitás nincs. Megjegyzéseket a Műszaki ír, a jegyet látók olvassák. Az eszköz üzemképesre állítása a Műszaki külön lépése: az adatlapon, vagy lezáráskor az „az eszköz üzemképes” pipával. Minden állapotváltás naplózott.
- **Láthatóság:** a Műszaki és a műszakvezető minden jegyet lát, a jelentő a sajátjait; a fotók letöltését a szerver a jegy láthatósága szerint ellenőrzi. A Műszaki menüjében a „Hibajegyek” mellett a nyitott jegyek száma.
- Tiszta függvények (`lib/equipment/`) tesztekkel: a határidő és a számláló állapota, a figyelmeztetések, a lejáró lista csoportjai, az eszköz és a jegy állapotátmenetei.

**13. mérföldkő – üzemeltetés: éles telepítés bérelt szerverre** (részletesen: „Éles üzemeltetés”)

- Külön éles Compose-fájl Caddyvel: automatikus HTTPS, HSTS, biztonságos sütik, kívülről csak a 80-as és a 443-as port.
- Éles módban a beállítások ellenőrzése induláskor, demo adat nélkül; az első admin egy paranccsal.
- Belépési korlát (felhasználónévenként és IP-nként), naplózással; a fogadó API és a naptárlink kéréskorlátja.
- Napi és kézi mentés, visszaállítás, próba-visszaállítás; a legutóbbi mentés és a futó verzió az admin oldalon.
- Frissítés egy paranccsal, állapotellenőrzéssel; állapotvégpont, Docker-állapotfigyelés, naplóforgatás.
- Utómunka: a feltöltött képek (hibajegy-fotó, eszköz- és képzési dokumentum) a szerveren legfeljebb 1600 pixeles hosszabb oldalra kicsinyítve, a tájolásuk szerint elforgatva, JPEG-be kerülnek, metaadatok (pl. GPS-hely) nélkül; az eredeti nem marad meg, a PDF változatlan. A 10 MB-os korlát a kicsinyítés előtti fájlra vonatkozik.

**12. mérföldkő – ügynöki beosztásnézet, naptárral**

- **Jogosultság:** az Ügynök szerepkör saját hatókörrel kapja a „Beosztás megtekintése” jogosultságot. A `Műszakok` táblázatban csak a saját sorát látja, a tervezetet nem, szerkeszteni nem tud; belépés után továbbra is a saját taskjaira érkezik.
- **„Beosztásom”** (az ügynök nézetéből, telefonra): heti lista hétfőtől, lapozással. Naponként a valós műszak ideje; „Még nincs publikálva” a nem publikált napon, „Szabad”, ha a publikált napon nincs műszak. Ahol a valós eltér a publikálttól, kiemelve: „Publikált: 14:00–22:00 → Valós: 16:00–22:00, módosult: 10. 02. 08:05” (a beosztás táblázatával azonos összevetés; a módosulás ideje a valós műszak vagy bármely részének legutóbbi változása; a valós rétegből törölt műszaknál idő nélkül). A napra koppintva a részek: típus, idő, helyszín, leírás, a blokk az utazással; eltérésnél a publikált részek is. Az éjfélen átnyúló műszak a kezdőnapjánál, „22:00–06:00 (+1)” alakban.
- **Napi összefoglaló:** az ügynök napi taskjai fölött „Műszakod”: a napi műszak, a blokkok, az eltérés.
- **Naptár:** szabványos iCalendar (.ics), bármelyik naptárral működik (Outlook és Microsoft 365, Google, Apple, Thunderbird). Külső szolgáltatás nem kell: a saját szerverünk adja.
  - *Mentés a naptárba:* a megjelenített hét vagy egy választott időszak (legfeljebb 31 nap) letöltése. Egyszeri másolat, a későbbi változásokat nem követi.
  - *Feliratkozás:* személyes link, amelyre a naptár URL-ből feliratkozik, és magától frissíti (lásd „Naptár-feliratkozás” lent).
  - *Tartalom:* a publikált napok valós műszakjai (a feliratkozásban egy héttel visszamenőleg és minden jövőbeli publikált nap); tervezet és nem publikált nap nincs benne. Műszakonként egy esemény („Műszak 06:00–14:00”), a leírásban a részek, eltérésnél „Módosult: … Publikált: …”. Az esemény azonosítója a műszakhoz kötött, így módosításkor frissül, a törölt műszak eltűnik. Az időpontok UTC-ben, a naptár a saját időzónájára váltja.
- Tiszta függvények (`lib/calendar/`, `lib/roster.ts`) tesztekkel: az .ics szövege (sortördelés, escape, fejléc), az események, óraátállítás, éjfélen átnyúló műszak, a nyilvános cím.

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
| `ugynok1` | Kiss Péter | Ügynök, Mentor |
| `ugynok2` | Nagy Eszter | Ügynök |
| `koordinator` | Oktató Olga | Oktatási koordinátor |
| `vizsgaztato` | Vizsga Vera | Vizsgáztató |
| `muszaki` | Műszaki Márton | Műszaki |

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
- Egy párosítatlan MVT (ET 3365, a légitársaság nincs a rendszerben) az `Üzenetek → Párosítatlan üzenetek` listában.
- A 2026. szeptember 27-i minták: a ZZ1101 érkezésén a Lufthansa LDM, CPM, PSM és érkezési MVT – az infografikán legfelül a keretezett utasítás és a DAA, a D külön, a PSM darabszámai; a ZZ1204 IST-indulásán a Turkish PSM és PTM (csak darabszámok); a ZZ1102-n a célállomás korrekciós AA-ja.
- Slotok: a ZZ1306-on egy SAM, majd az új verziója, egy SRM; a ZZ1408-on egy SAM, amelyet a késő ETD miatt „Slot” figyelmeztetés kísér. A késéskódoknál felajánlott kód egy kattintással felvehető.
- A címjegyzékben csak nem létező címek vannak (`@example.invalid`, kitalált SITA-cím); a késéskódok (36, 68, 81, 82, 93) leírása az IATA-szabvány szerinti. A Demo Fapados járatain a „Késéskódok” egy saját készítésű minta-PDF-et nyit meg (nem valódi légitársasági dokumentum); a Ryanairnek nincs dokumentuma, ott a közös kódtábla nyílik le. A repülőtér-táblában a demo- és mintajáratok repülőterei.

A fogadó API kipróbálása: `admin`-ként az `Admin → Üzenetküldés` oldalon hozz létre egy API-kulcsot (csak egyszer látszik), majd:

```bash
curl -X POST http://localhost:3000/api/messages -H "Authorization: Bearer <kulcs>" -H "Content-Type: text/plain" --data-binary $'MVT\nZZ1204/26.HAZZB.BUD\nAD261035/261044 EA261240 STN'
```

JSON is küldhető, a beérkezés idejével és a forrással:

```bash
curl -X POST http://localhost:3000/api/messages -H "Authorization: Bearer <kulcs>" -H "Content-Type: application/json" -d '{"text":"MVT\nZZ1204/26.HAZZB.BUD\nAD261035/261044","source":"teszt","receivedAt":"2026-09-26T10:50:00Z"}'
```

A válasz üzenetenként megadja a típust, az állapotot (tárolva, duplikátum, nem támogatott), a párosítást és a figyelmeztetéseket. (A `26` a mai nap helyére írandó.) A `docs/messages.md` szeptember 27-i mintacsomagja egyben beküldve kilenc üzenetre bomlik.

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

### A létszámigény kipróbálása

1. `tervezo`-ként vagy `vezeto`-ként nyisd meg a `Létszámigény` menüt. A betöltés napján a csúcs 16:15-kor 4 fő (két átfedő forduló, feladattípusonként 2–2), miközben egy ügynök van beosztva: a legnagyobb hiány 3 fő. Reggel 06:15 és 08:15 között szintén hiány van, délben a két ügynök fedezi az igényt.
2. 10:45-kor a beosztás még 1 fő: Nagy Eszter oktatása 10:30-ig tart, a 20 perces visszaút 10:50-ig, a műszakja 11:00-kor kezdődik.
3. Az `Áttekintés` fülön mától egy hét látszik: a mai nap sora színes, a holnapi napnak van beosztása, de igénye nincs; az azutáni napoknak nincs valós beosztásuk (∅). Az importpróba után a 2024. szeptember 10-i hét igénye is megnézhető (ott még nincs beosztás, így hiány sem jelölődik).
4. A tervezet összevetése: az importpróba és a tervezői nézet kipróbálása (fent) után, amikor a terv „Mentés a tervezetbe” gombbal a 2024. szeptember 10-i hét tervezetébe került, `tervezo`-ként nyisd meg az `Áttekintés` fület 2024-09-10 és 2024-09-16 között: a napok „T” jelölést kapnak, és az igény a tervezet műszakjaival vetődik össze. `vezeto`-ként ugyanitt csak az igény látszik, mert a napok még nincsenek publikálva.

### Az oktatás kipróbálása

A seed a „Helyőrző A képzés”-t elméleti és gyakorlati résszel (az OJT-követelmény a demóban 2 gyakorlás), a „Helyőrző C képzés”-t csak elméleti résszel tölti be, egy rövid kérdésbankkal, két vizsgalappal és három gyakorlati szemponttal. Kiss Péter mentor, Vizsga Vera vizsgáztató (mindkettőnek érvényes a jogosítása).

1. `ugynok2`-ként (Nagy Eszter) a `Képzések → Saját jogosításaim` oldalon kiemelve látszik a nyitott e-vizsga: a Kezdés gombtól 20 perce van, telefonon is kitölthető. Lent a két képzési folyamata.
2. A „Helyőrző A” folyamat félúton van: egy sikertelen kísérlet (5 / 10 pont, 50%, visszajelzéssel), egy nyitott kísérlet, 1 / 2 megfelelő gyakorlás (a ZZ1101 gyors fordulón, Kiss Péter mellett; az ügynök nézetben „OJT” jelöléssel), gyakorlati vizsga még nincs. `vizsgaztato`-ként a kísérlet részleteinél a helyes válaszok, a szöveges válasz pontozása és a belső megjegyzés is látszik; a folyamat oldalán gyakorlati vizsga rögzíthető (figyelmeztet, mert az OJT még nem teljesül). A „Biztonságos munkavégzés az előtéren” kizáró szempont: ha „nem felelt meg”, a végeredmény sikertelenre áll, és nem módosítható.
3. A „Helyőrző C” ismétlő folyamat kibocsátható (sikeres e-vizsga, 100%): `koordinator`-ként a `Képzések → Képzési folyamatok` oldalon elöl áll; a „Kibocsátás” gomb létrehozza a képzési rekordot, és Nagy Eszternél a HC jogosítás érvényessé válik.
4. `vezeto`-ként egy mai task oldalán az „On the job gyakorlás” szakaszban gyakornok vehető fel – csak olyan rész mellé, amelynek ügynöke mentorálhat (pl. Kiss Péter részei); a sávos nézeten a gyakornok sávján „OJT” doboz jelenik meg. (A ZZ1101-es gyakorlás 07:30-kor volt, Nagy Eszter műszakja előtt, ezért az ő sávján ez a doboz műszakon kívülinek jelölődik.)

### Az eszközök és a hibajegyek kipróbálása

A seed négy eszköztípust (Pushback, Szalagkocsi, Utasbusz és a nem motoros Utaslépcső) és hét eszközt tölt be. A határidők a betöltés napjához igazodnak, így minden állapot látszik: érvényes, hamarosan lejár (PB-01 szerviz, BLT-01 műszaki vizsga, BUS-01 szerviz), lejárt (PB-02 műszaki vizsga, BLT-02 szerviz), nincs megadva (BLT-02 műszaki vizsga), és az esedékességet elért üzemóra (PB-02). A BUS-02 kivont, ezért a lejárt határidői nem szerepelnek a lejáró listán.

1. `muszaki`-ként az `Eszközök` listáján az állapot, a nyitott jegyek és a legközelebbi határidő; a `Lejáró határidők` oldalon a két csoport. A PB-01 adatlapján az üzemóra változásnaplója (1420 → 1480) és egy minta szervizlap (PDF).
2. A `Hibajegyek` menüben (mellette a nyitott jegyek száma, 2) három jegy: a STR-01 korlátja nyitott (Nagy Eszter jelentette); a PB-02 folyamatban, üzemképtelennek jelentve, megjegyzéssel; a BUS-01 lezárva (javítva), az eszköz a lezáráskor üzemképesre állt – az adatlap állapotnaplójában mindkét sor a jegyre hivatkozik.
3. A STR-01 jegyét vedd át, írj megjegyzést, majd zárd le „nem hiba”-ként. A PB-02-t lezárva az „az eszköz üzemképes” pipával az eszköz visszaáll; pipa nélkül üzemképtelen marad, és az adatlapon állítható vissza.
4. `ugynok2`-ként az ügynök nézetben a „Hiba jelentése” gombbal telefonról jelenthető hiba, fotóval. Az ügynök a `Hibajegyek` menüben csak a saját jegyeit látja: `ugynok1`-ként a PB-02 jegye a Műszaki megjegyzésével (írni nem tud). `vezeto`-ként minden jegy és az eszközök állapota látszik, kezelés nélkül.

### Az ügynöki beosztásnézet kipróbálása

1. `ugynok2`-ként (Nagy Eszter) a `Taskjaim` oldalon a taskok fölött „Műszakod”: 09:00–19:00, az oktatás blokkjával (utazással 08:40–10:50). Holnapra lapozva: „Publikált: 14:00–22:00 → Valós: 16:00–22:00”, a módosulás idejével.
2. A „Beosztásom” gombbal a hét: a betöltés napja és a következő nap publikált, a többi „Még nincs publikálva”. A napra koppintva a részek. A `Műszakok` menüben a táblázatban csak a saját sora látszik.
3. Lent a „Naptár” részben „A megjelenített hét letöltése (.ics)” egy fájlt ad, amelyet a naptár importál.
4. A feliratkozáshoz a szervernek nyilvános HTTPS-cím kell (lásd „Naptár-feliratkozás” lent). Helyi próbához indítsd így: `APP_PUBLIC_URL=http://localhost:3000 docker compose up -d`. Ekkor a „Feliratkozási link kérése” gomb ad egy linket, amely a böngészőben megnyitva a naptárfájlt adja, és a gépen futó naptárprogram (pl. Thunderbird, asztali Outlook) is feliratkozhat rá; a felhős naptárak (Outlook a weben, Google) a `localhost`-ot nem érik el.
5. `admin`-ként az `Admin → Felhasználók` listán a „Naptárlink” oszlop mutatja, kinek van élő linkje és mikor kérték le utoljára; a felhasználó oldalán visszavonható. A javasolt frissítési idő: `Admin → Beállítások`.

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

Éles telepítéshez a `docker-compose.prod.yml`-t használd: abban van HTTPS, mentés, frissítés és állapotfigyelés, és nincs demo adat (lásd „Éles üzemeltetés” lent). Ha mégis a demo összeállítást tennéd elérhetővé:

- Állíts be saját titkos kulcsot a munkamenetekhez: `AUTH_SECRET=<hosszú véletlen szöveg> docker compose up -d` (generálás: `npx auth secret` vagy `openssl rand -base64 32`).
- Cseréld le az adatbázis jelszavát a `docker-compose.yml`-ben.
- Változtasd meg vagy inaktiváld a demo felhasználókat.
- A képzési rekordok fájljai, a légitársaságok késéskód-dokumentumai, az eszközök dokumentumai és a hibajegyek fotói az `uploads` kötetben vannak; az adatbázissal együtt mentsd. Automatikus törlés nincs.
- Naptár-feliratkozás: állítsd be az `APP_PUBLIC_URL`-t a szerver nyilvános HTTPS-címére (lásd lent).
- Üzenetküldés emailben: állítsd be az `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` környezeti változókat az app szolgáltatásnál, és az `Admin → Üzenetküldés` oldalon a feladó címét. Cseréld le a demo címjegyzéket. Amíg nincs SMTP, a küldés csak naplóz; SITA-átjáró még nincs.

### Naptár-feliratkozás

Az ügynök személyes linkjét (`https://<cím>/api/calendar/<kulcs>.ics`) a naptárprogram tölti le, belépés nélkül, ezért:

- **Nyilvános HTTPS-cím kell.** Az Outlook a weben és a Google Naptár a saját szervereiről kéri le a linket, tehát a szervernek az internetről, HTTPS-sel elérhetőnek kell lennie. Az éles összeállítás ezt adja: a Caddy automatikus tanúsítvánnyal (lásd „Éles üzemeltetés”).
- **Az `APP_PUBLIC_URL` környezeti változó** a nyilvános cím, ebből készülnek a linkek; élesben a `.env`-ben van. Ha nincs beállítva (vagy nem HTTPS; a sima HTTP csak `localhost`-on elfogadott), feliratkozási link nem kérhető, csak a letöltés működik, és a felület ezt jelzi.
- **A link titkos:** a felhasználóhoz kötött kulcsot tartalmaz, csak olvasásra jó, és csak a saját beosztását adja. A kulcsot hash-elve tároljuk, a link csak létrehozáskor látszik. Új link kérésekor a régi megszűnik; az ügynök és az admin vissza is vonhatja. Inaktív felhasználó linkje nem működik.
- **Frissítés:** a gyakoriságot a naptárprogram dönti el. A javasolt idő (`Admin → Beállítások`, alapból 1 óra) csak javaslat: az Outlook a weben nagyjából 3 óránként, de akár 24 óránál is ritkábban, a Google akár naponta egyszer frissít. Azonnali értesítésre ezért nem alkalmas.
- **Céges Microsoft 365:** az IT a külső naptárra való feliratkozást korlátozhatja; ha a lenti lépés nem érhető el, az IT-tól kell engedélyt kérni.

Feliratkozás a gyakori naptárakban (a menük neve verziónként kicsit eltérhet):

| Naptár | Lépések |
|---|---|
| Outlook a weben, új Outlook | Naptár → Naptár hozzáadása → Feliratkozás a webről → a link beillesztése, név → Importálás |
| Klasszikus asztali Outlook | Naptár → Naptár hozzáadása → Internetről → a link beillesztése |
| Google Naptár | Gépen, böngészőben: Egyéb naptárak → + → URL-ből → a link beillesztése. Telefonon nem adható hozzá, de a hozzáadott naptár ott is megjelenik. |
| iPhone, iPad | Beállítások → Naptár → Fiókok → Fiók hozzáadása → Egyéb → Feliratkozott naptár hozzáadása |
| Mac Naptár | Fájl → Új naptár-előfizetés → a link beillesztése |
| Thunderbird | Új naptár → Hálózaton → a link beillesztése |

## Éles üzemeltetés

Ez a fejezet egy bérelt Linux szerverre (VPS) telepíti az alkalmazást, saját domainnel és HTTPS-sel. A demo `docker-compose.yml` helyett a `docker-compose.prod.yml` fut: az alkalmazás, az adatbázis, a napi mentés és egy Caddy fordított proxy, amely automatikusan szerez és megújít Let's Encrypt-tanúsítványt. Kívülről csak a 80-as és a 443-as port látszik. Éles módban nincs demo adat. A domainen és a szerveren kívül más szolgáltatás nem kell.

### Mire van szükség

- **Szerver:** Linux VPS, például Ubuntu 24.04 LTS vagy Debian 12. Induláshoz: 2 vCPU, 4 GB memória és 40 GB lemez; mellé 2 GB swap továbbra is javasolt (az alkalmazás a szerveren épül, az építés memóriát kér). Ezek helyőrző értékek: a lemezigény a feltöltött fájlokkal és a mentésekkel nő (az admin oldal mutatja, lásd „Állapotfigyelés”), a felhasználók számához illő méretet a terhelési próba mondja meg.
- **Domain**, amelynek a DNS-ét beállíthatod (pl. `beosztas.example.com`).
- SMTP-szerver, ha emailben is küldesz üzenetet (nem kötelező).

### 1. A szerver előkészítése

Belépés után, rendszergazdaként:

```bash
apt update && apt upgrade -y
apt install -y git
curl -fsSL https://get.docker.com | sh
```

Tűzfal: csak az SSH, a HTTP és a HTTPS legyen nyitva (a szolgáltató tűzfalán is):

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw enable
```

Swap (ha a szervernek nincs):

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 2. A domain beállítása

A domain DNS-ében egy `A` rekord (IPv6-nál egy `AAAA` is) mutasson a szerver IP-címére. Ellenőrzés a saját gépedről: `nslookup beosztas.example.com`. Amíg ez nem a szervert adja, a tanúsítvány nem készül el.

### 3. Telepítés és első indítás

```bash
git clone <a repó címe> ground-handling
cd ground-handling
cp .env.production.example .env
chmod 600 .env
nano .env
```

A `.env`-ben töltsd ki:

- `DOMAIN`: a domain, `https://` nélkül;
- `APP_PUBLIC_URL`: `https://` és a domain;
- `AUTH_SECRET`: generáld így: `openssl rand -base64 32`;
- `POSTGRES_PASSWORD`: generáld így: `openssl rand -hex 24`;
- ha kell, az SMTP-t és a mentés idejét (`BACKUP_TIME`, `BACKUP_KEEP_DAYS`).

A `.env` titkokat tartalmaz: ne kerüljön a repóba, és ne küldd el senkinek. Az első indítás ugyanaz a parancs, mint a frissítés:

```bash
ops/update.sh
```

Az alkalmazás induláskor ellenőrzi a beállításokat. Ha valami hiányzik vagy hibás, nem indul el, és a naplóban megnevezi, mi az (`docker compose -f docker-compose.prod.yml logs app`). Ezután lefutnak a migrációk; ha egy migráció hibázik, az alkalmazás nem indul el. A Caddy az első kéréskor megszerzi a tanúsítványt.

### 4. Az első admin

Az éles adatbázis üres: nincs demo adat, és a demo betöltése éles módban le is van tiltva. Az első admin felhasználót egy parancs hozza létre; bekéri a nevet, a felhasználónevet és kétszer a jelszót (gépeléskor nem látszik). Ha már van aktív admin, megtagadja.

```bash
docker compose -f docker-compose.prod.yml exec app npx tsx scripts/create-admin.ts
```

Utána a `https://<domain>` címen belépve az `Admin` oldalon vedd fel, amit a demó magától hozott: a felhasználókat és a csapatokat, a légitársaságokat a feladattípusaikkal és a sablonjaikkal, a késéskódokat és a repülőtereket (`Admin → Üzenetküldés`), a beállításokat. A szerepkörök, a „Műszak” és „TRN” résztípus, az „Alap” feladattípus és a BUD repülőtér már megvan.

### Biztonság

- Csak HTTPS: a HTTP átirányít, a böngésző a HSTS miatt egy évig csak HTTPS-en jön vissza, a sütik csak HTTPS-en mennek.
- **Belépés:** felhasználónévenként 5, IP-címenként 20 sikertelen kísérlet után 15 percig nem lehet belépni (helyőrzők; az IP-nkénti korlát azért nagyobb, mert a repülőtéren sok ügynök ugyanarról a nyilvános címről lép be). Minden kísérlet naplózott (`LoginAttempt` tábla, 30 napig). Zárolt felhasználót a várakozás old fel; sürgős esetben az admin a naplóból törölheti a nevét:

  ```bash
  docker compose -f docker-compose.prod.yml exec db psql -U ground_handling -d ground_handling -c "DELETE FROM \"LoginAttempt\" WHERE username = 'kiss.peter'"
  ```

- **Nyilvános végpontok:** a fogadó API és a naptárlink túl sok kérésre 429-et ad (`Retry-After`-rel).
- Titok csak a `.env`-ben van; a napló és az ellenőrzés a beállítás nevét írja ki, az értékét soha.

### Mentés

- **Napi automatikus mentés** `BACKUP_TIME`-kor (alapból 03:30, budapesti idő szerint), a szerver `backups` könyvtárába. A mentés a Compose része, a szerver crontabja nem kell hozzá.
  - Az adatbázis naponta teljes mentést kap: `backup-ÉÉÉÉHHNN-ÓÓPPMM.tar.gz`, benne a fájllista is, hogy akkor mely feltöltött fájlok voltak meg. A `BACKUP_KEEP_DAYS`-nél (alapból 14) régebbiek törlődnek.
  - A feltöltött fájlok **növekményesen**, egy közös tárba kerülnek (`backups/files`): mindegyik egyszer, nem naponta újra, mert egy feltöltött fájl soha nem változik. Ha egy fájlt már egyik megőrzött mentés sem említ (az alkalmazásból törölték, és azóta lejárt a megőrzés), a tárból is kikerül.
- **Kézi mentés**, pl. egy nagyobb módosítás előtt: `ops/backup.sh`.
- Az `Admin` oldal „Üzemeltetés” kártyája mutatja a legutóbbi sikeres mentést; ha 2 napnál régebbi, vagy nincs, piros figyelmeztetést ad. A mentés naplója: `docker compose -f docker-compose.prod.yml logs backup`.
- **Másolat a szerveren kívülre** – ez az üzemeltető dolga, mert a szerverrel együtt a mentés is elveszhet. A legegyszerűbb a saját gépedről, `rsync`-kel (rendszeresen, pl. hetente):

  ```bash
  rsync -av --ignore-existing <felhasználó>@<szerver>:ground-handling/backups/ ~/ground-handling-mentesek/
  ```

  A parancs a teljes `backups` könyvtárat másolja, a `files` tárral együtt; az `--ignore-existing` miatt minden alkalommal csak az új csomagok és az új fájlok jönnek át.

- A mentés személyes adatokat tartalmaz (pl. képzési rekordok és csatolmányaik): a másolatot is biztonságos helyen tárold.

### Visszaállítás

```bash
ops/restore.sh                                  # a mentések listája, a legújabb elöl
ops/restore.sh backup-20261002-033000.tar.gz    # visszaállítás
```

A szkript megerősítést kér (be kell írni: `VISSZAÁLLÍT`), előtte a mostani állapotról is mentést készít, leállítja az alkalmazást, az adatbázist teljesen újra létrehozza a mentésből, a feltöltött fájlokat kicseréli, majd elindítja az alkalmazást, és megvárja, hogy egészséges legyen. Ami a mentés óta történt, elvész.

- **Új szerverre:** telepítsd a 3. lépésig, másold a teljes `backups` könyvtárat (a csomagokat és a `files` tárat) a szerverre, és futtasd az `ops/restore.sh`-t.
- **Ép-e a mentés:** a visszaállítás előbb ellenőrzi, hogy a csomag és a listáján szereplő minden fájl megvan-e; ha nem, el sem indul, és semmi sem változik. A régi, minden fájlt magában tartó csomagok is visszaállíthatók.
- **Verzió:** a mentést ugyanazzal vagy újabb verzióval állítsd vissza; egy régebbi mentést az induló migrációk felhoznak. Újabb verzió mentését régebbi verzióra ne állítsd vissza.
- **Próba-visszaállítás:** `ops/restore-test.sh` (vagy a mentés nevével) egy ideiglenes, üres adatbázisba tölti a mentést, és kiírja, mi van benne (táblák, felhasználók, járatok, taskok, műszakok, képzési rekordok, eszközök, hibajegyek, fájlok). Az éleshez nem nyúl. Érdemes havonta lefuttatni: így derül ki, hogy a mentés tényleg használható.

### Frissítés

```bash
ops/update.sh
```

1. mentés,
2. az új verzió letöltése (`git pull`),
3. építés,
4. újraindítás (a migrációk induláskor lefutnak),
5. állapotellenőrzés: megvárja, hogy az állapotvégpont az új verziót és „ok”-t mutasson.

Ha már az új verzió fut, nincs teendő (újraépítés: `ops/update.sh --force`). Ha az állapotellenőrzés 5 perc alatt sem sikerül, a szkript megáll, és kiírja a visszaállás lépéseit: az előző verzió (`git reset --hard <előző>` és újraépítés), és ha a migráció már lefutott, a frissítés előtti mentés visszaállítása. A futó verzió (commit és dátum) az `Admin` oldalon és az állapotvégponton látszik.

### Állapotfigyelés

- **Állapotvégpont:** `https://<domain>/api/health`, belépés nélkül. Megmondja, elérhető-e az adatbázis, írható-e a feltöltési könyvtár, melyik verzió fut, és mennyire tele a lemez (`disk`: `ok`, illetve 80% fölött `warning`, a foglaltság százalékával); hibánál 503-at ad. A tele lemez miatt nem ad 503-at, és az alkalmazás nem indul újra. Érzékeny adat nincs benne.
- **Lemez:** az `Admin` oldal „Üzemeltetés” kártyája mutatja a lemez foglaltságát és a szabad helyet, valamint a mentések méretét (adatbázis-csomagok és fájltár); 80% fölött (helyőrző) piros figyelmeztetést ad.
- **Docker:** ugyanezt kérdezi 30 másodpercenként; ha háromszor egymás után hibát kap, újraindítja az alkalmazást. Állapot: `docker compose -f docker-compose.prod.yml ps`.
- **Naplók:** `docker compose -f docker-compose.prod.yml logs <app|db|backup|caddy>`. Szolgáltatásonként legfeljebb 5 × 10 MB, a régebbi magától törlődik, így a lemez nem telik meg.
- **Külső figyelő (nem kötelező):** egy ingyenes uptime-figyelő (pl. UptimeRobot, vagy a saját gépeden futó Uptime Kuma) 5 percenként kérje le a `https://<domain>/api/health` címet. Riasszon, ha a válasz nem 200, vagy nincs benne `"status":"ok"`.

### Hibaelhárítás

| Jelenség | Mit nézz meg |
|---|---|
| Az alkalmazás nem indul | `docker compose -f docker-compose.prod.yml logs app`: az induláskori ellenőrzés megnevezi a hiányzó vagy hibás beállítást; migrációs hiba is itt látszik. A `.env` javítása után: `docker compose -f docker-compose.prod.yml up -d`. |
| Nincs tanúsítvány, a böngésző hibát jelez | A domain a szerverre mutat-e (2. lépés); nyitva van-e a 80-as és a 443-as port (a szolgáltató tűzfalán is). Napló: `docker compose -f docker-compose.prod.yml logs caddy`. Sok sikertelen próbálkozás után a Let's Encrypt egy ideig vár. |
| 502-es hiba | A Caddy fut, de az alkalmazás nem: `docker compose -f docker-compose.prod.yml ps` és `logs app`. |
| Nem lehet belépni („Túl sok sikertelen…”) | 15 perc várakozás, vagy a fenti `LoginAttempt` törlés. Elfelejtett admin jelszó: egy másik admin állít újat. Ha nincs másik: az elfelejtett admint inaktiváld (`docker compose -f docker-compose.prod.yml exec db psql -U ground_handling -d ground_handling -c "UPDATE \"User\" SET active = false WHERE username = '<név>'"`), hozz létre új admint az első admin parancsával, és vele állíts új jelszót a régi fióknak, majd aktiváld újra. |
| Az admin oldal régi mentést jelez | `docker compose -f docker-compose.prod.yml logs backup`; kézi mentés: `ops/backup.sh`; elég-e a lemez: `df -h`. |
| Fogy a lemez (piros figyelmeztetés az admin oldalon) | `df -h`, `docker system df`; a frissítések után megmaradt régi image-ek: `docker image prune -f`; a mentések megőrzése: `BACKUP_KEEP_DAYS`. |
| Az építés megszakad (kevés memória) | Swap (1. lépés), vagy nagyobb szerver. |

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
| `lib/roster.ts` | Beosztás-segédfüggvények: publikált napok, a publikált és a valós réteg eltérései, az ügynök napjai a módosulás idejével |
| `lib/ops/` | Üzemeltetés: az éles beállítások ellenőrzése, az első admin, a belépési korlát és a kéréskorlátok, a mentések állapota, a futó verzió; tesztekkel |
| `ops/`, `docker/` | Az éles szerver szkriptjei (frissítés, mentés, visszaállítás, próba-visszaállítás); a konténerek indító, mentő és állapotellenőrző szkriptjei, a Caddyfile |
| `lib/calendar/` | A beosztás naptárként: az .ics szöveg (RFC 5545: sortördelés, escape, UTC, fejléc), az események a műszakokból, a letöltés és a feliratkozás időszaka, a nyilvános cím; tiszta függvények tesztekkel |
| `lib/task-types.ts` | Feladattípusok: egy új járat taskjai a légitársaság aktív feladattípusai szerint, és ugyanannak az embernek két feladattípusa egy járaton |
| `lib/planning/` | Tervezés: bemenet (napi ablakok), a pozíció szabályai, minimális pozíciószám, kiegyenlítés és mutatók, betölthetőség párosítással, a terv nézete, mentés a tervezetbe, kiosztás átvétele; tiszta függvények tesztekkel |
| `lib/exams/` | Oktatás: a vizsgakísérlet másolata, az e-vizsga pontozása és eredménye, az OJT-mutatók és a követelmény, a folyamat állapota és a kibocsátás rekordja, a mentor és a vizsgáztató alkalmassága; a helyőrző alapértékek egy helyen (`defaults.ts`); tiszta függvények tesztekkel |
| `lib/staffing/` | Létszámigény: a nap 15 perces sávjai óraátállítással, a sáv csúcsa feladattípusonként és összesen, a beosztás és a hiány, a nap összesítése, a grafikon és az áttekintés számításai; tiszta függvények tesztekkel |
| `lib/equipment/` | Földi eszközök: a határidő és a számláló állapota, a figyelmeztetések és a legközelebbi határidő, a lejáró lista csoportjai, az eszköz és a hibajegy állapotátmenetei; tiszta függvények tesztekkel |
| `lib/telex/` | Üzenetek: szétválasztás (COR, -TITLE), fejléc, MVT/LDM/CPM/UCM, PSM/PTM (csak darabszámok) és ADEXP (SAM, SRM) feldolgozók, párosítás, slot, ellenőrzések, hatás a járatra, infografika, MVT-előállítás (indulási, érkezési, korrekció), kézbesítési döntések; tiszta függvények, tesztek a docs/messages.md mintáival |
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
