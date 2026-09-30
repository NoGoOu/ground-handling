# Ground Handling App – projekt-összefoglaló

*Verzió: 27 · 2026. szeptember 30.*

## A projekt

Nyílt forráskódú webalkalmazás repülőtéri földi kiszolgálás szervezésére. Céljai: a járatfordulók követése taskokon keresztül, a mérföldkövek tervezett és tényleges idejének rögzítése, légitársaságonként testreszabható sablonok, a létszámszükséglet kiszámítása és szerepkör alapú hozzáférés.

A projekt gazdája a földi kiszolgálásban dolgozik, a domain-szabályok az ő gyakorlati tapasztalatából jönnek.

## Munkamód

- **Claude Project:** tervezés, ötletelés, döntések.
- **Claude Code:** a tényleges építés a GitHub repóban.
- **A kör:** a tervezés itt történik, és a végén egy rövid feladatlappal zárul, amit a Claude Code-nak adsz be. A Claude Code minden lépés után frissíti a repó gyökerében lévő `STATUS.md`-t (mi készült el, tesztek, eltérések, kérdések, következő lépés), és a tervezés ezt a GitHubról olvassa be (a projekt utasításai szerint), így nem kell feltölteni.
- **CLAUDE.md:** a részletes technikai specifikáció (adatmodell, időszámítási szabályok, MVP feladatlista). Ez az egyetlen hiteles forrás, a repóban lévő példány az érvényes. Ha a tervezés során döntés születik, a CLAUDE.md a repóban frissül: a Claude commitolja, amint a GitHub-fiók össze van kötve vele, addig kézzel kerül be. A projekt-összefoglaló és a `docs/` leírásai is a repóban vannak.
- **Verziószám:** a CLAUDE.md és a projekt-összefoglaló tetején verziószám van, amely a fájl minden módosításánál eggyel nő. Ha a tudásbázisban ugyanabból a fájlból több példány van, mindig a legmagasabb verziószámú az érvényes.
- **AGENTS.md:** a repóban a Next.js-re vonatkozó szabályok gyűjtőhelye, a `next dev` tartja karban; a CLAUDE.md hivatkozik rá.
- Egyelőre nincs AI API az alkalmazásban, hogy a projekt egyszerű maradjon.

## Eddigi döntések

1. **Stack:** Next.js + TypeScript, PostgreSQL + Prisma, Auth.js, Tailwind CSS, Docker Compose. A Django alternatíva volt, de a Next.js szabadabb felülettervezést enged.
2. **Szerepkörök:** admin, műszakvezető, ügynök. Később bővíthető, például csak olvasási joggal rendelkező szerepkörrel.
3. **Egy járatforduló = egy task.** A műszakvezető és az ügynök is egyetlen taskot lát. (Az 5. mérföldkőtől felülírva: feladattípusonként egy task, lásd 63.)
4. **Mérföldkövek:** a taskon belül minden lépés egy időpont. Van tervezett ideje (mankó, amit a rendszer számol) és tényleges ideje (az ügynök rögzíti egy gombnyomással). Az eltérés színnel jelölve.
5. **Légitársaság-sablon:** a mérföldkövek légitársaságonként állíthatók be (sorrend, horgony, offset, kötelező-e), mert a légitársaságok mást és mást követelnek meg.
6. **Első sablon (fapados):** ATA, front door open, back door open, first pax out, last pax out, first pax in, last pax in, cabin door close, all door close, off-block (ATD). Az off-blockot is az ügynök rögzíti. A percértékek egyelőre helyőrzők.
7. **Gyors forduló:** on-blocktól off-blockig 25 perc, egy ügynök végzi. Az eredeti lebontás: kiutazás 5, kiszállítás 10, beszállítás 10, összepakolás 5, pushback 5, visszautazás 5, papírmunka 5 perc. Az ügynök összesen 45 percig foglalt.
8. **Hosszú forduló:** az ügynöknek STD −40-kor kint kell lennie, és a gyakorlatban a beszállítás jóval korábban elkezdődik. Az érkezési és az indulási részt végezheti ugyanaz vagy két külön ügynök, erről a műszakvezető dönt.
9. **Tervezett off-block:** az STD és az (ATA + 25 perc) közül a későbbi. Ha a gép késve érkezik, a rendszer magától gyors forduló szerint számol.
10. **ATA előtt:** amíg az ATA nincs rögzítve, a rendszer az ETA-ból, ennek hiányában az STA-ból tervez.
11. **Hozzárendelés:** a tasknak érkezési és indulási ügynöke van, ez lehet ugyanaz a személy is. Gyors fordulónál a rendszer ugyanazt az embert javasolja mindkét részre.
12. **Létszámigény:** az ügynökök átfedő foglaltsági ablakainak száma, 15 perces sávokra bontva.
13. **Rossz sorrendű rögzítés:** a rendszer figyelmeztet, de nem tiltja le a mentést.
14. **Gyors vagy hosszú forduló:** a két foglaltsági ablak közötti szabad idő dönti el. Hosszú forduló csak akkor van, ha ez a szünet legalább `minBreakMinutes` (sablononként állítható, egyelőre 15 perc). Ha kevesebb, a forduló gyors, összekapcsolt taskként számít. Így a két ablak soha nem fedi át egymást.
15. **ATA és ATD:** elsődlegesen külső rendszerből érkezik (a részleteket az adatkezelésnél beszéljük meg). Ha nincs rendszerérték, kézzel megadható. Az ügynök mindig rögzítheti a saját értékét, és mellette a rendszerből kapott érték is látszik. A számításokban (horgony, késés, eltérés) a rendszerből kapott érték számít, ha van. Ehhez az ATA és az ATD minden sablonban fix kódú, nem törölhető mérföldkő.
16. **Adatok pontossága:** a menetrendi STA/STD-t felülírja a várható ETA/ETD, azokat pedig a tényleges ATA/ATD. Az indulási horgony az ETD-ből számol, ha van.
17. **Task státusz:** a task a járattal együtt jön létre (PLANNED), az első rögzítéskor IN_PROGRESS lesz. A státuszt a taskhoz rendelt ügynök váltja, a műszakvezető és az admin is módosíthatja. A hiányzó kötelező mérföldkövet a rendszer jelöli, de semmit nem tilt le. Rögzítést törölni nem lehet, csak javítani.
18. **Ügynökök hatásköre:** hosszú fordulónál az érkezési ügynök csak az érkezési, az indulási ügynök csak az indulási rész mérföldköveit rögzítheti; gyors fordulónál mindkét rész az érkezési ügynöké. Minden rögzítésnél látszik, ki rögzítette és ki módosította.
19. **Lezárt task pillanatképe:** lezáráskor elmentjük a sablon akkori paramétereit és mérföldkő-definícióit, a lezárt task ezután ebből számol. Visszanyitáskor a pillanatkép törlődik.
20. **Szerkesztési korlátok:** rögzítéssel rendelkező mérföldkő nem törölhető; az ATA és az ATD horgonya, offsetje, része és kötelező volta zárolt; az ATA az első, az ATD az utolsó mérföldkő; az STD későbbi az STA-nál; a járat sablonja nem módosítható, ha a taskon már van rögzítés.
21. **Napi lista és percpontosság:** naptári nap (Europe/Budapest), a járat az STA vagy az STD napján jelenik meg, STA szerint rendezve. Minden időt percre pontosan rögzítünk, a másodperceket levágjuk.
22. **Következő mérföldkövek** (a sorrend később módosult, lásd 54.)**:** a 2. a sávos idősoros nézet (ügynökönként egy sáv, drag and drop kiosztás, ütközésjelzés), a 3. az üzenetek fogadása és feldolgozása járat-infografikával. A létszámigény külön nézet marad, a sávos nézeten nem jelenik meg, mert a tervezés más logika szerint működik.
23. **Műszak megadása:** szabad kezdés és vég, előre definiált műszaktípusok nélkül. A műszak átnyúlhat éjfélen, és ugyanannak az embernek nem lehet két átfedő műszakja. A beosztást a tervező készíti, a valósat a tervező és a műszakvezető módosítja (lásd 30–33.).
24. **Ütközés a kiosztásnál:** a rendszer figyelmeztet, de engedi a mentést, ahogy a rossz sorrendű rögzítésnél is. Ütközés az átfedő foglaltsági ablak ugyanazon az ügynökön, és az is, ha a task kilóg a műszakjából.
25. **Az ügynök nézete:** csak a hozzá rendelt taskokat látja, a műszakbeosztástól függetlenül. Ezzel a korábbi nyitott kérdés lezárult.
26. **Eltérés-küszöbök:** globális beállítás, az admin felületen szerkeszthető; alapérték 0 és 5 perc.
27. **Jelszó:** marad az admin által állított jelszó, önkiszolgáló csere nincs.
28. **Hosszú fordulóból gyors:** ha a késés miatt a forduló gyorssá válik, az indulási rész automatikusan az érkezési ügynökhöz kerül. Ezzel a korábbi nyitott kérdés lezárult.
29. **Elfogadott eltérések az MVP megvalósításából:** `proxy.ts` a middleware helyett (Next.js 16), napi bontású ügynök nézet dátumválasztóval, adatintegritási kiegészítések és formátum-ellenőrzések a kódban, a „Most” gomb rögzítés után „Javítás”-ra vált.
30. **Beosztás rétegei:** tervezet → publikált → valós. A publikált beosztás fix, minden változás a valós rétegbe kerül, így a kettő bármikor összevethető. A sávos nézet és a kiosztás a valós rétegből dolgozik.
31. **Tervező szerepkör:** új szerepkör, a beosztást készíti és szabadon választott időszakra publikálja, a műszakrész-típusok listáját is ő bővíti.
32. **Műszakrészek:** egy műszak több részre bontható (pl. Műszak, TRN). A típusnál jelölve van, hogy operatív-e; járatos taskot csak operatív részre lehet kiosztani, máshová ütközésként figyelmeztet.
33. **Nem operatív rész blokkja:** pipával kérhető, hogy a rész (pl. oktatás) blokként megjelenjen a napi kiosztásban, oda- és visszautazási idővel, hogy az ügynök ne kerüljön olyan járatra, amelyről nem érne oda. A blokk a részből származik, vele együtt mozog.
34. **Tervezői nézet:** külön, későbbi mérföldkő. Névtelen pozíciókkal és képesítésekkel dolgozik, a program automatikusan kioszt beállítható paraméterek (pihenőidő, megengedett átfedés, műszakhossz, szünet) szerint, a kimenet pedig a beosztás tervezete lesz, miután a tervező neveket rendel a pozíciókhoz. A cél sorrendje: egyenletes terhelés, kevesebb ember, kevesebb munkaóra, kevesebb üresjárat. A 2. mérföldkő ettől nem változik.
35. **Képzések és jogosítások:** külön, későbbi mérföldkő. Képzés rögzítése a hozzá tartozó jogosítással, dolgozateredménnyel és feltöltött fájlokkal. Az ügynök jogosításai a képzési rekordokból adódnak, lejárattal; ebből dolgozik a tervezői nézet is. Új szerepkör: oktatási koordinátor, ő rögzít és szerkeszt.
36. **Több szerepkör:** egy felhasználónak több szerepköre is lehet, a jogosultságai ezek uniója. Ez a 2. mérföldkő első lépése, hogy az új szerepkörök már erre épüljenek.
37. **Csapatok:** minden ügynöknek van csapata és vezetője; a vezető a csapata tagjainak képzési adatait látja, az ügynök a sajátját. A csapatok már a 2. mérföldkőben létrejönnek, mert a taskok hatóköre is csapatra szűrhető.
38. **Lejárt vagy hiányzó jogosítás:** a kiosztásnál figyelmeztet, de nem tiltja.
39. **Jogosultsági rendszer:** a hozzáférést szerepkörök adják, amelyekhez az admin egy táblázatban pipálja a jogosultságokat, és új szerepkört is létrehozhat. Felhasználónként egyéni kiegészítés is adható. A kód jogosultságot ellenőriz, nem szerepkörnevet, és ez a 2. mérföldkő első két lépése.
40. **Hatókör:** a jogosultságokhoz hatókör tartozik (saját, csapat vagy összes), így például beállítható, hogy egy műszakvezető a csapata vagy az összes taskot lássa. Az alapértelmezés a mostani viselkedés marad.
41. **Tényleges jogosultság kijelzése:** a felhasználó admin oldalán látszik, mit tehet és milyen hatókörrel, és mindegyik jogosultságnál az is, honnan jön (melyik szerepkörből vagy egyéni kiegészítésből).
42. **Üzenetkódok:** B poggyász, C cargo, M posta, E equipment, X üres ULD; ELD üres ULD-halom, FKT flight kit. ULD-halomnál a CPM-ben csak a hordozó raklap szerepel ELD kóddal, az UCM-ben a hordozó E, a rajta lévők X. A részletes formátumleírás és a minták: `docs/messages.md`.
43. **Az MVT a mozgási idők forrása:** az off-block az ATD, az on-block az ATA, a BUD-ra érkező járat ETA-ja pedig az indulási állomás MVT-jéből jön. A korrekció egy javított MVT.
44. **Az üzeneteket a handling küldi:** az alkalmazásnak elő kell tudnia állítani őket, elsőként az MVT-t az ügynök rögzítéseiből.
45. **Ellenőrzött, hibatűrő feldolgozás:** a fejléc dátuma a menetrendi nap. A feldolgozó ellenőrzi az összegeket és az üzenetek egyezését egymással, eltérésnél figyelmeztet. Két valós hiba a mintákban (UCM–CPM elírás, hiányzó 93-as késéskód) tesztesetként szerepel.
46. **Napi lista a hatályos idők szerint:** a járat azon a napon jelenik meg, amikor ténylegesen érkezik vagy indul, nem a menetrendi napján, különben a napokat késő járat felborítaná a napi tervezést. Ez az MVP egy már megépített szabályát módosítja.
47. **Járatrend-import oszlop-párosítással:** a tervezésben fájl tölthető fel (CSV, JSON, XLSX, XLS); a rendszer mutatja az oszlopokat, ezeket a mi mezőinkkel párosítjuk, és a párosítás profilként elmenthető. Így a különböző forrásokat egységesen kezeljük. Külön mérföldkő, a tervezői nézet előtt; leírás: `docs/schedule-import.md`.
48. **A menetrendi adat addig érvényes, amíg üzenet mást nem mond:** az import csak a menetrendi mezőket írja, az ETA, ETD, ATA és ATD az üzenetekből jön, és az import sosem írja felül őket.
49. **Import: a járatszám a mérvadó.** A légitársaságot és így a sablont a járatszám légitársasági kódja adja (pl. FR); az üzemeltető (pl. RR, AL) nem számít.
50. **Csak érkező és csak induló járat:** ha nem látjuk a gép következő indulását, a gép itt marad; az érkezés csak érkező járat, a későbbi indulás csak induló. A modell mindkettőt támogatja egy-egy foglaltsági ablakkal. A 2. mérföldkőben a sávos nézet előtt épül be (9. lépés), hogy a sávos nézet és a kézi járatfelvétel is kezelje őket.
51. **Törölt (cancelled) járat:** a járatot nem töröljük, hanem töröltre állítjuk, az érkezést és az indulást külön is. A törölt rész áthúzva látszik, és nem számít a foglaltságba és a kiosztásba; ha csak az egyik rész törölt, a járat csak érkezőként vagy csak indulóként viselkedik. Visszaállítható, és minden törlés és visszaállítás naplózott.
52. **Késés kézi rögzítése:** külön művelet a járaton, forrás-megjegyzéssel (pl. email). A járat azonosítója (légitársaság + járatszám + menetrendi nap) nem változik, így mindenki látja, hogy késett járatról van szó, nem újról, és a később érkező üzenetek is hozzá párosulnak. Mindenhol „Késik” jelölés látszik, az eredeti menetrendi nappal.
53. **Hatályos ETA/ETD:** a legutóbbi érték számít, akár kézzel, akár üzenetből jött; mellette látszik a forrás, és hogy ki és mikor rögzítette.
54. **Mérföldkövek sorrendje:** 3. járatrend-import, 4. tervezői nézet, 5. képzések és jogosítások, 6. üzenetek. A tervezői nézet ezért először jogosítások nélkül, csak az időablakok és a tervezési paraméterek alapján dolgozik; a jogosítás-feltételek az 5. mérföldkővel kerülnek bele.
55. **Horgony és rész független marad:** ha egy mérföldkő horgonya hiányzik (egy oldalas vagy részben törölt járat), a meglévő horgonytól számol.
56. **„Késik” küszöb:** a címke akkor jelenik meg, ha a késés meghaladja a sárga eltérés-küszöböt (globális beállítás, alapértelmezés 5 perc).
57. **Elfogadott eltérések a 2. mérföldkőből:** heti beosztás-ablak; a tervezetből és a valósból a rész és a műszak eltávolítható; blokk csak nem operatív részből; a járat része nem hagyható el, ha van hozzá rögzítés; törölt részre nem rögzíthető semmi; az ETA/ETD csak a „Késés rögzítése” művelettel módosítható, járatnaplóval.
58. **Elfogadott eltérések a 3. mérföldkőből:** az állóhely nem kötelező; a menetrendi dátum a járat üzemnapja (az indulás napja az indulóállomáson), ahogy az üzenetek fejlécében is.
59. **Összevonás újraimportáláskor:** két egyoldalú járat fordulóvá vonható össze, ha a kikerülő járat az importból jött, és nincs rajta üzemi adat; különben kézi döntés. A Ryanair a NetLine-profillal együtt a seedbe kerül.
60. **Tervezői nézet (4. mérföldkő):** szabadon választott időszak, naponként számolva. Névtelen pozíciók a sávos nézeten; a cél sorrendje: minimális létszám, kiegyenlítés a megengedett létszámon belül, majd kevesebb munkaóra és üresjárat. Determinisztikus, kézzel módosítható, jogosítások nélkül.
61. **A terv kimenete:** a nevek hozzárendelése után a pozíciókból a tervezet rétegbe műszakok lesznek. A taskok kiosztása külön gombbal vehető át a tervből, csak a még kiosztatlan részekre.
62. **Tervezési beállítások:** globálisak, helyőrző értékekkel (műszakhossz, szünet, pihenőidő vagy átfedés, létszámtöbblet), és számoláskor a terv lemásolja őket.
63. **Feladattípusok:** egy járaton feladattípusonként egy task van (pl. GOU, HDS). Ezeket különböző emberek végzik, külön időablakkal, és mindegyiknek saját sablonja van. Ez felülírja a 3. döntést. A meglévő működés egy „Alap” feladattípus alatt változatlanul megmarad. Külön mérföldkő (5.).
64. **Jogosítás-követelmények:** légitársaságonként és feladattípusonként, részenként külön adhatók meg; az érkezéshez és az induláshoz két külön jogosítás tartozik. Egy jogosítás (funkció, pl. Altéa) több légitársaság feladatához is kellhet (pl. A3 és PC).
65. **Tervező és jogosítások:** a tervező figyelembe veszi, hány érvényes jogosítású ember van, és ellenőrzi, hogy a pozíciók betölthetők-e különböző emberekkel. Hiánynál a terv elkészül, de jelez.
66. **Kiosztás átvétele a teljes tervre is**, a megnyitott nap mellett.
67. **Mérföldkövek új sorrendje:** 5. feladattípusok, 6. képzések és jogosítások, 7. üzenetek.
68. **Elfogadott eltérések a 4. mérföldkőből:** az újraszámolás a neveket is törli; elavult tervvel is lehet menteni és átvenni, figyelmeztetéssel; a tervet a kiosztási jogosultsággal is lehet olvasni; a pozíció foglaltsága az ablakai uniója; a terv legfeljebb 31 nap; a szünet a műszak közepéhez legközelebbi elég hosszú rés.
69. **Elfogadott eltérések az 5. mérföldkőből:** a sablon a taskon van, a járat űrlapján légitársaság választható; a járat légitársasága csak rögzítés nélkül módosítható; a járatszintű megjelenítés az elsődleges task szerint; a közös rész nélküli task „nincs teendő”; feladattípus nem törölhető.
70. **Képzések és jogosítások (6. mérföldkő):** jogosítás (érvényességi idővel vagy lejárat nélkül), képzés (dolgozattal, sikerességi határral), képzési rekord fájlokkal. Az ügynök jogosításai a legutolsó sikeres rekordból adódnak; egy későbbi sikertelen próbálkozás nem veszi el. Oktatási koordinátor szerepkör; az ügynök a sajátját, a csapatvezető a csapatáét látja.
71. **Követelmények és figyelmeztetések:** a légitársaság feladattípusainál részenként; ha a kiosztott ügynök nem felel meg, figyelmeztetés mindenhol, tiltás nélkül. A tervező párosítással ellenőrzi a betölthetőséget, és hiánynál jelez.
72. **Elfogadott pontosítások a 6. mérföldkőből** (CLAUDE.md 33–40.): inaktív jogosítás nem számít; a lejáró lista két csoport; gyors fordulón a követelmény a két rész uniója; a követelmény nem fagy be a taskon; a rekord az ügynök kivételével javítható; a fájl eltávolítása a tárhelyről töröl, a napló marad; a „hamarosan lejár” napjai globális beállítás. Pontosítás: a tervező hiányjelzése mindig a terv napjára vizsgálja az érvényességet.
73. **Fogadó API mint egyetlen belépési pont:** minden üzenet egy API-kulccsal védett végponton érkezik; a kézi bemásolás ugyanazt a feldolgozást használja, a későbbi email- és SITA-átjáró is erre csatlakozik.
74. **Nem támogatott üzenettípus** (pl. PTM, PSM): a tartalmát nem tároljuk, csak a típusát, a fejlécét és az idejét. A 7. mérföldkőben így nincs személyes adat. (A 8. mérföldkőtől a PSM és a PTM csak darabszámokkal feldolgozva, lásd 80.)
75. **MVT-küldés emailben vagy SITA-n,** légitársaságonkénti és üzenettípusonkénti címjegyzék alapján, előnézettel és egy gombbal. Biztonsági alapállás: beállított csatorna nélkül a küldés csak naplóz. A SITA-átjáró fajtája nyitott, ezért cserélhető csatorna.
76. **Késéskód az MVT-vel együtt** (7. mérföldkő): az admin kezeli a kódtáblát; a késésrekord kézzel vagy az MVT-ből jön, és ellenőrizzük a késéssel.
77. **Projektfájlok a repóban:** a CLAUDE.md, a projekt-összefoglaló (`docs/projekt-osszefoglalo.md`) és a `docs/` leírásai a repóban élnek; a Claude commitolja őket, amint a GitHub-fiók össze van kötve.
78. **Elfogadott pontosítások a 7. mérföldkőből** (CLAUDE.md 41–54.), köztük: az Üzenetek fül a task nézetben; késéskódot és MVT-t a járatkezelő és a rész ügynöke küld; a kézi késésrekord naplózva törölhető; a CPM `.TW` sora egyelőre összsúly.
79. **Érkezési és korrekciós MVT:** az `AA` sor földet érés / on-block; a korrekciót a típussor előtti `COR` sor jelzi. Mindkettő előállítása a 8. mérföldkőben.
80. **PSM és PTM csak darabszámokkal:** a PSM-ből célállomásonként, kódonként és osztályonként, a PTM-ből továbbjáratonként és osztályonként az utasszám és a poggyász. Név, ülés és nyers szöveg nem tárolódik.
81. **Slotüzenetek (SAM, SRM):** SITA-n jönnek, a fogadó API-n keresztül dolgozzuk fel. A járaton látszik a slot és a cél off-block; figyelmeztetés, ha a tervezett off-block nem fér bele. Az ETD-t nem írja át, de a késésnél és az MVT-nél felajánlja az időt és a késéskódot.
82. **Lufthansa-üzenetek értelmezése:** a kategória utáni számjegy és a `VR` a szabad negyedek száma; `D` a személyzet poggyásza; `Q` sürgős cargo; a DAA a gép ajtajához kiadott tétel (babakocsi, tolószék); a keretezett SI üzemi utasítás, amit kiemelve kell mutatni.
83. **Az SI-t egyelőre nem dolgozzuk fel:** nagyon sokféle lehet, ezért csak az üzenet törzsét olvassuk; az SI szabad szövegként, változatlanul, jól látható helyen jelenik meg (így a keretezett üzemi utasítás és a DAA is látszik).
84. **Elfogadott pontosítások a 8. mérföldkőből** (CLAUDE.md 55–64.): a 7. mérföldkő SI-feldolgozása megszűnt; a CPM-ben a `Q` és utána egy karakter kontúrkód, a magában álló `Q` sürgős cargo; a PSM és a PTM helyén a darabszámok szöveges alakja tárolódik; a slot párosításához a járat célállomása kell, különben kézi hozzárendelés; a slot-figyelmeztetés a napi listán és a task nézetben látszik; a korrekciós MVT a küldött MVT-ből indul; érkezési MVT csak hatályos ATA-val; repülőtér nem törölhető.
85. **Létszámigény (9. mérföldkő):** 15 perces sávokban a sávon belüli csúcs (a legtöbb egyszerre futó foglaltsági ablak), feladattípusonként és összesen, összevetve a valós beosztás operatív, blokkon kívüli ügynökeivel; napi nézet és legfeljebb 31 napos áttekintés.
86. **Késéskódok légitársaságonként:** a légitársaság saját késéskód-dokumentuma (PDF) feltölthető, és a járatról megnyitható; ha nincs, az alapértelmezett, közös kódtábla látszik, IATA-leírásokkal. A kódtábla közös marad.
87. **Kimutatások a valós adatok után:** a légitársaságonkénti kimutatások az Ikarus-mentésekből épülő adathalmazt várják meg.

## Még ellenőrizendő feltételezések

- A sablon percértékei (helyőrzők).
- Hosszú fordulónál a szünetben az ügynök bemegy, ezért a foglaltságba beleszámít a vissza- és kiutazás.
- Az eltérés színküszöbei (0 és 5 perc).
- A `minBreakMinutes` értéke (a 15 perc helyőrző).
- A valós beosztást a tervező és a műszakvezető is módosíthatja; a tervező járatokat és taskokat nem kezel.
- A beosztás táblázatában az éjfélen átnyúló műszak a kezdése napjánál jelenik meg.
- Tervezői nézet: az egyenletes terhelés a megengedett létszámon belül (minimum + beállítható többlet) értendő, és a pozíciók foglaltsági perceivel mérjük.
- Tervezői nézet: a képesítéseknek lejárati dátuma is lehet.
- Egy task a csapat hatókörébe esik, ha az érkezési vagy az indulási ügynöke a csapat tagja.
- Aki taskot oszthat ki, a kiosztatlan taskokat a hatókörétől függetlenül látja.
- Az egyéni jogosultság csak ad, elvenni nem lehet vele.
- Képzések: a rekord javítható, de nem törölhető; a csatolt fájl eltávolítható (naplózva); fájlok: PDF, JPG, PNG, legfeljebb 10 MB (helyőrző); „hamarosan lejár”: 30 nap (helyőrző); az érvényesség a task ablakának kezdőnapján számít.
- Feladattípusok: légitársaságonként egy elsődleges feladattípus adja a kézi ATA/ATD-t; a feladattípusok módosítása csak az új járatokat érinti; ugyanazon a járaton két feladattípus ugyanannak az embernek csak figyelmeztetés.
- Összevonás újraimportáláskor: csak üzemi adat nélküli, importból létrejött járat kerülhet ki (a projekt gazdája nem döntött, a javaslat szerint).
- Tervezői nézet: a tervezési beállítások értékei helyőrzők; a szünetszabályt a Munka törvénykönyve szerint ellenőrizni kell.
- Tervezői nézet: a minimálisnál rövidebb műszak vége tolódik ki; a szünet a tervben jelölve marad, nem külön műszakrész; mentés csak nem publikált napokra.
- Járatrend-import: egy korábban importált, az új fájlból hiányzó járat nem törlődik, csak ellenőrzésre jelölve marad.
- A NetLine-export `OnwdEventGt` oszlopa az időszak összes földi idejének összege (a mintafájlból visszafejtve).
- Üzenetek: az ügynök a saját részére küldhet MVT-t; a kézi bemásolás a műszakvezetőé és az adminé (jogosultságként átállítható).
- Üzenetek: a fogadó API méretkorlátja 256 KB kérésenként (helyőrző); a DL sorban legfeljebb két kód (a minta alapján).
- Üzenetek: a járatrészhez lajstrom, az érkezési részhez indulóállomás, az indulásihoz célállomás kerül; az import a meglévő oszlopokból tölti.
- Slot: a cél off-block = CTOT − gurulási idő; a slot-tűrés 10 perc és a párosítási ablak ±2 óra helyőrző; a slot az ETD-t nem írja át.
- Lufthansa-minta: a Q (sürgős) tétel az LDM nettó bontásában az O (other) alatt szerepel; az LDM összsúlya a konténerek önsúlyával együtt értendő.
- Létszámigény: az igény a kiosztástól független; a beosztás sávértéke a sávon belüli legkisebb létszám; a beosztás nincs feladattípusra bontva.
- Késéskód-dokumentum: csak PDF, legfeljebb 10 MB (helyőrző); légitársaságonként egy, az új feltöltés cseréli a régit.

## Nyitott kérdések

- Törölhető legyen-e a légitársaság és a sablon? Egyelőre nem törölhetők. (A járat törlés helyett töröltre állítható, lásd 51.)
- Melyik SITA-átjárón keresztül menjenek ki a Type B üzenetek (jelenleg milyen programmal vagy átjárón küldtök)?
- Késési (`ED`) MVT minta, ha van; az LDM `PAD`, `CRW`, `DHC`, `TB`, a CPM `4/1` és `.TW`, valamint a Lufthansa XOM és XCS kód jelentése.
- Slottörlés és más slotüzenet mintája.
- Mit csinál pontosan egy GOU- és egy HDS-ügynök a járaton, mikortól meddig? Illeszkednek-e rájuk a mostani foglaltsági képletek, vagy más paraméter kell?
- Összekapcsolható-e utólag egy csak érkező és egy későbbi csak induló járat fordulóvá (pl. a lajstrom alapján)?
- Meddig őrizzük meg a képzési adatokat és a feltöltött fájlokat?

## Későbbi témák

- Személyre szabható elrendezés (az infografika fix változata után)
- Az SI elemeinek feldolgozása (DAA, nettó bontás, poggyászdarabszámok), ha a minták alapján egységesíthető
- Valós tesztadat: az Ikarus AODB-oldal mentése elindult (félóránként, 30 napig, a projekt gazdájának gépén, a repón kívül; a nyilvános repóba nem kerülhet). Utána importer a pillanatképekből (összefésülés rekordazonosító szerint, a nap a menetrendi időből, éjfélre figyelve).
- Email- és SITA-átjáró a bejövő üzenetekhez (a fogadó API-ra csatlakozik)
- A BUD-on lévő ULD-készlet követése az UCM-ekből
- Ügynöki beosztásnézet (az ügynök a saját publikált és valós beosztását látja)
- A beosztás TRN részének összekötése egy konkrét képzéssel
- A lezárt taskok utólagos javításának jogosultsága
- Járatinfó: egyedi mezők taskonként (utaslétszám, különleges igények)
- Szolgáltatások rögzítése időpontokkal
- Kimutatások légitársaságonként (a valós adatok után)
- Licenc kiválasztása
- Többnyelvűség

## Következő lépés

1. Az 1–8. mérföldkő kész (MVP; jogosultság, beosztás, sávos nézet; járatrend-import; tervezői nézet; feladattípusok; képzések és jogosítások; üzenetek; üzenetek bővítése, 610 zöld teszttel).
2. Most: a késéskód-dokumentumok utómunkája, majd a 9. mérföldkő, létszámigény (CLAUDE.md 31. verzió).
3. A projekt gazdájánál: a nyitott üzenet- és késéskódok; a SITA-átjáró; a valós GOU- és HDS-sablonok; a csatolt fájlok megőrzési ideje; az Ikarus-mentés ellenőrzése.
