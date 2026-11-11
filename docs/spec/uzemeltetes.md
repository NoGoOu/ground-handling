# Üzemeltetés: éles telepítés bérelt szerverre

A projekt gazdája egy bérelt Linux szerveren (VPS) üzemelteti az alkalmazást, saját domainnel és HTTPS-sel. A cél: egy ember néhány paranccsal telepíteni, frissíteni, menteni és visszaállítani tudja, és lássa, ha baj van. A domainen és a szerveren kívül külső szolgáltatás nem kell. Helyben kipróbálva, valódi VPS-en még nem. Kód: `lib/ops/`, `ops/`, `docker/`.

## Telepítés

- Külön éles Compose-fájl (`docker-compose.prod.yml`): az alkalmazás, az adatbázis, a mentés és egy Caddy fordított proxy, amely automatikusan szerez és megújít tanúsítványt (Let's Encrypt) a megadott domainre. Kívülről csak a 80-as és a 443-as port látszik; az adatbázisé és az alkalmazásé nem.
- A beállítások egy `.env` fájlban; a mintája a repóban van, értékek nélkül: domain, `APP_PUBLIC_URL`, az Auth.js titka, az adatbázis jelszava, SMTP. Titok nem kerül a repóba és a naplóba. Ha egy kötelező beállítás hiányzik, az alkalmazás nem indul el, és megmondja, mi hiányzik.
- **Éles módban nincs demo adat:** a demo seed éles módban nem fut le (megtagadja). Az első admin felhasználót egy egyszeri parancs hozza létre (név, felhasználónév, jelszó bekérve), ha még nincs admin.
- Induláskor a migrációk lefutnak; ha egy migráció hibázik, az alkalmazás nem indul el.
- **Nyilvános cím:** az éles Compose az `APP_PUBLIC_URL`-t az Auth.js-nek is átadja (`AUTH_URL`).

## Biztonság

- Csak HTTPS (a HTTP átirányít), HSTS, biztonságos sütik.
- **Belépési kísérletek korlátozása:** felhasználónként és IP-címenként legfeljebb 5 sikertelen kísérlet 15 percen belül (helyőrző), utána várakozni kell; naplózva. A fogadó API és a naptárvégpont is korlátozott a túl sok kérés ellen (helyőrző értékekkel).

## Mentés és visszaállítás

- **Napi automatikus mentés:** az adatbázisról naponta teljes mentés készül, időbélyeges csomagba, a szerver mentési könyvtárába; a régebbiek törlődnek (helyőrző: 14 napot őrzünk). A mentés a Compose része, nem kell hozzá a szerver crontabja.
- **Növekményes fájlmentés:** a feltöltött fájlok nem változnak, ezért a mentési könyvtár közös tárába kerülnek, mindegyik egyszer; a csomag az adatbázist és az akkor meglévő fájlok listáját tartalmazza. Visszaállítás előtt a rendszer ellenőrzi, hogy a csomag minden fájlja megvan-e a tárban; ha nincs meg mind, semmi sem változik. A korábbi, minden fájlt tartalmazó csomagok is visszaállíthatók.
- A megőrzési időn túl törölt fájl a mentésből is kikerül. A saját gépre másolás (`rsync`) így szintén csak az újat viszi.
- **Kézi mentés** egy paranccsal (pl. frissítés előtt).
- **Visszaállítás** egy paranccsal, egy kiválasztott mentésből, megerősítéssel: a kiválasztott nap adatbázisa és az akkor meglévő fájlok állnak vissza. A README lépésről lépésre leírja, és egy próba-visszaállítást is egy üres környezetbe, hogy kiderüljön, működik-e a mentés.
- Visszaállítás előtt a mostani állapotról is mentés készül.
- A mentés szerveren kívüli másolata az üzemeltető dolga; a README egyszerű módot javasol (pl. letöltés a saját gépre `rsync`-kel).
- Az admin oldalon látszik a legutóbbi sikeres mentés ideje; ha 2 napnál régebbi (helyőrző), figyelmeztetés.

## Frissítés

- Egy szkript: mentés, az új verzió letöltése (git), építés, újraindítás a migrációkkal, végül állapotellenőrzés. Ha az állapotellenőrzés hibát ad, a szkript megáll, és leírja, hogyan lehet visszaállni (az előző verzió és a mentés).
- A futó verzió (commit és dátum) az admin oldalon és az állapotvégponton látszik.

## Állapotfigyelés

- **Állapotvégpont** (`/api/health`): elérhető-e az adatbázis, írható-e a feltöltési könyvtár, melyik a verzió; belépés nélkül, de érzékeny adat nélkül. A Docker ebből látja, ha az alkalmazás beteg, és újraindítja.
- A naplók forgatása méretkorláttal, hogy ne teljen be a lemez.
- A README leírja, hogyan állítható egy külső figyelő (pl. egy ingyenes uptime-figyelő) a végpontra; ez opcionális.
- **Beteg alkalmazás újraindítása:** az állapotellenőrző szkript három egymást követő hiba után leállítja az alkalmazást, és az újraindítási szabály indítja újra (a sima Compose magától nem teszi).
- **Lemezfigyelés:** az admin oldalon a lemez foglaltsága és a mentések mérete; 80% fölött (helyőrző) figyelmeztetés, az állapotvégpont is jelzi (az alkalmazás ettől nem számít betegnek).

## Feltöltött képek

- A feltöltött képek (JPG, PNG: hibajegy-fotók, eszköz- és képzési dokumentumok) a szerveren legfeljebb 1600 pixeles hosszabb oldalra, JPEG-be kerülnek (minőség: 80%, helyőrző), a tájolásuk szerint elforgatva; az eredeti nem marad meg. A képből a metaadatok (pl. GPS-hely) törlődnek. A PDF változatlan. A feltöltési korlát (10 MB) a kicsinyítés előtti fájlra vonatkozik.
- Az átlátszó PNG fehér háttérrel lesz JPEG, a fájl neve `.jpg`-re vált; a nem olvasható képet a feltöltés elutasítja.

## Terhelési próba

- Szkript (`ops/loadtest.sh`), amely sok egyidejű felhasználót szimulál valós használati mintával (belépés, napi lista, task nézet, rögzítés, ügynök nézet, „Beosztásom”), és megmondja, hány egyidejű felhasználónál romlik el a válaszidő (cél: a kérések 95%-a 1 másodperc alatt, helyőrző). Az éles összeállításon fut, a valódi VPS-en élesítés előtt is. Az eredmények (melyik gépen hány felhasználó) a README-ben vannak.
- A próba összetétele: 90% ügynök és 10% műszakvezető, 10–30 másodperc gondolkodási idővel, lépcsőnként növekvő létszámmal; csak próbaadatokkal, amelyeket a végén eltávolít, és valódi járatok mellett nem fut.

## Dokumentáció

- A lépésenkénti útmutató a README „Éles üzemeltetés” fejezetében van: szerverigény, a VPS előkészítése (Docker, tűzfal: 22, 80, 443), a domain DNS-beállítása, az első indítás, az első admin, a mentés, a visszaállítás, a frissítés, a hibaelhárítás.
