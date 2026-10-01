# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 35*

## Mi készült el

- **11. mérföldkő, 5. lépés:** hibajegy jelentése telefonról, fotóval.
  - `Hibajegyek → Hiba jelentése` (menüből, az ügynök nézetéből egy gombbal, és az eszköz adatlapjáról az eszköz előválasztásával): eszköz a nem kivontak közül, típusonként csoportosítva; leírás; legfeljebb 5 fotó (JPG, PNG vagy PDF, fájlonként 10 MB, összesen 25 MB); „üzemképtelen” jelölés. Telefonra méretezve (nagy mezők és gombok).
  - A fotók mind ellenőrződnek, mielőtt bármi tárolódna; ha egy is rossz, egyik sem kerül a tárhelyre.
  - Az üzemképtelennek jelölt jelentés az üzemképes eszközt azonnal üzemképtelenre állítja, a jegyre hivatkozva naplózva; a jegy nyitott állapotban jön létre, az állapotnaplóban.
  - A jegy oldala: eszköz, állapot, jelentő és idő, leírás, fotók bélyegképpel; a fotók letöltését a szerver a jegy láthatósága szerint ellenőrzi. A jegyek listája: a sajátok, illetve a hatókör szerint mindenkié.
  - Adatbázison ellenőrizve: kivont eszközre elutasítva, rossz fotó esetén semmi sem tárolódik, 6 fotó elutasítva, jelentés fotóval, az eszköz üzemképtelen lesz (naplózva), a második jelentés nem állít újra.
- 4. lépés (`30588e6`): eszközök. 3. lépés (`59412d9`): típusok. 2. lépés (`b34a0a3`): tiszta függvények. 1. lépés (`cceb047`): adatmodell.

## Állapot

- Utolsó commit: `feat: report a fault from a phone, with photos` (ez a commit; előtte `30588e6`)
- Tesztek: `npm test` → 779 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A bejelentő űrlapot telefonméretben statikusan renderelve néztem meg; bejelentkezve nem.

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: összesen legfeljebb 25 MB fotó jegyenként (az alkalmazás kéréskorlátja miatt).

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 6. lépés: hibajegyek kezelése (Műszaki): átvétel, megjegyzések, lezárás; a műszakvezető és a jelentő nézete.
