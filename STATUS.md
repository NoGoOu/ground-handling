# Állapot – Ground Handling App

*Frissítve: 2026. október 5. · CLAUDE.md verzió: 45*

## Mi készült el

- **A 13. mérföldkő utómunkájának 6. pontja: az ügynök nézet gyorsítása.**
  - **Mit tölt be:** csak azokat a járatokat, amelyeken a felhasználó ügynök vagy gyakornok, a járat többi taskjával együtt; a járat napját és sorrendjét továbbra is az elsődleges task dönti el.
  - **Hol van a szabály:** két tiszta függvényben: `flightsWorkedOn` (melyik járat kell) és `worksOnTask` (kié egy task); a lekérdezés feltétele ennek a tükre. A napi lista, a sávos nézet és a tervező nem változott.
  - **Ugyanaz-e a lista:**
    - tiszta tesztek: öt személyre (ügynök, gyakornok, más feladattípuson dolgozó, olyan járat, amelynek elsődleges taskja másik napon van, és akinek nincs taskja) ugyanaz a lista jön ki, mint a nap összes járatából;
    - a demo adatbázison minden ügynökre és napra azonos;
    - az 1000 járatos próbaadaton 60 ügynökre azonos.
  - **Gyorsulás:** az 1000 járatos próbaadaton az ügynök nézet adatbetöltése átlagosan 118 ms helyett 19 ms.
  - **Újramérés** (README-táblázat):
    - 300 járatos nap: 100 egyidejű felhasználó (az ügynök nézet mediánja 129 helyett 70 ms);
    - 1000 járatos nap, csak ügynökökkel: 200;
    - 1000 járatos nap, műszakvezetőkkel együtt: kb. 10, mert egyetlen napi lista (kb. 5 mp) is feltartja a többi kérést. Ez a 15. mérföldkő célja.
- **Javítás a mentésben:** a fájltár takarítása külön szkript lett (`docker/backup/prune.sh`).
  - Előbb minden megmaradt csomagot végigolvas. A régi formátumú, fájllista nélküli csomag rendben van.
  - Ha egy csomag vagy a listája nem olvasható, a tárból semmit sem töröl, és figyelmeztet.
  - Kipróbálva konténerben: a normál takarítás törli a sehol nem szereplő fájlt; egy csonkolt csomag mellett semmi sem törlődik; egy régi formátumú csomag mellett a takarítás lefut.

## Állapot

- Utolsó commit: `perf: load only the agent's own flights for the agent view` (ez a commit; előtte `bb24af0`)
- Tesztek: `npm test` → 857 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- A 14. mérföldkő (több állomás) terve, jóváhagyásra.
