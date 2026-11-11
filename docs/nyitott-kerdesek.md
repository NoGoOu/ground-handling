# Nyitott kérdések, helyőrzők és feltevések

Minden, ami még a projekt gazdájának döntésére, adatára vagy megerősítésére vár. Ha egy pont eldől, a szabály a `docs/spec/` megfelelő leírásába kerül, innen pedig törlődik.

## Döntés vagy adat kell

- **A tényleges idők forrása:** ha egy járat ATA-ja vagy ATD-je az AODB-ből és MVT-ből is megérkezik, és eltérnek, melyik a mérvadó? Most az üzenetből jött érték marad, és a rendszer nem tárolja, melyik forrásból van az érték.
- **Valós sablonok:** mit csinál pontosan egy GOU- és egy HDS-ügynök a járaton, mikortól meddig? Illeszkednek-e rájuk a mostani foglaltsági képletek, vagy más paraméter kell? Amíg ez nincs meg, minden légitársaság a demo sablonnal számol.
- **SITA-átjáró:** melyik átjárón keresztül menjenek ki a Type B üzenetek (most milyen programmal vagy átjárón küldtök)?
- **Üzenetek, hiányzó minták és jelentések:** a várható indulást jelző (késési, `ED`) MVT, ha van ilyen; az LDM `PAD`, `CRW`, `DHC` és `TB`, a CPM-fejléc `4/1` és a `.TW` sor jelentése (addig nyersen látszanak); a Lufthansa `XOM` és `XCS` kód pontos jelentése; slottörlés és más `TITLE`-ű slotüzenet mintája.
- **Törlés:** törölhető legyen-e a légitársaság és a sablon? Most nem törölhetők.
- **Forduló utólag:** összekapcsolható-e utólag egy csak érkező és egy későbbi csak induló járat fordulóvá a kézzel felvett és a járatrend-importból jött járatoknál (az Ikarus-import lajstrom alapján már párosít)?
- **Megőrzési idők:** meddig őrizzük meg a képzési adatokat, a feltöltött fájlokat, a vizsgakísérleteket és az értékeléseket?
- **OJT-követelmény:** a valós értékek képzésenként.
- **Licenc:** milyen nyílt forráskódú licenc alatt jelenjen meg a projekt?
- **Éles használat:** céges engedély a valós adatokhoz; szolgáltató és domain a bérelt szerverhez.
- **Ikarus-mentés:** fusson-e tovább a 30 nap után, hogy több hét legyen összevethető?

## Helyőrző értékek

Ezek az értékek működnek, de valós adat alapján megerősítendők. Az érték a megjelölt leírásban és a kódban van; itt csak a lista.

| Mi | Hol van leírva |
|---|---|
| A sablon percértékei és paraméterei (köztük a `minBreakMinutes`) | `docs/spec/jaratok.md`, „Sablon és mérföldkövek” |
| Az eltérés színküszöbei | `docs/spec/jaratok.md`, 5. időszámítási szabály |
| Tervezési beállítások (műszakhossz, szünet, pihenő, átfedés, létszámtöbblet); a szünetszabályt a Munka törvénykönyve szerint ellenőrizni kell | `docs/spec/tervezo.md`, „Tervezési beállítások” |
| „Hamarosan lejár” napjai a jogosításoknál; a fájlok méretkorlátja; az OJT-követelmény küszöbei | `docs/spec/kepzes.md` |
| „Hamarosan lejár” napjai az eszközöknél; a dokumentumok méretkorlátja | `docs/spec/eszkozok.md` |
| A fogadó API méretkorlátja; a slot-tűrés; a slot párosítási ablaka; a késéskód-dokumentum méretkorlátja | `docs/spec/uzenetek.md`, `docs/spec/uzenet-formatumok.md` |
| A naptár-feliratkozás időablaka és a javasolt frissítési idő | `docs/spec/beosztas.md` |
| A belépési kísérletek korlátja; a mentések megőrzése; a „régi mentés” és a lemez figyelmeztetési küszöbe; a képkicsinyítés mérete és minősége; a terhelési próba célja | `docs/spec/uzemeltetes.md` |
| Az Ikarus-import fordulópárosításának 24 órás határa | `docs/spec/jaratrend-import.md` |
| A terhelési profil és a mentés gyakorisága nagy üzemben | `docs/tervek/15-skalazas.md` |

## Megerősítendő feltevések

- Hosszú fordulónál a szünetben az ügynök bemegy, ezért a foglaltságba beleszámít a vissza- és a kiutazás.
- Összevonás újraimportáláskor: csak üzemi adat nélküli, importból létrejött járat kerülhet ki (a projekt gazdája nem döntött, a javaslat szerint épült meg).
- A NetLine-export `OnwdEventGt` oszlopa az időszak összes földi idejének összege (a mintafájlból visszafejtve).
- Az MVT `DL` sorában legfeljebb két késéskód van (a minta alapján).
- Lufthansa-minta: a Q (sürgős) tétel az LDM nettó bontásában az O (other) alatt szerepel; az LDM összsúlya a konténerek önsúlyával együtt értendő.
- Az Ikarus-mentés járatlistája a ti kiszolgálásotok egészét mutatja; a tervező eredménye (hétköznap átlagosan 29 pozíció) ezért vethető össze a nálatok dolgozó 20–40 ügynökkel. Az összevetés a valós sablonokkal megismétlendő.
- Több állomás (terv): cégszintű a műszakrész-típus, az eszköztípus, a késéskód-tábla, a légitársaság késéskód-dokumentuma és az importprofil; a szerepkör állomásonként eltérhet; ugyanannak az embernek állomások között sem lehet átfedő műszakja.
- A terhelési próba eredménye fejlesztői laptopról való; a bérelt szerveren élesítés előtt mérendő.
