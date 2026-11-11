# Földi eszközök és hibajegy

Az összes földi eszköz (motoros és nem motoros: pushback, szalagkocsi, busz, lépcső, GPU, dolly …) műszaki nyilvántartása, és hibajegy, amelyet bárki beadhat, a Műszaki pedig kezel. Tiszta függvények: `lib/equipment/`.

## Eszközök

- **Eszköztípus:** név, kód, aktív, és a műszaki adatok mezőlistája (lásd lent). A Műszaki és az Admin kezeli.
- **Eszköz:** típus, azonosító (pl. flottaszám), rendszám (opcionális), leírás, állapot (üzemképes, üzemképtelen, kivonva), megjegyzés. Nem törölhető, csak kivonható.
- **Műszaki adatok:** eszköztípusonként szerkeszthető, kézzel bővíthető mezőlista. Mezőfajták:
  - határidő (dátum, lejárat-figyeléssel: érvényes, hamarosan lejár, lejárt, mint a jogosításoknál);
  - számláló (üzemóra vagy km, kézzel rögzített értékkel, opcionális esedékességi értékkel; figyelmeztet, ha elérte);
  - szöveg.
  - Alapmezők a demo adatokban: műszaki vizsga lejárata (határidő), szerviz esedékessége (határidő és számláló), üzemóra vagy km (számláló).
  - Az értékek eszközönként szerkeszthetők; minden változás naplózott (ki, mikor, régi és új érték).
- **Dokumentumok:** eszközönként feltölthető fájlok (pl. forgalmi, szervizlap, fotó; PDF, JPG, PNG, legfeljebb 10 MB, helyőrző) a közös tárhelyen; az eltávolítás naplózott.
- **„Hamarosan lejár”** az eszközöknél: külön beállítás napokban (helyőrző: 30).
- **Lejáró határidők listája:** két csoport (hamarosan lejár, lejárt), csak aktív, nem kivont eszközökkel.
- **Eszköztípus mezői:** a mező fajtája csak addig módosítható, amíg nincs értéke; mező nem törölhető, csak inaktiválható.
- **Határidő és számláló:** a határidő a lejárat napján még érvényes, kitöltetlenül „nincs megadva”; a számláló „elérte”, ha az állás eléri az esedékességet. A szerviz esedékessége egy határidő-mező és a számláló esedékessége együtt.
- **Lejáró határidők listája:** „hamarosan lejár” és „lejárt vagy elérte” (az esedékességet elért számlálók a lejártak között); csak aktív típusú, nem kivont eszközök, aktív mezők.
- **Az eszközlistát** a műszakvezető (és aki minden hibajegyet lát) olvassa, a Műszaki és az Admin szerkeszti.

## Hibajegy

- **Jelentés:** bárki, aki be van lépve, hibát jelenthet egy eszközre, telefonról is: eszköz, leírás, fotók (opcionális), és jelölheti, hogy az eszköz üzemképtelen.
- Az üzemképtelennek jelentett eszköz állapota azonnal üzemképtelen lesz; üzemképesre a Műszaki állítja vissza.
- **Állapotok:** nyitott → folyamatban (a Műszaki átvette) → lezárva (javítva, vagy nem hiba). Megjegyzések a jegyen, időrendben, ki és mikor írta. Minden állapotváltás naplózott.
- **Kinek látszik:** a Műszaki minden jegyet lát és kezel; a műszakvezető minden jegyet és az eszközök állapotát látja; a jelentő a saját jegyeit. Az eszközlistán az állapot, a nyitott jegyek száma és a legközelebbi határidő látszik.
- **Jelzés:** a Műszakinak a menüben a nyitott jegyek száma.
- **Hibajelentés:** csak nem kivont eszközre; legfeljebb 5 fotó (JPG, PNG vagy PDF, fájlonként 10 MB, jegyenként összesen 25 MB); az ügynök nézetéből és az eszköz adatlapjáról is indítható.
- **Hibajegy kezelése:** nyitott jegy közvetlenül is lezárható; visszanyitás nincs. Megjegyzést a Műszaki ír, lezárt jegyhez is (pl. utólagos alkatrész-információ), a jegy ettől nem nyílik újra; a jegyet látók olvassák.
- **Az eszköz visszaállítása:** üzemképesre a Műszaki külön lépésben állítja, az adatlapon vagy lezáráskor az „az eszköz üzemképes” pipával; az állapotváltás naplója a hibajegyre hivatkozik, ha onnan jött.
- **Nyitott jegyek száma a menüben:** oldalbetöltéskor és minden műveletnél frissül, nem élőben.

## Jogosultságok

- „Eszközök kezelése” (eszköztípusok és mezőlisták, eszközök, műszaki adatok, dokumentumok): Műszaki, Admin.
- „Hibajegyek kezelése” (átvétel, megjegyzés, lezárás, az állapot visszaállítása): Műszaki, Admin.
- „Hiba jelentése”: minden alapértelmezett szerepkör.
- „Hibajegyek megtekintése” hatókörrel (Ügynök: saját; Műszakvezető, Műszaki, Admin: összes).
