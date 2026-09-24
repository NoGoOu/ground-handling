# Járatrend-import – Ground Handling App

*Verzió: 5 · 2026. szeptember 24.*

Referencia a 3. mérföldkőhöz (járatrend-import), a CLAUDE.md „3. mérföldkő” szakasza hivatkozik rá.

## Cél

Az előzetes (napokkal, hetekkel korábbi) tervezéshez a menetrendi járatokat fájlból töltjük be. A fájlok formátuma forrásonként eltér, ezért az import oszlop-párosítással dolgozik, és a párosítás profilként elmenthető. Így a különböző forrásokat egységesen kezeljük.

## Folyamat

1. **Feltöltés:** CSV, JSON, XLSX vagy XLS. Több munkalapos fájlnál munkalap-választás, és a fejlécsor megadása.
2. **Előnézet:** a rendszer mutatja az oszlopokat és az első sorokat.
3. **Párosítás:** a célmezőkhöz (lásd lent) forrásoszlop rendelhető, átalakítással.
4. **Szűrés:** csak a BUD-ot érintő sorok maradnak, mert a fájl akár a teljes hálózatot tartalmazhatja.
5. **Próbafuttatás:** összesítés a mentés előtt: új, változott, változatlan és hibás sorok, valamint a párosítatlan járatok.
6. **Mentés.** A párosítás profilként elmenthető, és azonos fejlécű fájlnál a rendszer legközelebb automatikusan felajánlja.

## Célmezők

- légitársaság, járatszám, indulási és érkezési állomás
- menetrendi indulás és érkezés: dátum és idő, vagy időszak + napminta + idő
- időzóna: UTC vagy helyi idő (a párosításnál választható)
- napeltolás (pl. „+1”: az érkezés másnap van)
- repülőgéptípus és konfiguráció (opcionális)
- következő járat (a forduló képzéséhez, ha a fájl tartalmazza)
- lajstrom (opcionális)

## Átalakítások

A mintafájl alapján ezekre biztosan szükség van:

- szóközök levágása és a járatszám egységesítése (`' 428'`, `'055'`)
- dátum és idő összevonása külön oszlopokból
- időszak kibontása: From és Till között a napminta szerinti napokra (`.2.....` = kedd, `123.5..` = hétfő, kedd, szerda, péntek)
- napeltolás alkalmazása
- helyi időből UTC

## Fordulók képzése

- Ha a fájlban van következő-járat oszlop, az érkező járat és a következő járat egy forduló, dátumonként párosítva.
- Az érkezést a következő járat első olyan példányával párosítjuk, amely az érkezés után indul BUD-ról.
- Ha nincs következő járat (nincs ilyen oszlop, vagy az adott sorban üres), a gép itt marad: az érkezésből csak érkező járat lesz. Az a BUD-i indulás, amely egyetlen érkezés következő járataként sem szerepel, csak induló járat lesz (lásd a CLAUDE.md 11. időszámítási szabályát).
- Az éjszakázó gép is párosítható, ha a fájl megadja a következő járatát: a mintában például az FR9941 pénteki 20:55-ös érkezése a másnapi indulással alkot fordulót, kb. 18 óra földi idővel. Ez hosszú forduló, és a napi listán mindkét napon megjelenik.
- A párosítatlan érkezés vagy indulás az előnézetben jelölve van.
- A földi időt mi számoljuk a párosított STA-ból és STD-ből, nem a fájlból vesszük.

## Érvényesség és felülírás

- Az import csak a menetrendi mezőket írja (STA, STD, típus stb.). Az ETA, ETD, ATA és ATD az üzenetekből jön, és az import soha nem írja felül őket.
- A menetrendi adat tehát addig érvényes, amíg üzenet (pl. MVT) mást nem mond. Ez a CLAUDE.md pontossági sorrendjéből következik (STA/STD → ETA/ETD → ATA/ATD).
- Azonosítás újraimportálásnál: légitársaság + járatszám + menetrendi dátum + állomás. A meglévő járat frissül, nem duplikálódik.
- Ha egy korábban importált járat hiányzik az új fájlból, nem törlődik, hanem ellenőrzésre jelölve marad.
- Ha újraimportáláskor két korábbi egyoldalú járatból forduló lesz, a kettő összevonható, de csak akkor, ha a kikerülő járat az importból jött létre, és nincs rajta üzemi adat (rögzítés, kiosztás, késés, törlés). Különben „párosítás változott” jelzés, kézi döntés.
- A menetrendi dátum a járat üzemnapja: az indulás napja az indulóállomáson.
- A légitársaságot a járatszám légitársasági kódja adja (a mintafájlban az `Al` oszlop); az üzemeltető (`Own`) nem számít. A létrehozott járat sablonja ennek a légitársaságnak az alapértelmezett sablonja.

## Mintafájl: Ryanair NetLine-export (2024. szeptember 6.)

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
- A mintafájl valós, teljes hálózati adat. A repóba tesztadatnak csak egy kis, BUD-ra szűkített, szükség esetén anonimizált kivonat kerüljön.

## Tesztadat: `ryanair-netline-bud-sample.xlsx`

A mintafájl 14 soros kivonata, mindkét munkalappal (`Template_Auto_Export(netline)` és `Legend`), az eredeti formátumokkal. Minden sor egy esetet fed le. Az idők UTC-ben vannak.

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
