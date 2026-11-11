# Terv: 15. mérföldkő – skálázás 3000 egyidejű felhasználóra

**Állapot:** a 14. mérföldkő után jön, a szokásos terv-jóváhagyással.

A cél: a rendszer 3000 egyidejű aktív felhasználót kiszolgáljon, és ez méréssel igazolt legyen. Kicsiben indul (egy gép, egy alkalmazáspéldány), és a gép, illetve a példányszám akkor nő, amikor a mérés szerint kell. Folyamatos működés (több szerver, adatbázis-replika, automatikus átállás) nem cél: kiesésnél visszaállítás mentésből.

## Cél és mérés

- **Terhelési profil** (helyőrző): 3000 egyidejű aktív felhasználó, felhasználónként átlagosan 30 másodpercenként egy kérés (kb. 100 kérés másodpercenként), a csúcs ennek kétszerese; a valós használati minta szerint (a terhelési próba, `docs/spec/uzemeltetes.md`), több állomással.
- **Elvárás:** a kérések 95%-a 1 másodperc alatt (helyőrző), hiba nélkül.
- Először mérünk, és a mérés mutatja meg, hol kell javítani; a javítás után újra mérünk.

## Az alkalmazás

- **Állapot nélküli, több példányban futtatható:** ami a memóriában van, az csak gyorsítótár lehet. A korlátozások (a belépési kísérletek, a fogadó API, a naptárvégpont) állapota közös tárban, az adatbázisban van; új szolgáltatás (pl. Redis) csak akkor, ha a mérés szerint kell.
- **Példányszám** a `.env`-ben (alapból 1). A Caddy a példányok között osztja el a kéréseket, és a beteg példányt kihagyja. A példányok ugyanabból az image-ből futnak, a feltöltött fájlok közös kötetről.
- **Egyszer futó feladatok:** a migráció az indulás előtt egy külön, egyszeri lépés, nem példányonként; ha később időzített feladat lesz, az is egyszer fut.
- **Lekérdezések:** indexek a gyakori szűrésekre (állomás, nap, ügynök, járatrész); az ismétlődő lekérdezések (N+1) kiszűrése; lapozás a hosszú listákon (üzenetek, naplók, hibajegyek, importnapló, képzési rekordok, eszközök). A nehéz nézetek (napi járatlista, sávos nézet, tervező, létszámigény) csak a kért állomás és napok adatát töltik be, és egy lassú nézet nem tarthatja fel a többi kérést. Cél: a napi járatlista 1000 járatos napon is 1 másodperc alatt (a 2026. októberi mérés szerint kb. 5–6 másodperc).

## Adatbázis

- Kapcsolatkészlet (pl. PgBouncer), hogy a példányok ne merítsék ki a Postgres kapcsolatait; a Postgres beállításai a gép méretéhez igazítva.
- Az adatbázis külön gépre is tehető (a `DATABASE_URL`-lel); a README leírja.
- **Mentés gyakorisága:** az adatbázis-mentés gyakorisága beállítható (alapból naponta; nagy üzemben óránként javasolt, helyőrző), mert kiesésnél a legutolsó mentés utáni adat elvész. A megőrzés (14 nap) és a növekményes fájlmentés változatlan.

## Méretezés

- A README-ben méretezési táblázat a mérésekből: melyik gépen (vCPU, memória), hány példánnyal, hány egyidejű felhasználó, milyen válaszidővel. Benne: mikor érdemes nagyobb gépre váltani, és mikor az adatbázist külön gépre tenni.

## Lépésterv

1. Mérés: a terhelési próba több állomással és a 3000 fős profillal; kiinduló mérés az éles összeállításon; a szűk keresztmetszetek a STATUS.md-be
2. Lekérdezések: indexek, az N+1 kiszűrése, lapozás, a nehéz nézetek adatbetöltése; tesztek
3. Több példány: a korlátozás állapota az adatbázisban, a migráció külön lépésben, példányszám a `.env`-ben, Caddy terheléselosztással és állapotfigyeléssel; frissítés és visszaállítás több példánnyal; tesztek
4. Adatbázis: kapcsolatkészlet, a Postgres beállításai, a mentés gyakorisága beállítható
5. Mérés újra, méretezési táblázat; README, STATUS.md
