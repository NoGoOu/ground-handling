# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 23*

## Mi készült el

- 1. és 2. mérföldkő: kész. Utómunka: „Késik” csak a sárga eltérés-küszöb fölött (`096fd27`).
- 3. mérföldkő, 1. lépés: adatmodell és migráció. A légitársaság alapértelmezett sablonja (admin felületen állítható, a listán is látszik); a járat forrása (kézi vagy import), állomásai, a két rész üzemnapja, típusa, konfigurációja, importprofilja és részenkénti hiányzó-jelölése; `ImportProfile`, `ImportRun` (napló) és `ImportUpload` (a feltöltött fájl a varázsló lépései között). A két rész azonosítója egyedi kulcs (légitársaság + járatszám + üzemnap + állomás). Az állóhely nem kötelező (az importált járatnak nincs). Új jogosultság: „Járatrend importálása” (Admin, Tervező), tesztekkel.

## Állapot

- Utolsó commit: `eeadc94` – docs: update CLAUDE.md to version 23 and add the milestone 3 references (az 1. lépés commitja ezt követi)
- Tesztek: `npm test` → 213 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: az alapértelmezett sablon törlése és beállítása a légitársaság oldalán; a szerepkör-mátrixban az új jogosultság az Adminnál és a Tervezőnél be van pipálva.

## Eltérések a CLAUDE.md-től

- **Az állóhely nem kötelező** (jóváhagyott feltételezés): az importált járatnak nincs, a műszakvezető tölti ki.
- **A „menetrendi dátum” a járat üzemnapja** (az indulás napja az indulóállomáson), ezt tárolja a két rész azonosítója.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 3. mérföldkő, 2. lépés: fájlbeolvasás (CSV, JSON, XLSX, XLS), munkalap és fejlécsor választása, előnézet, tesztek a mintafájllal.
