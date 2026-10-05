# STATUS

*Frissítve: 2026. október 5. · CLAUDE.md 45. verzió*

## Mi készült el

- 14. mérföldkő, 1. lépés: adatmodell és migráció. Új `Station` (repülőtér, időzóna, aktív); a migráció létrehozza a BUD állomást (Europe/Budapest). Az állomáshoz tartozó adatok (járat, csapat, műszak, publikáció, terv, importnapló, a légitársaság feladattípusai, sablon, címjegyzék, képzés, kérdés, eszköz) `stationId`-t kaptak; minden meglévő sor a BUD-é.
- Beállítások szétválasztva: állomási (`StationSetting`: eltérés-küszöbök, a két „hamarosan lejár”, feladó, slot-tűrés; a tervezési beállítás állomásonként) és vállalati (`Setting`: naptárfrissítés). Az értékek a migrációban átmásolódnak.
- A szerepkör-hozzárendelés és az egyéni jogosultság állomáshoz kötött (üres = minden állomás); az Admin szerepkörűek minden állomásra szólnak, a többiek a BUD-ra. Minden felhasználó alapértelmezett állomása a BUD.
- 13. mérföldkő utómunka 6. pont (előző commit): az ügynök nézet csak a saját járatait tölti be.

## Állapot

- Utolsó commit: lásd `git log -1` (feat: add stations and give every existing row to BUD)
- Tesztek: 857 zöld; tsc és lint tiszta; a migráció után a séma-eltérés üres; seed lefut; a fő oldalak minden demo szerepkörrel hiba nélkül betöltenek.

## Eltérések a CLAUDE.md-től

- Átmeneti: az állomáshoz tartozó táblák `stationId`-je alapértelmezésként a BUD (`lib/stations.ts`, `BUD_STATION_ID`), amíg minden oldal és művelet meg nem adja az állomást (4. lépés); akkor az alapérték és a konstans megszűnik.
- Sorrend a mérföldkövön belül: a csapattagság-tábla a 4. lépésben, az üzenet–járatrész párosítás (`MessageLink`) a 6. lépésben kerül be, hogy egy adat ne legyen két helyen tárolva, amíg a régi kód még az eredetit használja.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 14. mérföldkő, 2. lépés: az időzóna kötelező paraméter a `lib/time.ts`-ben és minden napfüggő függvényben, Europe/Istanbul és óraátállítási tesztekkel.
