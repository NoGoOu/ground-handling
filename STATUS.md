# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 23*

## Mi készült el

- 1. és 2. mérföldkő: kész. Utómunka: „Késik” csak a sárga eltérés-küszöb fölött (`096fd27`).
- 3. mérföldkő, 2. lépés: fájlbeolvasás. CSV, JSON, XLSX és XLS beolvasása nyers cellákká (SheetJS 0.20.3 a hivatalos CDN-ről, jóváhagyva); feltöltés 25 MB-ig (a server action és a proxy korlátja is emelve), a fájl a varázsló lépései között az adatbázisban marad, egy napig; munkalap- és fejlécsor-választás, a munkalap első sorai és előnézet. Tesztek a mintafájllal (munkalapok, fejléc, 14 sor, nyers cellák), CSV, XLS és JSON esetekkel, fejléc-ujjlenyomattal.
- 3. mérföldkő, 1. lépés: adatmodell és migráció. A légitársaság alapértelmezett sablonja (admin felületen állítható, a listán is látszik); a járat forrása (kézi vagy import), állomásai, a két rész üzemnapja, típusa, konfigurációja, importprofilja és részenkénti hiányzó-jelölése; `ImportProfile`, `ImportRun` (napló) és `ImportUpload` (a feltöltött fájl a varázsló lépései között). A két rész azonosítója egyedi kulcs (légitársaság + járatszám + üzemnap + állomás). Az állóhely nem kötelező (az importált járatnak nincs). Új jogosultság: „Járatrend importálása” (Admin, Tervező), tesztekkel.

## Állapot

- Utolsó commit: `4c8116f` – feat: add the schedule import data model (a 2. lépés commitja ezt követi)
- Tesztek: `npm test` → 223 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: a mintafájl feltöltése, a két munkalap közti váltás, az előnézet a 14 adatsorral; nem támogatott fájltípus elutasítva. Korábban: az alapértelmezett sablon beállítása, az új jogosultság a szerepkör-mátrixban.

## Eltérések a CLAUDE.md-től

- **Az állóhely nem kötelező** (jóváhagyott feltételezés): az importált járatnak nincs, a műszakvezető tölti ki.
- **A „menetrendi dátum” a járat üzemnapja** (az indulás napja az indulóállomáson), ezt tárolja a két rész azonosítója.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 3. mérföldkő, 3. lépés: átalakítások tiszta, tesztelt függvényekként (szóközlevágás, járatszám, dátum és idő, időszak-kibontás napminta szerint, napeltolás, időzóna).
