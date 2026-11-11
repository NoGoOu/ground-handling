# Létszámigény

Hány ügynök kell egyszerre, 15 perces sávokban, a foglaltsági ablakokból, és ez hogyan viszonyul a beosztáshoz. Tiszta függvények a `lib/staffing/` alatt, külső AI nélkül. A sávos idősoros nézeten nem jelenik meg, mert a tervezés más logika szerint működik.

## Számítás

- **Sáv:** 15 perc, a naptári napon (00:00–24:00, Europe/Budapest), a nap elejétől számolva. Óraátállítás napján a sávok a valós időt követik (92 vagy 100 sáv).
- **Igény egy sávban:** a sávon belül a legtöbb egyszerre futó foglaltsági ablak (`docs/spec/jaratok.md`, Ügynök-foglaltság), félig nyitott intervallumokkal: a sáv elejével végződő és a sáv végével kezdődő ablak nem számít bele.
- **Bemenet:** minden task foglaltsági ablaka, minden feladattípusból, a hatályos időkből, így a késéssel együtt mozog. A törölt részek és a „nincs teendő” taskok kimaradnak. Az éjfélen átnyúló ablak mindkét nap sávjaiba beleszámít. Az igény a kiosztástól független.
- **Bontás:** feladattípusonként és összesen. Az összesen a minden ablakból együtt számolt csúcs, nem a feladattípusonkénti csúcsok összege.
- **Beosztás:** sávonként azoknak az ügynököknek a száma, akik a nap rétegében (publikált napon a valós, nem publikált napon a tervezet) operatív részben vannak, és éppen nincsenek egy nem operatív rész blokkjában; a sáv értéke a sávon belüli legkisebb szám. A beosztás nincs feladattípusra és jogosításra bontva, mert az ügynökök nincsenek feladattípushoz kötve.
- **Hiány és többlet:** az összesített igény és a beosztás különbsége sávonként; a hiány kiemelve.
- **Létszámigény és státusz:** minden task beleszámít az igénybe, a státuszától függetlenül.
- **Nappal átfedő ablakok:** az előző és a következő nap járatai is betöltődnek; feltevés, mint a tervezőnél: egy ablak legfeljebb a szomszédos napra nyúlik át.
- **Beosztás a létszámigényhez:** mindenki beleszámít, akinek a nap rétegében operatív része van.
- **Beosztás nélküli nap:** ha a nap saját rétegében (publikált napon a valós, nem publikált napon a tervezet) nincs műszak, az igény látszik, hiány nem jelölődik; az előző napról átnyúló műszak sem teszi hiányossá.
- **A műszak rétege a létszámigényben:** a műszak a kezdőnapja szerinti rétegből számít (publikált napon a valós, nem publikált napon a tervezet); a nem publikált napra felvitt valós műszak és a publikált napra felvitt tervezet nem számít.
- A gyakornok (OJT) foglaltsága a létszámigénybe nem számít bele.

## Tervezet a nem publikált napokon

- A még nem publikált napokon a tervezet réteg műszakjai adják a beosztást, ugyanazzal a számítással (operatív rész, blokkon kívül, a sáv legkisebb értéke), „tervezet” jelöléssel; a hiány és a többlet ugyanúgy látszik. A napi nézetben és a többnapos áttekintésben is jelölve van, melyik nap számol a tervezetből.
- A tervezetből számolt beosztást csak az látja, aki a beosztás tervezetét is láthatja (alapból a Tervező és az Admin); a többieknek ezeken a napokon csak az igény látszik.
- **Tervezet láthatósága a létszámigényben:** akinek nincs joga a tervezethez, a nem publikált napon csak az igényt látja, akkor is, ha valós műszak van rá.

## Nézet

Külön oldal, asztali gépre; telefonon ne törjön el, de nem arra optimalizált. Minden idő helyi időben (Europe/Budapest).

- **Napi nézet** napválasztóval: lépcsős grafikon (a sáv értéke állandó) az összesített és a feladattípusonkénti igénnyel, a beosztás vonalával és a hiányos sávok kiemelésével; alatta táblázat sávonként: idő, igény feladattípusonként és összesen, beosztás, hiány vagy többlet.
- **Többnapos áttekintés:** legfeljebb 31 napos időszak; nap × sáv táblázat az összesített igénnyel, színezve, a hiányos sávok kiemelve; naponként a napi csúcs és az ideje, valamint a legnagyobb hiány. Egy napra kattintva a napi nézet nyílik.
- **Többnapos áttekintés:** az oszlopok a helyi óra negyedórái; óraátállításkor tavasszal üres cellák, ősszel a két azonos negyedóra közül a nagyobb igény és a nagyobb hiány, megjelölve. Alapból mától egy hét; a 31 napnál hosszabb időszakot elutasítja.

## Jogosultság

- „Létszámigény megtekintése”: alapértelmezés szerint a Tervező, a Műszakvezető és az Admin szerepkörben. Hatókör nélkül: mindig az összes járatból számol.
