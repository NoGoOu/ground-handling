# Tervezői nézet: automatikus beosztás

A járatok foglaltsági ablakaiból a program névtelen pozíciókat (leendő műszakokat) számol, a tervező ezeket átnézi, nevet rendel hozzájuk, és a beosztás tervezetébe menti. Algoritmus, külső AI nélkül; tiszta függvények a `lib/planning/` alatt, unit tesztekkel.

## Folyamat

1. A tervező kiválaszt egy időszakot (kezdő és záró nap); a program naponként számol.
2. **Bemenet:** a nap taskjainak foglaltsági ablakai (`docs/spec/jaratok.md`, Ügynök-foglaltság). Gyors fordulónál egy ablak, hosszú fordulónál kettő (külön pozícióba is kerülhetnek), csak érkező és csak induló járatnál egy; a törölt részek kimaradnak. Egy nap feladatai azok az ablakok, amelyek az adott napon kezdődnek (Europe/Budapest).
3. **Számítás:** névtelen pozíciók („1. pozíció”, „2. pozíció” …), mindegyik egy leendő műszak.
4. **Áttekintés és módosítás:** a sávos nézet, sávonként egy pozícióval, napváltóval, a mutatókkal. A tervező a taskokat kézzel áthúzhatja egyik pozícióból a másikba; ha ez megsért egy korlátot, a rendszer figyelmeztet, de engedi.
5. **Nevek hozzárendelése:** pozíciónként egy ügynök, majd „Mentés a tervezetbe”: pozíciónként egy műszak a beosztás tervezet rétegében. Innen a beosztás publikálása és valós rétege viszi tovább (`docs/spec/beosztas.md`).
6. **Kiosztás átvétele:** külön gombbal a terv kiosztása átvehető a taskokra (lásd lent).

## Pozíció és műszak

- Egy pozíció a hozzá rendelt ablakok sorozata. A műszak kezdete az első ablak kezdete, vége az utolsó ablak vége. Ha így rövidebb a minimális műszakhossznál, a vége kitolódik a minimumig. A műszak nem lehet hosszabb a maximális műszakhossznál.
- Két egymást követő ablak között a rés legalább a pihenőidő. Ha átfedés megengedett, a rés legfeljebb ennyivel lehet negatív. Egyszerre csak az egyik paraméter lehet nullánál nagyobb.
- Szünet: ha a műszak hosszabb a szünetküszöbnél, a pozícióban kell lennie legalább szünethossznyi feladatmentes résnek; a program ezt a rést szünetként jelöli a tervben.
- Mentéskor a műszak egyetlen operatív részből áll (alapértelmezés szerint a Műszak típussal); a szünet a tervben jelölve marad.
- **Pozíció foglaltsága:** az ablakai uniója.
- **Szünet a tervben:** a műszak közepéhez legközelebbi, elég hosszú rés jelölődik (a teljes rés); a minimumig kitolt műszak üres vége is résnek számít.
- Minden task ablaka bemenet, minden feladattípusból. Egy pozícióba több feladattípus is kerülhet, de ugyanannak a járatnak két különböző feladattípusú taskja nem.

## Cél és algoritmus

1. **Minimális pozíciószám a korlátok mellett:** időrendben haladva minden ablak egy olyan meglévő pozícióba kerül, amelyben a korlátok teljesülnek; új pozíció csak akkor nyílik, ha ilyen nincs. Korlátok nélkül ez bizonyíthatóan minimális: a pozíciók száma a legnagyobb egyidejű átfedés (félig nyitott ablakokkal).
2. **Egyenletes terhelés** a megengedett létszámon belül (minimum + a megengedett létszámtöbblet): a pozíciók foglaltsági perceinek különbségét áthelyezéssel és cserével csökkenti, a korlátok megtartásával.
3. **Döntetlennél** a kevesebb munkaóra (a műszakhosszak összege), majd a kevesebb üresjárat (műszakidő − foglaltsági idő) dönt.

- Az eredmény determinisztikus: ugyanarra a bemenetre mindig ugyanaz. Tiszta függvények (`lib/planning/`), unit tesztekkel.
- Mutatók: pozíciószám; pozíciónként foglaltsági perc, műszakhossz és üresjárat; összes munkaóra; a terhelés minimuma, maximuma és különbsége.

## Jogosítások a tervezőben

- A számolás bemenetében minden ablak megkapja a saját részének jogosítás-követelményét (`docs/spec/kepzes.md`). Egy pozíció követelménye a taskjai követelményeinek uniója.
- Jelöltek: az aktív ügynökök. Egy nap pozíciói akkor tölthetők be, ha minden pozícióhoz rendelhető egy-egy különböző ügynök, akinél a pozíció minden követelménye érvényes aznap. Ezt párosítással kell ellenőrizni: nem elég jogosításonként megszámolni (pl. 3 PRM-es és 3 DG-s ember mellett, ha csak egynek van mindkettő, legfeljebb egy pozíció igényelheti mindkettőt).
- A számolás a betölthetőségre törekszik: egy ablakot lehetőleg olyan pozícióba tesz, amelynek követelménye már lefedi az ablakét, és nem bővít úgy egy pozíciót, hogy a nap betölthetetlenné váljon. A kiegyenlítés sem ronthatja el a betölthetőséget. A cél sorrendje egyébként változatlan.
- Ha a nap így sem tölthető be, a terv elkészül, de jelzi a hiányt: a be nem tölthető pozíciókat, és jogosításonként, hány pozíció igényli és hány ember rendelkezik vele (pl. „PRM: kell 4, van 3”).
- Névadásnál a lista elöl a megfelelő ügynököket mutatja; a többi választható, figyelmeztetéssel.
- **Tervező és jogosítások:** a jelöltek az aktív ügynökök, a beosztástól függetlenül. A hiányjelzés megtekintéskor számolódik, a nyilvántartás aktuális adataival, de az érvényességet mindig a terv adott napjára vizsgálja, nem a mai napra.

## Tervezési beállítások

Beállítás, a „tervezés” jogosultsággal szerkeszthető. Számoláskor a terv lemásolja, így a későbbi módosítás a régi terveket nem változtatja meg. Az értékek helyőrzők, a szünetszabályt a Munka törvénykönyve szerint ellenőrizni kell.

- minimális műszakhossz: 240 perc; maximális: 720 perc
- szünet: 20 perc, ha a műszak hosszabb 360 percnél
- pihenőidő két task között: 0 perc; megengedett átfedés: 0 perc (egyszerre csak az egyik lehet nullánál nagyobb)
- megengedett létszámtöbblet a minimumhoz képest: 0

## A terv

- Tartalma: időszak, a beállítások másolata, naponként a pozíciók, az ablak–pozíció hozzárendelés, a kézi módosítások jelölése és a pozíciókhoz rendelt nevek.
- Az újraszámolás felülírja a kézi módosításokat, ezért előtte megerősítést kér.
- Ha a járatok a számolás után változnak (import, késés, törlés), a terv „elavult” jelzést kap, és újraszámolható.
- **Terv hossza:** legfeljebb 31 nap. A „Mentés a tervezetbe” a teljes tervre szól.
- **Újraszámolás:** a kézi módosítások mellett a neveket is törli. A tervezetbe már mentett műszakok megmaradnak, a nap következő mentése cseréli őket.
- **Elavult terv:** menthető, és a kiosztás átvehető, figyelmeztetéssel; az átvétel a taskok mostani alakja szerint dolgozik.

## Nevek és tervezet

- Pozíciónként egy ügynök választható. Ha az ügynöknek a tervezet rétegben már van átfedő műszakja, a mentés nem lehetséges.
- A mentés csak a még nem publikált napokra ír, mert a publikált beosztás zárolt.

## Kiosztás átvétele

- Külön gomb, a taskok kiosztására vonatkozó jogosultsághoz kötve (alapértelmezés szerint a Műszakvezető).
- A terv alapján beállítja az érkezési és az indulási ügynököt, **csak a még kiosztatlan részeken**; a már kiosztottakat kihagyja és listázza. Gyors fordulónál mindkét rész ugyanahhoz az ügynökhöz kerül.
- Az ütközés-figyelmeztetések a szokásosak (`docs/spec/beosztas.md`).
- Az átvétel a megnyitott napra vagy a teljes tervre kérhető, taskonként történik.

## Jogosultság

- „Tervezés” (tervezői nézet, számolás, beállítások, nevek, mentés a tervezetbe), alapértelmezés szerint a Tervező és az Admin szerepkörben.
- **A terv olvasása:** a kiosztási jogosultsággal is lehet (a Műszakvezetőnek az átvételhez kell); módosítani csak „Tervezés” jogosultsággal lehet.
