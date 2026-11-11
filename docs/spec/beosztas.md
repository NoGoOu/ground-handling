# Beosztás, sávos nézet és kiosztás

A műszakbeosztás három rétege, a műszakok és részeik, a sávos idősoros nézet a kiosztással és az ütközésekkel, valamint az ügynök saját beosztásnézete és naptára.

## Beosztás rétegei

- **Tervezet:** a tervező szerkeszti, csak a tervező és az admin látja.
- **Publikált:** a tervező egy szabadon választott időszakot (kezdő és záró nap, Europe/Budapest) publikál; az időszak tervezetei ekkor publikálttá válnak. A publikált beosztás ezután nem módosítható. Egy nap csak egyszer publikálható.
- **Valós:** publikáláskor a publikált beosztás másolataként jön létre. Minden későbbi változás (csere, új műszak, átalakított részek) ide kerül; a tervező és a műszakvezető módosíthatja.
- A sávos nézet és a kiosztás mindig a valós rétegből dolgozik.

## Műszak és műszakrészek

- Egy műszak egy ügynöké, és egy vagy több részből áll. Minden résznek kezdete, vége és típusa van, opcionálisan helyszíne és leírása. Egy műszak részei nem fedhetik át egymást.
- A műszak átnyúlhat éjfélen; a táblázatban a kezdése napjánál jelenik meg. Ugyanannak az embernek egy rétegen belül nem lehet két átfedő műszakja.
- A résztípusok listáját a tervező bővíti (pl. Műszak, TRN). Minden típusnál jelölve van, hogy operatív-e: járatos taskot csak operatív részre lehet kiosztani.
- A használatban lévő résztípus nem törölhető, csak inaktiválható.
- A résznél megadható, hogy blokként jelenjen meg, és hozzá oda- és visszautazási idő (alapérték 0, nem lehet negatív).

## Nem operatív részek blokkja

- Egy részen a tervező bepipálhatja, hogy a napi kiosztásban blokként jelenjen meg (pl. oktatás).
- A részhez oda- és visszautazási idő adható meg. A blokk: a rész kezdete − odautazás → a rész vége + visszautazás. Így az ügynök nem kerülhet olyan járatra, amelyről nem érne oda.
- A blokk a részből származik, nem külön rögzített elem: ha a rész változik, a blokk vele mozog. Nincsenek mérföldkövei és státusza.
- A blokk az ügynök sávján és az ügynök nézetében is látszik, a típussal, a helyszínnel és a leírással.
- **Blokk:** csak nem operatív részből képezhető.

## Beosztás felülete

- Név × nap táblázat, cellánként a publikált és a valós műszakkal; ahol a kettő eltér, az kiemelve.
- A cellára kattintva a műszak részei rétegenként látszanak, és ott szerkeszthetők, a jogosultság szerint.
- A tervező a tervezetet ugyanitt készíti, és innen publikál időszakot.
- **Beosztás táblázat:** heti ablakban jelenik meg.
- **Beosztás szerkesztése:** a tervezet és a valós rétegben a rész és a műszak eltávolítható; a publikált réteg zárolt.

## Sávos idősoros nézet

Műszakvezetői, tervezői és admin nézet, asztali gépre. Telefonon ne törjön el, de nem arra optimalizált.

- Napválasztó, ugyanaz a naptári nap, mint a napi járatlistán.
- Egy sáv egy ügynök, akinek arra a napra van valós műszakja. Az operatív részek kiemeltek, a nem operatív részek a típusuk szerinti mintázattal jelennek meg, a műszakon kívüli idő halvány.
- A taskok a foglaltsági ablakaik szerinti dobozok (`docs/spec/jaratok.md`, Ügynök-foglaltság). Hosszú fordulónál két külön doboz, gyors fordulónál egy. A dobozon a járatszám és az állóhely látszik. A dobozok a hatályos időkből számolnak, így a valós helyzetnek megfelelően mozognak.
- A nem operatív részek blokkjai is megjelennek a sávon.
- Legfelül „Kiosztatlan” sáv a még ki nem osztott részekkel. Függőleges vonal jelzi a mostani időt.
- Ha egy ügynöknek van kiosztott taskja, de arra a napra nincs valós műszakja, akkor is kap sávot, megjelölve.
- Létszámigény ezen a nézeten nem jelenik meg (külön oldal: `docs/spec/letszamigeny.md`).
- A dobozon a feladattípus kódja is látszik. A gyakornok foglaltsága a saját sávján „OJT” jelöléssel jelenik meg (`docs/spec/kepzes.md`).

## Kiosztás és ütközés

- A doboz ráhúzása egy sávra hozzárendelés: az érkezési doboz az érkezési, az indulási doboz az indulási ügynököt állítja be. Gyors fordulónál egy doboz van, és mindkét rész az érkezési ügynöké (8. időszámítási szabály). A kiosztatlan sávra visszahúzva a hozzárendelés törlődik.
- Ütközéskor a rendszer figyelmeztet, de engedi a mentést, és az érintett dobozok jelölve maradnak. Ütközés (félig nyitott intervallumokkal):
  - két foglaltsági ablak átfed ugyanannál az ügynöknél;
  - egy foglaltsági ablak átfed egy nem operatív rész blokkjával;
  - egy foglaltsági ablak nem esik teljes egészében az ügynök operatív részeibe;
  - a kiosztott ügynöknek hiányzik vagy lejárt egy megkövetelt jogosítása (`docs/spec/kepzes.md`).
- Ha ugyanazon a járaton két feladattípust ugyanaz az ember kapna, a rendszer figyelmeztet, de engedi (`docs/spec/jaratok.md`).
- A gyakornok foglaltsága az ütközésvizsgálatba beleszámít.

## Az ügynök saját beosztása és a naptár

Az ügynök a telefonján látja a saját beosztását, a publikáltat és a valósat, és azonnal észreveszi, ha a valós eltér a publikálttól. A beosztását a naptárába is mentheti, vagy feliratkozhat rá, így a változások maguktól megjelennek.

- **Jogosultság:** a „beosztás megtekintése” jogosultság hatókörrel; az Ügynök szerepkör alapból megkapja, saját hatókörrel. Így a beosztás táblázatában is csak a saját sorát látja. A tervezetet nem látja.
- **„Beosztásom” nézet,** telefonra optimalizálva, az ügynök nézetéből elérhetően:
  - heti lista, lapozható, a beosztás táblázatának heti ablakához igazodva; naponként a műszak kezdete és vége;
  - a napra koppintva a műszak részei: típus, kezdet, vég, helyszín, leírás; a blokk az oda- és visszautazási idővel;
  - a valós réteg az elsődleges; ahol eltér a publikálttól, kiemelve, a publikált mellette, és hogy mikor módosult (pl. „Publikált: 06:00–14:00 → Valós: 08:00–16:00, módosult: 10. 02. 07:30”). Az eltérés ugyanazzal az összevetéssel számol, mint a beosztás táblázatában. A módosulás ideje a valós műszak vagy bármely részének legutóbbi változása; ehhez a műszak módosítási ideje a részek változásakor is frissül;
  - a még nem publikált napon „Még nincs publikálva”; a nap, amelyen nincs műszakja, „Szabad”.
- **Napi összefoglaló:** az ügynök napi taskjai fölött a napi műszak (kezdet, vég, a blokkok), az eltérés jelölésével.
- Az éjfélen átnyúló műszak a kezdése napjánál jelenik meg.
- **Naptár:** szabványos iCalendar (.ics), így bármelyik naptárral működik (Outlook és Microsoft 365, Google, Apple, Thunderbird stb.). Külső szolgáltatás, regisztráció és céges IT-engedély nem kell hozzá: a saját szerverünk adja, és az alkalmazás üzemeltetője kezeli. Az Outlook-kompatibilitásra külön figyelünk, mert céges környezetben gyakori.
  - **Mentés a naptárba:** a „Beosztásom” nézetből .ics fájl tölthető le a megjelenített hétre vagy egy választott időszakra (legfeljebb 31 nap), amelyet a telefon vagy a gép naptára importál. Ez egyszeri másolat, a későbbi változásokat nem követi.
  - **Feliratkozás:** az ügynök személyes feliratkozási linket kér, és a naptárában URL-ből feliratkozik rá (Outlookban: „Naptár hozzáadása → Feliratkozás a webről”); a naptár ezután magától frissíti a beosztását.
  - A link a felhasználóhoz kötött titkos kulcsot tartalmaz, mert a naptárprogram nem tud belépni. Csak olvasásra jó, és csak a saját beosztását adja. A kulcsot hash-elve tároljuk; a link csak létrehozáskor látszik (mint az API-kulcsnál); újragenerálással a régi érvénytelenné válik. Inaktív felhasználó linkje nem működik. Látszik az utolsó lekérés ideje; az admin a felhasználó oldalán visszavonhatja.
  - **Tartalom** (a letöltésben és a feliratkozásban ugyanaz): a publikált napok valós műszakjai; a feliratkozásban a mai naptól 7 napra visszamenőleg és minden jövőbeli publikált nap (helyőrző). Nem publikált nap és tervezet nincs benne. Műszakonként egy esemény: a cím a műszak ideje (pl. „Műszak 06:00–14:00”), a leírásban a részek (típus, idő, helyszín, leírás, a blokk az utazási idővel), és ha a valós eltér a publikálttól, a megjegyzésben: „Módosult: <a módosulás ideje>. Publikált: <a publikált műszak ideje és részei>”. Az esemény azonosítója a műszakhoz kötött, így módosításkor frissül, nem duplikálódik; a törölt műszak eltűnik.
  - Az idők Europe/Budapest szerint, óraátállítással helyesek. A széles kompatibilitás (köztük az Outlook) miatt: az időpontok UTC-ben (a naptárprogram a saját időzónájára váltja), a naptár neve „Beosztás – <név>”, a javasolt frissítési idő admin beállítás (helyőrző: 1 óra; `REFRESH-INTERVAL`, `X-PUBLISHED-TTL`; a naptárprogram figyelmen kívül hagyhatja), a link `https`, és `.ics`-re végződik.
  - **Üzemeltetés:** a feliratkozási link a szerver nyilvános címéből készül, amelyet az üzemeltető környezeti változóban ad meg (pl. `APP_PUBLIC_URL`). Ha nincs beállítva, feliratkozás nem kérhető, csak a letöltés működik, és a felület ezt jelzi. Az admin látja, kinek van élő linkje és mikor kérték le utoljára, és bármelyiket visszavonhatja.
  - A frissítés gyakoriságát a naptárprogram dönti el (az Outlook a weben nagyjából 3 óránként, de akár 24 óránál is lassabban; a Google akár naponta egyszer), ezért azonnali értesítésre nem alkalmas. A feliratkozáshoz a szervernek elérhetőnek kell lennie onnan, ahonnan a naptár lekéri (az Outlook a weben és a Google a saját szervereiről, tehát interneten át, HTTPS-sel); a céges Microsoft 365-ben az IT a külső naptárra való feliratkozást korlátozhatja. A beállítás lépéseit a README írja le.
- **„Beosztásom”:** a hét hétfőtől indul; az éjfélen átnyúló műszak „22:00–06:00 (+1)” alakban látszik; eltérésnél a publikált részek is; a valós rétegből törölt műszaknál a módosulás ideje nem jelenik meg.
- **Feliratkozási link:** HTTP-n csak `localhost`-on fogadható el (fejlesztéshez), egyébként `https` kell. A rossz vagy visszavont kulcsot, az inaktív felhasználót és azt, aki elvesztette a saját beosztásához való jogát, 404 zárja ki. A linket a felhasználó és az admin is visszavonhatja.
