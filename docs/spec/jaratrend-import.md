# Járatok betöltése: járatrend-import és Ikarus-import

Két út, amelyen járatok tömegesen kerülnek a rendszerbe: a menetrendi fájl importja (a felületről) és a valós járatok betöltése az Ikarus-mentésből (parancssorból, csak helyi kipróbáláshoz).

## Járatrend-import

Az előzetes (napokkal, hetekkel korábbi) tervezéshez a menetrendi járatokat fájlból töltjük be. A fájlok formátuma forrásonként eltér, ezért az import oszlop-párosítással dolgozik, és a párosítás profilként elmenthető.

### Folyamat

1. **Feltöltés:** CSV, JSON, XLSX vagy XLS. Több munkalapos fájlnál munkalap-választás, és a fejlécsor megadása.
2. **Előnézet:** a rendszer mutatja az oszlopokat és az első sorokat.
3. **Párosítás:** a célmezőkhöz forrásoszlop rendelhető, átalakítással. A párosítás profilként elmenthető, és azonos fejlécű fájlnál a rendszer felajánlja.
4. **Szűrés:** csak a BUD-ot érintő sorok és a megadott dátumtartomány marad, mert a fájl akár a teljes hálózatot tartalmazhatja.
5. **Próbafuttatás:** összesítés a mentés előtt: új, változott, változatlan, hibás, párosítatlan és hiányzó sorok. Semmi nem íródik, amíg a felhasználó jóvá nem hagyja.
6. **Mentés.** Minden import naplózott: ki, mikor, milyen fájlt, milyen profillal, és az összesítés.

### Célmezők

- légitársaság, járatszám, indulási és érkezési állomás
- menetrendi indulás és érkezés: dátum és idő, vagy időszak + napminta + idő
- időzóna: UTC vagy helyi idő (a párosításnál választható)
- napeltolás (pl. „+1”: az érkezés másnap van)
- repülőgéptípus és konfiguráció (opcionális)
- következő járat (a forduló képzéséhez, ha a fájl tartalmazza)
- lajstrom (opcionális)

### Átalakítások

Tiszta, tesztelt függvények:

- szóközök levágása és a járatszám egységesítése (`' 428'`, `'055'`)
- dátum és idő összevonása külön oszlopokból
- időszak kibontása: From és Till között a napminta szerinti napokra (`.2.....` = kedd, `123.5..` = hétfő, kedd, szerda, péntek)
- napeltolás alkalmazása
- helyi időből UTC

### Fordulók képzése

- Ha a fájlban van következő-járat oszlop, az érkező járat és a következő járat egy forduló, dátumonként párosítva.
- Az érkezést a következő járat első olyan példányával párosítjuk, amely az érkezés után indul BUD-ról.
- Ha nincs következő járat (nincs ilyen oszlop, vagy az adott sorban üres), a gép itt marad: az érkezésből csak érkező járat lesz. Az a BUD-i indulás, amely egyetlen érkezés következő járataként sem szerepel, csak induló járat lesz (11. időszámítási szabály).
- Az éjszakázó gép is párosítható, ha a fájl megadja a következő járatát: a mintában például az FR9941 pénteki 20:55-ös érkezése a másnapi indulással alkot fordulót, kb. 18 óra földi idővel. Ez hosszú forduló, és a napi listán mindkét napon megjelenik.
- A párosítatlan érkezés vagy indulás az előnézetben jelölve van.
- A földi időt mi számoljuk a párosított STA-ból és STD-ből, nem a fájlból vesszük.

### Érvényesség és felülírás

- Az import csak a menetrendi mezőket írja: járatszámok, STA, STD, típus, indulóállomás, célállomás, és a lajstrom, ha a párosítás megadja. Az ETA, ETD, ATA, ATD, a késés, a törlés és a kiosztás érintetlen marad.
- A menetrendi adat tehát addig érvényes, amíg üzenet (pl. MVT) mást nem mond; ez a pontossági sorrendből következik (STA/STD → ETA/ETD → ATA/ATD).
- **Azonosítás:** légitársaság + járatszám + menetrendi dátum + állomás. A meglévő járat frissül, nem duplikálódik. A menetrendi dátum a járat üzemnapja: az indulás napja az indulóállomáson.
- **Légitársaság:** a járatszám légitársasági kódja adja (a mintafájlban az `Al` oszlop); az üzemeltető (`Own`) nem számít. Ha a légitársaság nem létezik, vagy nincs aktív feladattípusa, a sor hibásként jelenik meg az előnézetben.
- **Taskok:** a járathoz a légitársaság aktív feladattípusai szerinti taskok jönnek létre; az újraimportálás a taskokat nem érinti.
- **Hiányzó járat:** ha egy korábban ugyanazzal a profillal importált járat a fájl időszakán belül hiányzik az új fájlból, nem törlődik és nem kerül töröltre, hanem „az utolsó importból hiányzik” jelölést kap (látszik a napi listán és a járaton), és a tervező dönt róla.
- **Összevonás újraimportáláskor:** ha két korábbi egyoldalú járatból az új fájl szerint forduló lesz, a kettő összevonható, és a kikerülő járat törlődik, de csak akkor, ha az importból jött létre, és nincs rajta üzemi adat (rögzítés, kiosztás, késés, törlés). Minden más esetben „párosítás változott” jelzés, kézi döntés.

### Jogosultság

- „Járatrend importálása”: alapból a Tervező és az Admin szerepkörben.

### Mintafájl: Ryanair NetLine-export (2024. szeptember 6.)

- Munkalapok: `Template_Auto_Export(netline)` (az adatok) és `Legend` (az export paraméterei: S24 és W24 menetrendi időszak).
- 73 810 sor, a teljes hálózat. BUD-ot érintő: 1106 érkező és 1052 induló sor. Az időszakok kibontása után ez 7851 érkezés 2024. 09. 10. és 2025. 03. 29. között.
- Oszlopok:
  - `Al`: marketing légitársaság (FR)
  - `FlNo`: járatszám
  - `S`: utótag (a mintában üres)
  - `From`, `Till`, `Pattern`: az időszak és a napminta
  - `Orig`, `Dest`: indulási és érkezési állomás
  - `STD (UTC)`, `STD (Local Time)`, `STA (UTC)`, `STA (Local Time)`: menetrendi idők mindkét időzónában
  - `DD`: napeltolás („+1”)
  - `Own`: üzemeltető (FR, RR, AL, RK, LW); nem importáljuk
  - `A/C`, `Cfg`, `ACV`: típus és konfiguráció
  - `ST`: szolgáltatástípus (J)
  - `Blkt`: blokkidő
  - `OnwdEventAl`, `OnwdEventFlNo`: a gép következő járata
  - `OnwdEventGt`: lásd lent
  - `NO`: a mintában üres
- A következő járat az 1106 BUD-i érkezésből 1084-nél megtalálható a BUD-i indulások között.
- **Az `OnwdEventGt` nem egy forduló földi ideje, hanem az időszak összes műveletének összege.** Például az FR9941 keddenként 7 alkalommal közlekedik, és 7 × 25 perc = 175. Egy műveletre vetítve 342 sornál pontosan 25 perc jön ki, ami egyezik a sablon gyors fordulójával. Ezt az oszlopot ezért nem importáljuk.
- A mintafájl valós, teljes hálózati adat. A repóban tesztadatnak csak egy kis, BUD-ra szűkített kivonat van.
- A demo adatokban szerepel a Ryanair (FR) légitársaság és a NetLine-export párosítási profilja, így a README-ben leírt próba beállítás nélkül elvégezhető.

### Tesztadat: `ryanair-netline-bud-sample.xlsx`

A mintafájl 14 soros kivonata (`tests/fixtures/schedule/`), mindkét munkalappal (`Template_Auto_Export(netline)` és `Legend`), az eredeti formátumokkal. Minden sor egy esetet fed le. Az idők UTC-ben vannak.

| Sor | Járat | Időszak, napminta | Eset | Várt eredmény |
|---|---|---|---|---|
| 1 + 4 | FR9941 ALC→BUD, FR9942 BUD→ALC | 2024.09.10–10.22, kedd | gyors forduló | STA 07:15, STD 07:40, 25 perc |
| 2 + 5 | FR9941 ALC→BUD, FR2515 BUD→STN | péntek → szombat, 09.13–09.28 | éjszakázó gép | péntek 20:55 → szombat 15:00, hosszú forduló, két napon |
| 3 | FR9941 ALC→BUD | 2025.01.07., kedd | nincs következő járat | csak érkező járat, STA 20:25 |
| 6 + 7 + 8 | FR4092 PRG→BUD, FR4091 BUD→PRG | kedd és szerda | egy érkező sor, két induló sor | kedden és szerdán is STA 05:10, STD 05:35 |
| 9 + 10 | FR3111 PMI→BUD, FR4305 BUD→TSF | 09.10–09.24, kedd | gyors forduló | STA 09:50, STD 10:15 |
| 11 | FR1659 BUD→STN | kedd és csütörtök | a kivonatban egyetlen érkezés sem mutat rá | csak induló járat, STD 05:00 |
| 12 | FR1027 BUD→DUB | szerda | `DD` = „+1” | 8 szerda (2024. 10. 30. – 12. 18.), STD 21:10; az érkezés másnap (BUD szempontjából nem számít) |
| 13, 14 | FR428 PFO→NCL, FR7690 CFU→ARN | – | nem érinti BUD-ot; a 13. sor járatszáma szóközzel kezdődik (`' 428'`) | kiszűrve |

A sorszámok a munkalap adatsoraira vonatkoznak (a fejléc nélkül). Az `OnwdEventGt` értékei az eredetiek (pl. az 1. sorban 175 = 7 × 25 perc), ezeket az import nem használja.

## Ikarus-import

A projekt gazdája 2026. szeptember 28. óta félóránként menti a repülőtéri AODB járatlistáját a saját gépére. Ebből valós BUD-járatok tölthetők a helyi fejlesztői példányba, hogy a tervező (automatikus beosztás) és a létszámigény valós adatokon kipróbálható legyen. Kódja: `lib/ikarus/`, `scripts/ikarus-import.ts`, `scripts/ikarus-report.ts`.

### Adatvédelem

- A pillanatképek, és bármi, ami belőlük készül (járatlista, járatszám, lajstrom, napi riport), **nem kerülhet a nyilvános repóba**; a forrás címe sem. Az importáló a mentés mappáját paraméterként kapja.
- A tesztek csak kitalált mintákkal dolgoznak (kitalált járatszámok és lajstromok), a valós fájlok szerkezetét követve.
- A STATUS.md-be és a leírásokba csak összesített számok kerülhetnek (napok, járatok és fordulók száma, párosítási arány, pozíciószám, napi csúcs), légitársaság, járatszám és lajstrom nélkül.
- Az importáló csak fejlesztői és demo módban fut; éles módban (`APP_ENV=production`) megtagadja. A valós adatforrás éles bekötése külön döntés.
- Az importált járatok egy paranccsal eltávolíthatók, a többi adat érintetlen marad.

### A mentés formátuma

- Napi mappák (`éééé-hh-nn`), bennük félóránként egy fájl: `aodb_ééééhhnn_óóppZ.json` (UTC). A fájl UTF-8, bájtsorrend-jellel (BOM) is lehet. Hézagok vannak: kikapcsolt gép, hálózati hiba, egy hiányzó nap.
- Egy fájl egy gördülő ablak a járatlistából: `data.arrivalFlights` és `data.departureFlights`, valamint `data.updateDate`. Egy járat sok egymást követő fájlban szerepel.
- Rekordonként: `id` (az AODB azonosítója), `flightNumber` (pl. légitársaság-kód + szám, kötőjel nélkül), `route` (a másik repülőtér IATA-kódja), `scheduledTime` (`nn.hh.éééé óó:pp`), `estimatedTime` és `actualTime` (csak `óó:pp`), `standExt` (állóhely), `registration` (kötőjel nélkül, az indulásnál gyakran még üres), `aircraftTypeIata`, `handlerCargo`, `bestSlot`. **Minden idő UTC.**
- Nincs benne következő járat, törölt jelzés és utasonkénti adat. A `pax`, `cargoWeight`, `bagWeight`, `mailWeight`, `checkInRange` és `bestSlot` mezőt nem használjuk.

### Összefésülés

- Rekordonként (irány + `id`) a legutolsó pillanatkép értékei számítanak. A tényleges idő és a lajstrom, ha egyszer megjelent, megmarad akkor is, ha egy későbbi pillanatképben üres, vagy a járat kiesik az ablakból.
- A nap nélküli idő (`estimatedTime`, `actualTime`) napja: a menetrendi időhöz legközelebbi (mint az üzeneteknél, `docs/spec/uzenetek.md`).
- Minden járat bekerül, ami a listán van (a `handlerCargo` értékétől függetlenül).
- A légitársaság a járatszám légitársaság-kódjából adódik. Ha a rendszerben nincs ilyen légitársaság, létrejön (a neve a kód), az „Alap” feladattípussal és a demo sablonnal, elsődlegesként; „Ikarus-import” jelöléssel, hogy az eltávolításkor felismerhető legyen.
- Az azonosítás a járatrend-import szabálya szerint (légitársaság + járatszám + menetrendi dátum + állomás), mellette a járatrészen tárolódik az AODB-azonosító, így az újrafuttatás nem duplikál.

### Fordulók lajstrom alapján

- Az érkezés párja ugyanannak a lajstromnak az érkezés után következő első indulása, ha 24 órán belül van, és azt még nem kapta meg korábbi érkezés. Ami így nem párosul (nincs lajstrom, nincs következő indulás), egyoldalú járat lesz (11. időszámítási szabály). A 24 óra helyőrző.
- Ha újrafuttatáskor a párosítás megváltozik (pl. gépcsere miatt más a lajstrom), a járatrend-import összevonási szabálya érvényes: üzemi adat nélküli, importból létrejött járat átrendeződhet, a többi „párosítás változott” jelzést kap.
- Az érkezés párja csak a gép következő érkezése előtti indulás lehet.
- Hárombetűs légitársaság-kód is elfogadott (a légitársaság űrlapján is). Az érkezési rész üzemnapja az STA budapesti napja. Ha az útvonal több állomás, az érkezésnél az utolsó, az indulásnál az első számít; az általános repülésnél az útvonal szám is lehet, ez is bekerül.

### Mit ír a járatra

- Menetrendi rész: járatszámok, STA, STD, indulóállomás, célállomás, típus, lajstrom, állóhely.
- ETA és ETD a becsült időből, forrásként „Ikarus”; ATA és ATD a tényleges időből, rendszerből kapott értékként (9. időszámítási szabály).
- Törölt jelzést nem állít, mert a mentésben nincs ilyen adat.
- **Források elsőbbsége:** a becsült idő csak akkor írja felül a kézi vagy üzenetből jött ETA/ETD-t, ha az régebbi a rekord utolsó pillanatképénél (a legutóbbi érték szabálya); az üzenetből jött ATA/ATD megmarad. Az állóhelyet felülírja, ha a mentés ad egyet.
- **Hiányzó járat:** „az utolsó importból hiányzik” jelölést nem állít, mert a mentés gördülő ablak, nem menetrend.

### Futtatás

- Parancs a projekt gazdájának gépén (`scripts/ikarus-import.ts --dir <mappa> [--from <nap>] [--to <nap>]`):
  - alapból próbafuttatás összesítéssel: napok, rekordok, járatok (új, változott, változatlan), fordulók (párosított, csak érkező, csak induló), hibás sorok okkal; semmi nem íródik;
  - `--apply`-ra ír, a meglévő importnaplóba („Ikarus” profillal);
  - `remove` minden Ikarus-importból jött járatot és a hozzá létrehozott légitársaságot eltávolít.
- **Eltávolításkor** a járatokhoz párosított üzenetek párosítatlanná válnak (nem törlődnek), az importnapló megmarad; ha egy Ikarus-járat taskján gyakorlati vizsga van, semmit nem távolít el.

### Kiértékelés

- **Riport** (`scripts/ikarus-report.ts`) a projekt gazdájának gépére (CSV és rövid szöveges összefoglaló, a repón kívül): naponként a járatok és a fordulók száma (gyors, hosszú, egyoldalú), a tervező számolása a mostani tervezési beállításokkal (pozíciószám, összes munkaóra, betölthetőség nélkül), a létszámigény napi csúcsa és ideje; az egész időszakra a hétköznapi és a hétvégi átlag.
- A tervező és a létszámigény felülete a valós napokon is működik, napváltóval, a meglévő számításokkal.
- **Összevetés:** ha a terv jelentősen eltér a valóságtól (átlagos hétköznapon kb. 20–40 ügynök), a projekt gazdájával a sablon foglaltsági paramétereit (`travelMinutes`, `departureReportMinutes`, `postDepartureMinutes`, `minTurnaroundMinutes`, `minBreakMinutes`) és a tervezési beállításokat hangoljuk. Ez beállítás, nem kódváltozás; a riport újrafuttatható.
- **Eredmény** a valódi mentésen (27 nap, ebből 22 teljes), a demo sablonnal és a helyőrző tervezési beállításokkal: hétköznap átlagosan 167 járat, 29 pozíció, 241 munkaóra, a létszámigény csúcsa 17; hétvégén 149 járat, 27 pozíció, 219 munkaóra, csúcs 16. A pozíciószám a valós 20–40-es sávon belül van. Az összevetés a valós sablonokkal (GOU, HDS) megismétlendő, mert most minden légitársaság a demo sablont kapta.
