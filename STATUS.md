# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 39*

## Mi készült el

- **12. mérföldkő, 1. lépés:** jogosultság és adatréteg az ügynöki beosztásnézethez.
  - Migráció: az Ügynök alapértelmezett szerepkör megkapja a „Beosztás megtekintése” jogosultságot saját hatókörrel; a beosztás táblázatában csak a saját sora látszik (tervezet nélkül), szerkeszteni nem tud.
  - A kezdőoldal szabálya: a csak saját hatókörű beosztásjog nem visz a táblázatra, az ügynök belépés után továbbra is a saját taskjaira érkezik.
  - Az eltérés-összevetés (azonos részek típus és idő szerint) közös, tiszta függvény lett; a beosztás táblázata is ezt használja.
  - A műszak módosítási ideje a rész eltávolításakor is frissül (felvételkor és módosításkor eddig is); a műszak „utolsó változása” a műszak és a részei közül a legkésőbbi.
  - Adatfüggvény az ügynök napjaira: publikált-e a nap, a publikált és a valós műszakok (a kezdőnap szerint), eltér-e, és mikor módosult. Nem publikált napon semmi (a tervezet sem); a valós rétegből törölt műszak idő nélkül eltérés (jóváhagyott 1. döntés).
  - Tesztek: az összevetés, egyező és eltérő nap a módosulás idejével, éjfélen átnyúló műszak, nem publikált nap, törölt és új valós műszak, szabad nap; jogosultságok és kezdőoldal. Adatbázison ellenőrizve a demo ügynökökkel.

## Állapot

- Utolsó commit: `feat: let agents read their own roster` (ez a commit; előtte `c51ec16`)
- Tesztek: `npm test` → 792 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A felületet bejelentkezve nem néztem meg; az adatutakat adatbázison ellenőriztem.

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 2. lépés: „Beosztásom” nézet telefonra (heti lista, napi részletek, az eltérés kiemelése, „Még nincs publikálva”, „Szabad”).
