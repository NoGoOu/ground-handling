# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 30. · CLAUDE.md verzió: 31*

## Mi készült el

- **9. mérföldkő, 1. lépés (a 8. mérföldkő utómunkája), első fele:** a légitársaság késéskód-dokumentuma – tárolás és feltöltés.
  - Új tábla (`DelayCodeDocument`): légitársaságonként egy PDF; a sor egyben a napló (ki, mikor, milyen fájlt töltött fel, cserélt le, távolított el). Cserénél és eltávolításnál a fájl törlődik a tárhelyről.
  - A fájl a meglévő kötet `delay-codes` mappájában van; csak PDF (az első bájtok alapján), legfeljebb 10 MB.
  - `Admin → Üzenetküldés`: új szakasz légitársaságonként feltöltéssel, cserével, eltávolítással, megnyitással és naplóval, az „Üzenetküldés beállításai” jogosultsággal.
  - Letöltés két útvonalon, szerveroldali ellenőrzéssel: a járatról (`/api/flights/[id]/delay-codes`) és a beállításokból (`/api/airlines/[id]/delay-codes`).
  - A migráció a meglévő 36, 68, 81, 82, 93 kód üres leírását az IATA szerinti szöveggel tölti ki.

## Állapot

- Utolsó commit: `feat: keep a delay code document per airline` (ez a commit; előtte `b998932`)
- Tesztek: `npm test` → 617 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Adatbázison ellenőrizve: feltöltés, csere (a régi fájl törlődik), két egyidejű feltöltés után is egy dokumentum marad, eltávolítás, napló. A felületet belépés nélkül nem néztem meg.

## Eltérések a CLAUDE.md-től

- Nincs. Pontosítás: a dokumentumot a járat taskjainak látóin kívül az is megnyithatja, aki járatot kezel (a „Késés rögzítése” űrlap miatt) vagy a dokumentumokat feltölti.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- Az 1. lépés második fele: „Késéskódok” megnyitása a járatról (késésrekordok, „Késés rögzítése”, az indulási MVT DL sora), dokumentum nélkül a közös kódtábla; seed (IATA-leírások, minta-PDF a demo légitársasághoz).
