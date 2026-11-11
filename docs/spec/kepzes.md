# Képzések, jogosítások, vizsgák és OJT

A képzési nyilvántartásból adódnak az ügynökök jogosításai, a feladatok pedig jogosításokat követelnek meg. Hiány esetén a rendszer mindenhol figyelmeztet, de nem tilt. Egy képzésnek lehet elméleti része (e-vizsga) és gyakorlati része (OJT és gyakorlati vizsga); akinek minden előírt része sikeres, azt egy jogosult ember kibocsátja, és ettől érvényes a jogosítása. Tiszta függvények: `lib/training.ts`, `lib/exams/`.

## Jogosítás, képzés, képzési rekord

- **Jogosítás (funkció):** név, kód, alapértelmezett érvényességi idő hónapban (üresen hagyva nem jár le), aktív jelölés. Egy jogosítás több légitársaság feladatához is kellhet (pl. az Altéa az A3 és a PC járatokhoz); ez a követelményekből adódik, külön lista nem kell.
- **Képzés:** név, az általa adott jogosítás (opcionális), van-e dolgozat, és ha van, a sikeresség határa százalékban.
- **Képzési rekord:** ügynök, képzés, teljesítés dátuma, a dolgozat eredménye százalékban (ha van dolgozat), sikeres-e, az érvényesség vége, megjegyzés, csatolt fájlok, ki és mikor rögzítette és módosította.
  - Dolgozatos képzésnél a sikeresség az eredményből és a határból számolódik; dolgozat nélkül a koordinátor jelöli.
  - Az érvényesség vége a teljesítés dátuma + a jogosítás érvényességi ideje; felülírható.
  - A rekord javítható, de nem törölhető. A csatolt fájl eltávolítható, mert tévesen feltöltött dokumentum személyes adatot tartalmazhat; az eltávolítás naplózott.
- **Az ügynök jogosításai** a rekordokból számolódnak: jogosításonként a legutolsó sikeres rekord érvényessége számít. Egy későbbi sikertelen próbálkozás nem veszi el a még érvényes jogosítást. Külön, kézzel karbantartott lista nincs.
- **Érvényesség egy adott napon:** a jogosítás érvényes, ha az érvényesség vége nem korábbi az adott napnál (Europe/Budapest). A feladatoknál a task ablakának kezdőnapja számít.
- **Állapot:** érvényes; hamarosan lejár (a lejáratig legfeljebb a beállított napok száma van hátra, helyőrző: 30 nap, beállítás); lejárt; hiányzik.
- **Képzési rekord:** az ügynök kivételével minden mezője javítható; az érvényesség vége alapból számolt, kézzel felülírható.
- **Inaktív jogosítás:** nem választható, és az ellenőrzések figyelmen kívül hagyják.

## Követelmények

- A légitársaság feladattípusainál részenként (érkezés, indulás) megadható, milyen jogosítás vagy jogosítások kellenek. Az érkezéshez és az induláshoz jellemzően két külön jogosítás tartozik. Az admin állítja be, a légitársaság kezelésénél.
- A task egy részének követelménye a légitársaság adott feladattípusának az adott részre megadott jogosításai. Az ügynök akkor felel meg, ha mindegyik érvényes nála a task ablakának kezdőnapján.
- **Gyors forduló követelménye:** az ablak követelménye a két rész követelményeinek uniója.
- **Követelmény forrása:** mindig a légitársaság feladattípusának mostani beállítása; a taskon nem fagy be.

## Figyelmeztetések

- Ha a kiosztott ügynök nem felel meg a követelménynek, a rendszer figyelmeztet, de engedi: a napi lista kiosztásánál, a sávos nézetben (ütközéstípusként), a „Kiosztás átvételénél” és a tervezői névadásnál. A figyelmeztetés megnevezi a hiányzó vagy lejárt jogosítást.
- A tervező betölthetőségi vizsgálata: `docs/spec/tervezo.md`.

## Nézetek

- **Oktatási koordinátor:** jogosítások, képzések és rekordok kezelése, fájlfeltöltés, a lejáró jogosítások listája; mindenkire.
- **Ügynök:** a saját képzései, jogosításai és azok állapota, telefonon is jól olvashatóan.
- **Csapatvezető:** a csapata tagjainak táblázata (ember × jogosítás, állapotszínekkel) és a csapata lejáró jogosításai.
- **Lejáró jogosítások listája:** két csoport (hamarosan lejár, lejárt), csak aktív jogosításokkal.

## Fájlok

- Saját tárhely (Docker-kötet), a rekordhoz csatolva; a késéskód-dokumentumok, az eszközök dokumentumai és a hibajegyek fotói is ide kerülnek. Megengedett típusok: PDF, JPG, PNG; legfeljebb 10 MB fájlonként (helyőrző).
- A fájl letöltése ugyanahhoz a jogosultsághoz és hatókörhöz kötött, mint a rekord megtekintése.
- Automatikus törlés nincs; a megőrzési idő még nyitott kérdés.
- **Fájl eltávolítása:** a fájl a tárhelyről törlődik, a naplósor megmarad.
- A feltöltött képek kicsinyítése: `docs/spec/uzemeltetes.md`.

## A képzés részei

- Képzésenként beállítható: elméleti rész (e-vizsgával), gyakorlati rész (OJT és gyakorlati vizsga), vagy mindkettő. Például az első képzés elmélet, OJT és gyakorlati vizsga; egy ismétlő képzés csak elmélet.
- Az elméleti vizsga sikerességi határa a képzés sikerességi határa.
- **OJT-követelmény** képzésenként: legalább hány megfelelő gyakorlás kell (helyőrző: 10). Megfelelő az a gyakorlás, amelyet a mentor megfeleltnek értékelt, és amelynek automatikus mutatói elérik a képzés küszöbeit: a kötelező mérföldkövek teljessége (helyőrző: 100%) és a zöld vagy sárga eltérésű rögzítések aránya (helyőrző: 0%, vagyis nincs küszöb).
- **Elméleti rész:** csak dolgozattal és sikerességi határral rendelkező képzésnek lehet. Ha a képzésnek dolgozata van, a gyakorlati rész mellé az elméleti is kell, és elméleti résszel a dolgozat nem kapcsolható ki.

## Képzési folyamat

- Egy ügynök részvétele egy képzésben, a koordinátor indítja. Részenként látszik az állapota (elméleti vizsga, OJT, gyakorlati vizsga), a kísérletek és az értékelések. Állapot: folyamatban, kibocsátható, kibocsátva, megszakítva.
- Egy ügynöknek egy képzésből egyszerre egy nyitott folyamata lehet.

## Elméleti e-vizsga

- **Kérdésbank:** a kérdés szövege és típusa (egy helyes válasz, több helyes válasz, szöveges válasz), a válaszlehetőségek és a helyesek, pontszám, témakör (opcionális), aktív.
- **Vizsgalap:** név, képzés, a kérdések sorrendben, időkorlát (opcionális). A kérdésbank és a vizsgalap szabadon létrehozható és szerkeszthető a „vizsgák szerkesztése” jogosultsággal.
- **Kitöltés:** a vizsgáztató vagy a koordinátor megnyitja a kísérletet a vizsgázónak, aki a saját belépésével tölti ki, telefonon is. A kísérlet megnyitáskor elmenti a vizsgalap és a kérdések másolatát, így a későbbi szerkesztés nem változtatja meg (mint a lezárt task pillanatképe).
- **Javítás:** a választós kérdéseket a rendszer javítja (a több helyes válaszú kérdés pontozása vizsgalaponként állítható), a szöveges válaszokat a vizsgáztató pontozza, megjegyzéssel. Amíg van javítatlan szöveges válasz, a kísérlet „javításra vár”. Az eredmény a pontok aránya százalékban; sikeres, ha eléri a határt.
- **Visszajelzés és belső megjegyzés,** két külön mező. A visszajelzést a vizsgázó is látja. A belső megjegyzést (mi nem sikerült, mire figyeljen a következő vizsgáztató) csak a vizsgáztatók, a kibocsátásra jogosultak és a koordinátor látják; a következő kísérletnél a korábbiak látszanak.
- A vizsgázó a saját eredményét, pontjait és a visszajelzést látja, a helyes válaszokat nem, hogy a kérdésbank újrahasznosítható maradjon.
- A vizsga ismételhető; minden kísérlet megmarad.
- **Pontozás:** a több helyes válaszú kérdés pontozása vizsgalaponkénti paraméter (csak a teljesen helyes válasz ér pontot, vagy arányos). A megválaszolatlan szöveges kérdés 0 pont, nem vár javításra. A kísérlet a sikerességi határt is lemásolja.
- **Kitöltés közben:** minden válasz azonnal mentődik; az időkorlát a vizsgázó Kezdés gombjától fut, lejártakor a mentett válaszok beadódnak. A folyamat megszakításakor a nyitott kísérlet is a mentett válaszokkal beadódik.
- **Kérdés és értékelési szempont:** nem törölhető, csak inaktiválható.

## On the job gyakorlás (OJT)

- **Gyakornok a mentor mellett:** a task részéhez (érkezési, indulási) egy gyakornok vehető fel; a rész kiosztott ügynöke a mentor. Gyors fordulónál mindkét rész az érkezési gyakornoké, ahogy az ügynöknél (8. időszámítási szabály). Felvételkor meg kell adni a gyakornok nyitott képzési folyamatát, amelybe a gyakorlás számít.
- Felveheti, aki taskot oszthat ki. Csak olyan rész mellé vehető fel, amelynek ügynöke mentor lehet; ha az ügynök később olyanra változik, aki nem lehet mentor, figyelmeztetés.
- A gyakornok a taskot az ügynök nézetében „OJT” jelöléssel látja, és a rész mérföldköveit rögzítheti; a rögzítésnél látszik, hogy gyakornok rögzítette. A mentor a gyakornok rögzítéseit javíthatja. A számításokban ezek ugyanúgy számítanak, mint az ügynök rögzítései.
- A gyakornok foglaltsága a sávos nézetben a saját sávján „OJT” jelöléssel látszik, és az ütközésvizsgálatba beleszámít; a létszámigénybe nem.
- **Értékelés gyakorlásonként:** a mentor a task után megfelelt vagy nem felelt meg, szöveges megjegyzéssel. Mellette az automatikus mutatók a rész rögzítéseiből: a kötelező mérföldkövek teljessége, a gyakornok által rögzített mérföldkövek aránya, az eltérések színek szerint. A folyamatban látszik, hány gyakorlás megfelelő, és teljesül-e a követelmény.
- **OJT-értékelés:** a task lezárása után, egyszer, csak futó folyamatban; a mutatók az értékeléskor rögzülnek.

## Gyakorlati vizsga

- Valódi járaton, egy task részén, a vizsgáztató értékel. Értékelési szempontok képzésenként (a „vizsgák szerkesztése” jogosultsággal szerkeszthetők), mindegyik megfelelt vagy nem felelt meg, megjegyzéssel; a végeredmény sikeres vagy sikertelen; visszajelzés és belső megjegyzés, mint az e-vizsgánál.
- Ha az OJT-követelmény még nem teljesül, figyelmeztet, de engedi.
- **Kizáró szempontok:** az értékelési szempontnál jelölhető, hogy kizáró-e. Ha egy kizáró szempont nem felelt meg, a vizsga végeredménye automatikusan sikertelen, és a vizsgáztató nem írhatja át; ha minden kizáró szempont megfelelt, a végeredményt a vizsgáztató adja. A vizsga elmenti a szempontok akkori kizáró jelölését, így a későbbi szerkesztés nem változtatja meg.
- **Gyakorlati vizsga:** a folyamat oldaláról indul, a vizsgázó elmúlt 14 napjának egy olyan task részén, ahol ügynök vagy gyakornok volt; rögzítés után nem módosítható. A végeredményt a vizsgáztató adja, a kizáró szempontok szabálya szerint.

## Kibocsátás

- Ha a képzés minden előírt része sikeres (elméleti vizsga, OJT-követelmény, gyakorlati vizsga), a folyamat „kibocsátható”. A kibocsátásra jogosult egy gombbal kibocsátja: létrejön a sikeres képzési rekord (a teljesítés napja a kibocsátás napja, az érvényesség a jogosítás szerint, a dolgozat eredménye az elméleti vizsgáé), hivatkozással a folyamatra. Ettől érvényes a jogosítás.
- A kibocsátás naplózott (ki, mikor).
- A rekordba az utolsó sikeres e-vizsga eredménye kerül.
- A képzési rekord kézi rögzítése a kibocsátás mellett is megmarad (pl. papíron vagy korábban teljesített képzésekhez); ez adja az első mentorok és vizsgáztatók jogosítását is.

## Mentor és vizsgáztató

- Mentor az lehet, akinek „mentorálás” jogosultsága van, és a képzés jogosítása nála érvényes a gyakorlás napján. Vizsgáztató az, akinek „vizsgáztatás” jogosultsága van, és a képzés jogosítása nála érvényes a vizsga napján. Jogosítást nem adó képzésnél elég a jogosultság.

## Jogosultságok

- „Képzések kezelése” (jogosítások, képzések és rekordok, fájlfeltöltés, a folyamat indítása és megszakítása): Oktatási koordinátor, Admin.
- „Képzési adatok megtekintése” hatókörrel (Ügynök: saját; Műszakvezető: csapat; Oktatási koordinátor és Admin: összes). Ezzel látszanak a rekordok, a fájlok, a folyamat, az eredmények és a visszajelzések.
- „Vizsgák szerkesztése” (kérdésbank, vizsgalapok, gyakorlati szempontok, a képzés részei és OJT-követelménye): Oktatási koordinátor, Admin.
- „Mentorálás”: Mentor, Admin.
- „Vizsgáztatás” (e-vizsga megnyitása és javítása, gyakorlati vizsga): Vizsgáztató, Oktatási koordinátor, Admin.
- „Kibocsátás”: Oktatási koordinátor, Admin.
- A gyakornok felvétele a taskok kiosztására vonatkozó jogosultsággal.
- A belső megjegyzést csak a vizsgáztatás, a kibocsátás vagy a képzések kezelése jogosultsággal lehet látni.
