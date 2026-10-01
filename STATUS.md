# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 34*

## Mi készült el

- **10. mérföldkő, 6. lépés:** OJT a taskon.
  - A task oldalán új „On the job gyakorlás” szakasz: aki a taskot kioszthatja, részenként gyakornokot vesz fel (a gyakornok gyakorlati résszel rendelkező, futó folyamatából választva) vagy távolít el, amíg nincs értékelve. Csak olyan rész mellé, amelynek ügynöke mentorálhat (jogosultság és a képzés jogosítása a gyakorlás napján); gyors fordulónál az érkezési gyakornoké az egész task.
  - A gyakornok az ügynök nézetében „OJT” jelöléssel látja a taskot, a rész mérföldköveit rögzítheti, a saját rögzítéseit javíthatja; a rögzítésnél „(gyakornok)” látszik. A mentor a gyakornok rögzítéseit „saját” hatókörrel is javíthatja. A számításokban ugyanúgy számítanak.
  - Értékelés a task lezárása után, a mentor (a rész ügynöke) adja: megfelelt / nem felelt meg, megjegyzéssel; a mutatók (teljesség, a gyakornok aránya, színek) ekkor rögzülnek, előtte élőben látszanak. A folyamat oldalán a gyakorlások listája, a megfelelőség a képzés küszöbeivel, és a megfelelő gyakorlások száma.
  - Ha a rész ügynöke olyanra változik, aki nem mentorálhat: figyelmeztetés a napi lista és a sávos nézet kiosztásakor, és a task oldalán.
  - Sávos nézet: a gyakornok saját sávján „OJT” jelölésű, szaggatott keretes doboz, amely az ütközésvizsgálatba beleszámít, nem húzható; a gyakornoktól jogosítást nem kér. A létszámigénybe nem számít.
- 5. lépés (`2d3010d`): képzési folyamat. 4. lépés (`1a90dbd`): e-vizsga. 1–3. lépés: adatmodell, tiszta függvények, szerkesztőfelületek.

## Állapot

- Utolsó commit: `feat: train on the job next to a mentor` (ez a commit; előtte `2d3010d`)
- Tesztek: `npm test` → 749 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Adatbázison végigpróbálva: mentor-jogosultság nélkül elutasítva, felvétel, második felvétel elutasítva, a gyakornok látja és rögzíthet, értékelés lezárás előtt és nem mentortól elutasítva, értékelés, második értékelés elutasítva, a rögzített mutatók, a folyamat OJT-része teljesül, mentorváltáskor figyelmeztetés. Bejelentkezve nem néztem meg.

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: az értékelés egyszeri (a mutatók ekkor rögzülnek); csak futó folyamat gyakorlása értékelhető.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 7. lépés: gyakorlati vizsga – a folyamat oldaláról, egy task részére, szempontonként; figyelmeztetés, ha az OJT még nem teljesül.
