# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 30. · CLAUDE.md verzió: 31*

## Mi készült el

- **9. mérföldkő, 1. lépés kész: a 8. mérföldkő utómunkája (késéskódok légitársaságonként).**
  - Tárolás és feltöltés (`4ffa147`): légitársaságonként egy PDF (legfeljebb 10 MB, a tartalom alapján ellenőrizve) a meglévő kötet `delay-codes` mappájában; feltöltés, csere, eltávolítás és napló az `Admin → Üzenetküldés` oldalon.
  - Megnyitás a járatról: „Késéskódok” hivatkozás a késésrekordoknál, a „Késés rögzítése” műveletnél és az indulási MVT DL soránál. Ha van dokumentum, új lapon nyílik; ha nincs, helyben lenyílik a közös kódtábla (aktív kódok, leírással).
  - Seed: a 36, 68, 81, 82, 93 kód IATA szerinti leírása; a Demo Fapadoshoz saját készítésű minta-PDF (a Ryanairnek nincs, ott a közös tábla látszik). README frissítve.

## Állapot

- Utolsó commit: `feat: open the delay codes from the flight` (ez a commit; előtte `4ffa147`)
- Tesztek: `npm test` → 619 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Ellenőrizve: adatbázison a feltöltés, a csere, az egyidejű feltöltés és az eltávolítás; a minta-PDF megnyitható; belépés nélkül mindkét letöltési útvonal a belépéshez irányít. A felületet belépés nélkül nem néztem meg.

## Eltérések a CLAUDE.md-től

- Nincs. Jóváhagyott döntés: a közös kódtábla helyben nyílik le. Pontosítás: a dokumentumot a járat taskjainak látóin kívül az is megnyithatja, aki járatot kezel (a „Késés rögzítése” űrlap miatt) vagy a dokumentumokat feltölti.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. lépés: `lib/staffing/` – a nap 15 perces sávjai óraátállítással, a sáv csúcsa feladattípusonként és összesen, tesztekkel.
