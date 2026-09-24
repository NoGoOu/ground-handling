# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 23*

## Mi készült el

- 1. és 2. mérföldkő: kész. Utómunka: „Késik” csak a sárga eltérés-küszöb fölött (`096fd27`).
- 3. mérföldkő, 4. lépés: fordulók képzése (`lib/import/pairing.ts`): BUD-szűrés még az értelmezés előtt; az érkezés a következő járat első, utána induló példányával párosul, a többi csak érkező, illetve csak induló; ismétlődő sor, hiányzó vagy már foglalt következő járat figyelmeztetéssel; dátumtartomány, a széleken is párosítva. Tesztek a `docs/schedule-import.md` táblázatának minden sorára (27 forduló, 1 csak érkező, 22 csak induló, 2 kiszűrt sor).
- 3. mérföldkő, 3. lépés: átalakítások tiszta, tesztelt függvényekként (`lib/import/transform.ts`): üres jelölők (pl. „N/A”), szóközlevágás, járatszám-egységesítés (`' 428'` → FR428, `055` → FR55, összevont cella is), dátum (Excel-sorszám és szöveges alakok), idő (a nap törtrésze a percre kerekítve, a leírt másodperc levágva), dátum és idő egy cellából, napeltolás, UTC vagy budapesti idő, napminta és időszak-kibontás. A párosítás (`lib/import/mapping.ts`) ezekből egy sorból járatlábakat állít elő; tesztek a mintafájl soraival.
- 3. mérföldkő, 2. lépés: fájlbeolvasás. CSV, JSON, XLSX és XLS beolvasása nyers cellákká (SheetJS 0.20.3 a hivatalos CDN-ről, jóváhagyva); feltöltés 25 MB-ig (a server action és a proxy korlátja is emelve), a fájl a varázsló lépései között az adatbázisban marad, egy napig; munkalap- és fejlécsor-választás, a munkalap első sorai és előnézet. Tesztek a mintafájllal (munkalapok, fejléc, 14 sor, nyers cellák), CSV, XLS és JSON esetekkel, fejléc-ujjlenyomattal.
- 3. mérföldkő, 1. lépés: adatmodell és migráció. A légitársaság alapértelmezett sablonja (admin felületen állítható, a listán is látszik); a járat forrása (kézi vagy import), állomásai, a két rész üzemnapja, típusa, konfigurációja, importprofilja és részenkénti hiányzó-jelölése; `ImportProfile`, `ImportRun` (napló) és `ImportUpload` (a feltöltött fájl a varázsló lépései között). A két rész azonosítója egyedi kulcs (légitársaság + járatszám + üzemnap + állomás). Az állóhely nem kötelező (az importált járatnak nincs). Új jogosultság: „Járatrend importálása” (Admin, Tervező), tesztekkel.

## Állapot

- Utolsó commit: `95e55d8` – feat: add the schedule import transformations (a 4. lépés commitja ezt követi)
- Tesztek: `npm test` → 270 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: a mintafájl feltöltése, a két munkalap közti váltás, az előnézet a 14 adatsorral; nem támogatott fájltípus elutasítva. Korábban: az alapértelmezett sablon beállítása, az új jogosultság a szerepkör-mátrixban.

## Eltérések a CLAUDE.md-től

- **Az állóhely nem kötelező** (jóváhagyott feltételezés): az importált járatnak nincs, a műszakvezető tölti ki.
- **A „menetrendi dátum” a járat üzemnapja** (az indulás napja az indulóállomáson), ezt tárolja a két rész azonosítója.

## Kérdések a tervezéshez

- A `docs/schedule-import.md` nem ad darabszámot a 12. sorra: az FR1027 időszaka (45595–45644) 2024. 10. 30. és 12. 18. közé esik, ez 8 szerda. A teszt ezt várja; ha a dokumentum 12. 11-ig gondolta, a kivonat Till értéke tér el.

## Következő lépés

- 3. mérföldkő, 5. lépés: párosító felület (oszlop-hozzárendelés, átalakítások, BUD- és dátumtartomány-szűrés, profil mentése és felajánlása).
