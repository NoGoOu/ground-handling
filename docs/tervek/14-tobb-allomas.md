# Terv: 14. mérföldkő – több állomás egy cégen belül

**Állapot:** az 1. lépés kész (2026. október 5.): az állomás az adatmodellben van, és minden meglévő adat a BUD állomásé. A 2. lépéstől a `CLAUDE.md` ütemterve szerint folytatódik, a szokásos terv-jóváhagyással. Az 1. lépés átmeneti BUD-alapértékei (`lib/stations.ts`) a 4. lépésig maradnak.

Egy cég több állomása (BUD mellett más repülőterek, akár más időzónában) ugyanazon a rendszeren, egy adatbázisban. Minden állomás a saját járataival, beosztásával és beállításaival dolgozik; a központi felhasználók több vagy minden állomást látnak. A meglévő működés nem változik: a migráció után minden adat a BUD állomásé, és a meglévő tesztek zöldek maradnak.

**Általános szabály:** ahol a leírások (`docs/spec/`) Europe/Budapest-et, budapesti napot vagy BUD-ot említenek (napi lista, üzemnap, beosztás, publikálás, tervező, létszámigény, jogosítás- és eszközhatáridő, import, üzenetek), ott ez a mérföldkő az adott állomás időzónáját, illetve az adott állomást érti.

## Állomás

- **Állomás:** a repülőtér-táblára épül (IATA, ICAO, név), és hozzá tartozik az IANA-időzónája (pl. Europe/Budapest, Europe/Istanbul) és az aktív jelölés. Nem törölhető; az inaktív állomás nem választható, az adatai megmaradnak. Az állomásokat az Admin kezeli.
- **Időzóna:** minden időpont továbbra is UTC-ben tárolódik. Minden napfüggő számítás (napi lista, nap határai, üzemnap, beosztás és publikálás, tervező, létszámigény sávjai az óraátállítással, jogosítás és eszközhatáridő napja, „Beosztásom”, naptár) az állomás időzónájában fut, és a felület az állomás helyi idejét mutatja. Akinek több állomása van, annak a felület az időzónát is kiírja (pl. „IST, UTC+3”).

## Mi állomásonkénti és mi cégszintű

- **Elv:** a katalógusok (mi létezik) cégszintűek; a működés (mi történik egy állomáson) és az állomás saját beállításai állomásonkéntiek.
- **Állomásonként:**
  - járatok, taskok, rögzítések, késések, járatnapló; az import (az importprofil cégszintű, a futtatás egy állomásra szól, a hiányzó-jelölés profilonként és állomásonként);
  - csapatok, beosztás (rétegek, publikálás), tervek, létszámigény;
  - légitársaság-beállítások: a légitársaság feladattípusai, a sablonok, az elsődleges feladattípus, a jogosítás-követelmények, a címjegyzék;
  - képzések, vizsgalapok, kérdésbank, gyakorlati szempontok, képzési folyamatok, OJT;
  - földi eszközök, dokumentumaik, hibajegyek;
  - beállítások: eltérés-küszöbök, „hamarosan lejár” napjai (jogosítás és eszköz), feladó email-címe és Type B címe, slot-tűrés, tervezési beállítások.
- **Cégszintű:**
  - a felhasználók (egy ember egy fiók, akárhány állomással), a szerepkörök meghatározása;
  - a légitársaságok listája, a feladattípus-katalógus, a műszakrész-típusok, az eszköztípusok és mezőlistáik;
  - a jogosítás-katalógus és a jogosítások: **a jogosítás az emberé**, akármelyik állomáson szerezte, és minden állomáson érvényes;
  - a késéskód-tábla és a légitársaságok késéskód-dokumentuma, a repülőtér-tábla;
  - a fogadó API és az API-kulcsok; a mentés, a lemezfigyelés, a verzió; a naptárfrissítés javasolt ideje.
- **Képzési adatok:** a rekordot az a koordinátor rögzíti és javítja, akinek állomásán a képzés van. Aki egy embernek a képzési adatait láthatja (hatókör szerint, a saját állomásán), az az ember minden rekordját látja, akármelyik állomáson készült.

## Felhasználók és jogosultság

- **Szerepkör állomásra:** a szerepkör-hozzárendelés és az egyéni jogosultság egy állomásra vagy minden állomásra szól. Egy ember egyik állomáson lehet műszakvezető, a másikon ügynök. A „minden állomás” a központi felhasználóké, és a később felvett állomásokra is érvényes.
- **A felhasználó állomásai** azok, amelyekre bármilyen szerepköre vagy egyéni jogosultsága van. Alapértelmezett állomása van; a menüben állomásváltó, ha több állomása van. A kiválasztott állomás minden oldalon látszik.
- **Hatókör:** a saját, csapat és összes hatókör mindig a kiválasztott állomáson belül értendő. A csapat állomáshoz tartozik; egy ügynök állomásonként egy csapat tagja.
- **Szerveroldali elkülönítés:** a szerver minden olvasásnál és műveletnél ellenőrzi, hogy a felhasználónak van-e joga az adat állomásához. Egy másik állomás adata azonosítóval sem érhető el. Ezt tesztek biztosítják.
- **Cégszintű adat szerkesztése** (katalógusok, légitársaság-lista, késéskód-tábla, repülőtér-tábla, API-kulcsok): a megfelelő meglévő jogosultsággal, ha az minden állomásra szól; egy állomásra szóló jogosultsággal a katalógus csak olvasható. A szerepkörök meghatározása és az állomások kezelése csak az Admin szerepkörrel.
- **Állomásadmin** (új alapértelmezett szerepkör): a saját állomásán kezeli a felhasználókat (új felhasználó, szerepkör és egyéni jogosultság erre az állomásra), a csapatokat, az állomás beállításait, a légitársaság-beállításokat és a címjegyzéket. Más állomásra szóló hozzárendelést nem lát és nem módosít. Jelszót és aktív jelölést csak annál állít, aki csak az ő állomásain van; a többieknél az Admin.
- **Nincs jogosultság-kiterjesztés:** senki nem adhat olyan szerepkört, jogosultságot vagy hatókört, amellyel maga nem rendelkezik az adott állomáson; „minden állomás” hozzárendelést és Admin szerepkört csak az Admin ad.
- A felhasználó admin oldalán a tényleges jogosultság állomásonként látszik, a forrásával.
- **Kiosztás és beosztás:** egy állomás taskjára és beosztásába csak az kerülhet, akinek arra az állomásra szerepköre van; a tervező jelöltjei is az állomás aktív ügynökei. Ugyanannak az embernek egy rétegen belül állomások között sem lehet két átfedő műszakja.
- **„Beosztásom” és a naptár** az ember minden állomásának műszakjait mutatja, állomáskóddal, az állomás helyi idejében (a naptárban UTC-ben, mint eddig).

## Üzenetek

- Továbbra is egy fogadó API. Az üzenetet a rendszer válogatja szét: az állomást az üzenet állomáskódjaiból dönti el (az MVT és az LDM állomása, az `EA` célállomása, a slotüzenet `ADEP`/`ADES` ICAO-kódja a repülőtér-táblán át), az eddigi BUD-szabályok szerint, a BUD helyén bármelyik aktív állomással. A beégetett `BUD` és `LHBP` megszűnik.
- **Egy üzenet több állomásra is hathat:** például a BUD-ról IST-be induló járat MVT-je a BUD-i indulási rész ATD-je és az IST-i érkezési rész ETA-ja. Ilyenkor mindkét állomás járatrészéhez párosul, és mindkét állomás „Üzenetek” fülén látszik.
- **Párosítatlan üzenet:** ha az állomás eldönthető, az állomás listájára kerül. Ha egyik állomásunk sem dönthető el, egy közös listára, amelyet bárki lát, akinek valamelyik állomáson „Üzenetek rögzítése” joga van; hozzárendelni csak a saját állomása járatához tud.
- **Kimenő MVT:** a fejlécben az állomás kódja, a feladó az állomás beállításából, a címzettek az állomás címjegyzékéből.

## Adatmodell

- **Station:** airport (a repülőtér-táblából), timeZone (IANA), active.
- Állomás kerül a járatra, a csapatra, a műszakra, a publikációra, a tervre, az importfuttatásra, a légitársaság feladattípusaira és sablonjaira, a címjegyzékre, a képzésre és a vizsgaelemekre, az eszközre; a beállítások és a tervezési beállítások állomásonként egy sor (a cégszintű beállítások külön).
- **A felhasználó szerepkörei és egyéni jogosultságai:** állomással, vagy „minden állomás” jelöléssel. A felhasználónak alapértelmezett állomása van.
- **Message:** több járatrészhez is párosulhat (a megvalósítás módja a tervben dől el).
- **Migráció:** létrejön a BUD állomás (Europe/Budapest), minden meglévő adat hozzá kerül; a meglévő szerepkör-hozzárendelések BUD-ra szólnak, az Admin szerepkörűeké minden állomásra.

## Lépésterv

1. Adatmodell és migráció: állomás, az állomásonkénti adatok, a beállítások állomásonként, a szerepkörök és egyéni jogosultságok állomásra, alapértelmezett állomás; minden meglévő adat a BUD-é. A viselkedés változatlan, a meglévő tesztek zöldek
2. Időzóna: a `lib/time.ts` és minden napfüggő tiszta függvény időzónát kap paraméterként, a beégetett Europe/Budapest helyett; tesztek UTC+3-ra (Europe/Istanbul, óraátállítás nélkül) és óraátállításos zónára (a nap határai, a létszámigény sávjai, az üzemnap, a jogosítás lejárati napja)
3. Jogosultság állomásonként: a tényleges jogosultság a kiválasztott állomásra, „minden állomás” hozzárendelés, állomásváltó, szerveroldali elkülönítés, cégszintű adat szerkesztése, a kiterjesztés tilalma; tesztek (köztük: egy másik állomás járata, műszakja, eszköze és képzése azonosítóval sem érhető el)
4. Az oldalak és a műveletek állomásra szűrve: napi lista, task és ügynök nézet, sávos nézet, beosztás, tervező, létszámigény, képzések, eszközök, hibajegyek; „Beosztásom” és a naptár minden állomás műszakjával; az átfedő műszak tilalma állomások között
5. Admin: állomások; az Állomásadmin szerepkör és felülete; a felhasználó oldalán a tényleges jogosultság állomásonként
6. Üzenetek: az állomás az üzenetből, egy üzenet több állomáson, a párosítatlanok állomásonként és közösen, a kimenő MVT az állomás adataival; tesztek (köztük: egy BUD–IST MVT mindkét állomás járatára hat; ismeretlen állomás párosítatlan)
7. Import: állomás választása, a szűrés, a fordulók képzése és a hiányzó-jelölés az állomásra; tesztek
8. Seed (egy második demo állomás: IST, Europe/Istanbul; egy BUD–IST járat mindkét állomáson, hozzá demo üzenet; IST-i állomásadmin és ügynökök; egy központi felhasználó minden állomással), README, STATUS.md
