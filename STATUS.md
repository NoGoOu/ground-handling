# Állapot – Ground Handling App

*Frissítve: 2026. október 5. · CLAUDE.md verzió: 44*

## Mi készült el

- **13. mérföldkő utómunkája, 1. pont:** képek kicsinyítése feltöltéskor.
  - Minden feltöltés egy közös úton megy át (`lib/data/uploads.ts`): a képzési csatolmány, az eszközdokumentum és a hibajegy-fotó is.
  - Először a mostani ellenőrzés fut (típus a fájl első bájtjai szerint, 10 MB, a kicsinyítés előtti fájlra).
  - A JPG és a PNG feldolgozása a `sharp` könyvtárral:
    - elforgatás a tájolás szerint;
    - legfeljebb 1600 px a hosszabb oldal, nagyítás nincs;
    - JPEG, 80%-os minőség;
    - a metaadatok (EXIF, GPS) törlődnek, az eredeti nem marad meg.
  - A PNG átlátszó része fehér lesz, a megőrzött fájlnév kiterjesztése `.jpg`, a tárolt méret az új méret. A PDF változatlan. A nem olvasható képet „rossz típus” hibával utasítja el.
  - A már tárolt képeket nem dolgozza fel utólag (jóváhagyott 2. döntés).
  - A `sharp` közvetlen függőség lett (eddig a Next.js hozta, nem kötelező függőségként); a lockfile-ban csak ő és a saját platformcsomagjai változtak.
  - Tesztek generált képekkel: 4000 × 3000-es, „jobbra fordítandó”, GPS-es fotóból 1200 × 1600-as JPEG metaadatok nélkül; átlátszó PNG-ből fehér hátterű JPEG nagyítás nélkül; PDF változatlanul; sérült kép, túl nagy fájl, rossz típus; a fájlnév.
  - Ellenőrizve:
    - adatbázison egy hibajelentés 4032 × 3024-es, GPS-es fotóval: 71 kB helyett 11 kB-os, 1200 × 1600-as JPEG tárolódott EXIF nélkül;
    - a Docker-image-ben (Linux) a `sharp` fut.
- A 13. mérföldkő: kész (`56b2d96`).

## Állapot

- Utolsó commit: `feat: shrink uploaded images and strip their metadata` (ez a commit; előtte `cd2d828`)
- Tesztek: `npm test` → 841 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- Utómunka, 2. pont: növekményes fájlmentés.
