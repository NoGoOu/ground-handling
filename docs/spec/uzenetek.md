# Üzenetek: fogadás, hatás a járatra, infografika, késéskód, MVT, slot

Mit kezd a rendszer a beérkező és a kimenő üzenetekkel. Az üzenetek szövegére vonatkozó szabályok (formátumok, kódok, szétválasztás, párosítás, verziókulcsok, ellenőrzések, minták): `docs/spec/uzenet-formatumok.md`. Kód: `lib/telex/`.

## Fogadás

- **Egyetlen belépési pont:** minden üzenet ugyanazon a feldolgozáson megy át. A külső források (később egy email- vagy SITA-átjáró, szkriptek) a fogadó API-n keresztül küldik be az üzeneteket; a kézi bemásolás a felületen ugyanezt a feldolgozást hívja.
- **Fogadó API:** `POST /api/messages`, API-kulccsal (`Authorization: Bearer …`). A törzs lehet nyers szöveg vagy JSON (`text`, opcionálisan `source` és `receivedAt`). A válasz üzenetenként megadja a felismert típust, a párosítás eredményét és a figyelmeztetéseket. Méretkorlát kérésenként: 256 KB (helyőrző).
- **API-kulcsok:** az admin hozza létre (név, aktív). A kulcs csak létrehozáskor látható, hash-elve tároljuk, visszavonható; látszik az utolsó használat ideje. Minden API-hívás naplózott (kulcs, idő, eredmény).
- **Támogatott típusok:** MVT, LDM, CPM, UCM, PSM, PTM, és az ADEXP slotüzenetek közül a SAM és az SRM. Egy szövegben több üzenet is lehet; a szétválasztás szabályai a formátumleírásban vannak.
- **Felismert, de nem támogatott típus:** a tartalmát nem tároljuk. A naplóba csak a típus, a fejléc (járat, dátum) és a beérkezés ideje kerül.
- **Duplikátum:** azonos szöveg nem kerül be kétszer (hash alapján), mert az átjárók újraküldhetnek; a második beküldés a meglévő üzenetre hivatkozik.
- A hash a normalizált szövegből készül, a boríték (Type B fejléc, email szöveg) nélkül.

## Feldolgozás és ellenőrzés

- Típusonként hibatűrő feldolgozó, a formátumleírás szerint; a mezőket mintázat alapján ismeri fel, nem csak a helyük alapján. Az ismeretlen sor figyelmeztetést ad, a feldolgozás folytatódik. A nyers szöveg megmarad (kivéve a PSM-et és a PTM-et, lásd lent).
- Az ellenőrzések (összegek, UCM–CPM, LDM–CPM, késések összege) tiszta függvények; eltérésnél figyelmeztetnek, semmit nem utasítanak el.
- Az SI-t nem dolgozzuk fel: szabad szövegként, változatlanul marad meg és jelenik meg.

## Párosítás a járattal

- A párosítás szabályai (járatszám, üzemnap, állomás, a járat része, lajstrom) a formátumleírásban vannak.
- Ami nem párosítható egyértelműen, a „Párosítatlan üzenetek” listába kerül; ott kézzel hozzárendelhető egy járat részéhez, vagy elvethető (a nyers szöveg ekkor is megmarad).
- **Törölt rész:** üzenet nem hat rá.

## Verziók

- Ugyanarra a járatrészre érkező, azonos fajtájú üzenet új verzió: a korábbit nem írja felül, de mindig a legfrissebb érvényes látszik, és az számít. A verziókulcsok a formátumleírásban vannak.
- **Verziók sorrendje:** a beérkezés sorrendje.
- **Kimenő üzenetek:** saját verziókulcson; a járat idejére nem hatnak.

## Hatás a járatra

- **Indulási MVT (BUD, AD):** az off-block a járat rendszerből kapott ATD-je (9. időszámítási szabály); a felszállás és a célállomás várható érkezése eltárolódik; a DL sor késéskódjai a járat késésrekordjai közé kerülnek (forrás: üzenet).
- **Érkezési MVT (BUD, AA):** az on-block a járat rendszerből kapott ATA-ja; a földet érés eltárolódik.
- **A BUD-ra érkező járat indulási MVT-je (más állomásról, EA … BUD):** a várható érkezés a járat ETA-ja (forrás: üzenet). A hatályos ETA/ETD a legutóbbi érték (`docs/spec/jaratok.md`, Késés és törlés).
- **LDM, CPM, UCM:** a járatrész infografikájának forrásai; a járat idejét nem változtatják.
- Minden változás a járatnaplóba kerül, az üzenetre hivatkozva.
- **Bejövő korrekció** (`COR`): új verzió „Korrekció” jelöléssel. Ha ATD-t vagy ATA-t hoz, a rendszerérték a korrekció szerint frissül, és a járatnaplóba kerül.
- **Más állomásról jövő `AA`** egy BUD-ról induló részhez: célállomási érkezés, tájékoztatásként látszik, a járat idejét nem változtatja.

## PSM és PTM, név nélkül

- **Csak a származtatott darabszámokat tároljuk:**
  - PSM: célállomásonként, kódonként (pl. WCHR, WCHS) és osztályonként a darabszám;
  - PTM: továbbjáratonként (járatszám és célállomás) és osztályonként az utasszám, a poggyász darabszáma és súlya.
- **Nem tároljuk:** a nevet, az ülést, a csatlakozó járatot az egyes utasoknál, a nyers szöveget és annak hash-ét. A feldolgozási figyelmeztetés, a napló és az API-válasz sem tartalmazhat sort a szövegből. Duplikátumszűrés a fejléc, a rész száma és a származtatott adat alapján.
- Több rész (`PART1`, `PART2` …): részenként külön verzió, együtt adják az állapotot.
- Unit teszt biztosítja, hogy a mintákból semmilyen név nem kerül a tárolt adatba és a figyelmeztetésekbe.
- A PSM és a PTM az „Üzenetek megtekintése” jogosultsággal látszik, mert név nincs benne.
- **PSM és PTM tárolása:** a nyers szöveg helyén a darabszámok szöveges alakja áll, boríték és az eredeti szöveg hash-e nélkül; az olvashatatlan sorból csak a darabszám marad, a tartalma nem.

## Slotüzenetek (SAM, SRM)

- ADEXP-feldolgozó a formátumleírás szerint. Más `TITLE`: felismerve, nyersen tárolva, „nem feldolgozott” jelzéssel.
- **Repülőtér-tábla:** IATA-kód, ICAO-kód, név; az admin kezeli. A demo adatokban BUD/LHBP és a demo- és mintajáratok repülőterei vannak.
- **Párosítás:** a formátumleírás szerint (először az `IFPLID`, különben útvonal, nap és idő alapján, pontosan egy jelölttel). Kézi hozzárendeléskor az `IFPLID` a járatrészhez kötődik, így a későbbi SRM magától párosul.
- **Az indulási részen:** CTOT, gurulási idő, cél off-block (CTOT − gurulási idő), a szabályozások, az ok és a késéskód. A napi listán és a járaton „Slot hh:mm” jelöléssel.
- **Figyelmeztetés,** ha a tervezett off-block (indulási horgony) később van, mint a cél off-block + slot-tűrés (beállítás, helyőrző: 10 perc).
- A slot nem írja át az ETD-t. A „Késés rögzítése” és az indulási MVT DL sora felajánlja a slotból adódó időt és késéskódot (pl. 81).
- **Nem feldolgozott slot-`TITLE`:** nyersen tárolódik, a járatra nincs hatása.
- **Slot-párosítás:** az útvonalhoz a járat célállomása kell; célállomás nélkül a slotüzenet csak kézzel rendelhető hozzá. Az `IFPLID` a járat indulási részén tárolódik.
- **Slot-figyelmeztetés:** a task nézetben és a napi listán, az elsődleges task indulási horgonyával.
- **Slot-felajánlás:** a „Késés rögzítése” az ETD-hez, az MVT DL sora a késéskódhoz; a felajánlott perc = cél off-block − STD.
- A repülőtér nem törölhető.

## „Üzenetek” fül és infografika

- A járaton új fül, a műszakvezető és az ügynök is látja (a jogosultság szerint): bejövő és kimenő üzenetek járatrészenként, a verziókkal; a nyers és a feldolgozott tartalom; a figyelmeztetések.
- **Infografika, fix elrendezésben,** járatrészenként, az adott rész érvényes üzeneteiből (akár bejövők, akár a mi kimenőink), telefonon is jól olvashatóan:
  - utasok: férfi, nő, gyerek, infant és összesen;
  - rakomány: összesen, rakterenként, főfedélzet; kategóriánként, ha az üzenet megadja;
  - ULD-k pozíció szerint, kategóriával és különleges kóddal; az üres ULD-halmok;
  - különleges kódok összesítése (pl. ELI, ELM, PER, BIG), pozíciókkal;
  - az SI szabad szövegként, változatlanul;
  - a figyelmeztetések, és minden blokknál a forrásüzenet és a beérkezés ideje.
- **„Üzenetek” fül:** a task nézetben.
- Legfelül: a legutóbbi LDM és CPM SI-szövege változatlanul, jól láthatóan, feldolgozás nélkül. Így a keretezett üzemi utasítás (pl. „TAILTIPPING CRITICAL AIRCRAFT…”) és a DAA is látszik.
- Pozíciónként a kategóriák súlya; a konténerek szabad negyedei.
- A sürgős (Q) cargo kiemelve; a személyzet poggyásza (D) külön.
- Érkezési részen: a PSM darabszámai kódonként és osztályonként (pl. „WCHR: 1, business”); az átszálló utasok továbbjáratonként (PTM).
- Indulási részen: a slot és a cél off-block.

## Késéskód

- **Kódtábla:** kód, leírás, aktív; az admin kezeli. A demo adatokban csak a mintákban szereplő kódok vannak (36, 68, 81, 82, 93), IATA-szabvány szerinti leírással. A légitársaság saját kódjai dokumentumként tölthetők fel (lásd lent).
- **Késésrekord a járat indulási részén:** kód és perc, több is lehet; forrása kézi vagy üzenet; ki és mikor rögzítette.
- **Ellenőrzés:** ha a késések összege nem egyezik a késéssel (7. időszámítási szabály), figyelmeztetés.
- **Késés-ellenőrzés:** csak akkor, ha már van ATD.
- **Kézi késésrekord:** törölhető, a törlés naplózott; az üzenetből jött késésrekord nem.
- **Ki rögzíthet késéskódot és küldhet MVT-t:** a járat módosítására jogosult és a rész ügynöke (bármelyik taskon).
- **Késéskódok légitársaságonként:** a légitársasághoz feltölthető a saját késéskód-dokumentuma (PDF, legfeljebb 10 MB, helyőrző), amely a járatról megnyitható: a késésrekordoknál, a „Késés rögzítése” műveletnél és az indulási MVT DL sorának szerkesztésénél. Ha a légitársaságnak nincs dokumentuma, ugyanott a közös kódtábla nyílik meg (kód és leírás). A kódtáblában nem szereplő kód is megmarad, figyelmeztetéssel.
  - Légitársaságonként egy dokumentum. Az új feltöltés cseréli a régit, a régi fájl a tárhelyről törlődik; a dokumentum el is távolítható. A feltöltés, a csere és az eltávolítás naplózott (ki, mikor, milyen fájl).
  - Feltölteni az „Üzenetküldés beállításai” jogosultsággal lehet; megnyitni az is, aki a járat valamelyik taskját látja. A fájl a közös tárhelyen (Docker-kötet) van, a letöltés jogosultságát a szerver ellenőrzi.
- **Késéskód-dokumentum megnyitása:** a közös kódtábla helyben nyílik le, a légitársaság PDF-je új lapon. Megnyithatja az is, aki járatot kezel, vagy a dokumentumokat feltöltheti.

## MVT előállítása és küldése

- **Előállítás** a járat adataiból és a rögzítésekből, szerkeszthető előnézettel; a szöveg alakja a formátumleírásban van.
  - Indulási MVT: fejléc (járatszám, üzemnap, lajstrom, BUD), `AD` a hatályos off-blockkal és a kézzel megadott felszállással, `EA` a célállomással (kézzel), `DL` a késésrekordokból, SI.
  - Érkezési MVT: `AA` a kézzel megadott földet éréssel és a hatályos on-blockkal.
  - Korrekciós MVT: egy korábban küldött MVT-ből, a javított értékekkel, előtte `COR` sorral. Az eredeti kimenő üzenet megmarad, a korrekció új verzió.
  - Az előállított szöveget a saját feldolgozónk visszaolvassa, és ugyanazokat az értékeket kell kapnia (teszt).
- Az érkezési MVT `AA` sora földet érés / on-block, ugyanabban az alakban, mint az `AD` (a projekt gazdája megerősítette).
- Az érkezési MVT akkor küldhető, ha már van hatályos ATA.
- A korrekciós MVT a küldött MVT kártyájáról indítható.
- **Címjegyzék:** légitársaságonként és üzenettípusonként címzettek; egy címzett email-cím vagy SITA Type B cím (7 karakter). A feladó email-címe és Type B címe beállítás. Az admin kezeli.
- **Küldés** az előnézetből, egy gombbal, a jóváhagyott szöveggel:
  - email: SMTP-n, a kapcsolat adatai környezeti változókban (nem az adatbázisban);
  - SITA: átjárón keresztül. Az átjáró fajtája még nyitott, ezért a küldés cserélhető csatorna. Amíg nincs átjáró beállítva, a SITA-címzett „nem küldhető – nincs átjáró” állapotot kap, és a szöveg másolható.
  - **Biztonsági alapállás:** ha nincs beállítva valódi csatorna, a küldés csak naplóz, semmi nem hagyja el a rendszert. A demo és a fejlesztői környezet így nem küldhet véletlenül valódi címre.
- Az email nodemailerrel megy; a demo adatok címei csak `.invalid` doménre mutatnak.
- **Kimenő üzenet:** tárolódik a járat „Üzenetek” fülén, címzettenkénti állapottal (elküldve, hiba, nem küldhető), ki és mikor küldte. A kimenő MVT a járat idejét nem változtatja, mert az a rögzítésekből készült.

## Jogosultságok

- „Üzenetek megtekintése” hatókörrel (Ügynök: a saját taskjai járatai; Műszakvezető és Admin: összes).
- „Üzenetek rögzítése” (kézi bemásolás, párosítatlanok kezelése): Műszakvezető, Admin.
- „Üzenetek küldése” hatókörrel (Ügynök: a saját indulási, illetve érkezési része; Műszakvezető és Admin: összes).
- „Üzenetküldés beállításai” (API-kulcsok, címjegyzék, késéskód-tábla, a légitársaságok késéskód-dokumentuma, a repülőtér-tábla, a slot-tűrés): Admin.
