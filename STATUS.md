# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 35*

## Mi készült el

- **11. mérföldkő, 6. lépés:** hibajegyek kezelése.
  - A jegy oldalán a Műszaki (hibajegy-kezelési jogosultság) átveszi a nyitott jegyet (folyamatban), és lezárja: „javítva” vagy „nem hiba”; nyitott jegy közvetlenül is lezárható. Visszanyitás nincs. A második átvétel, illetve lezárás elutasítva (párhuzamos kattintásnál is).
  - Lezáráskor, ha az eszköz üzemképtelen, egy pipával („az eszköz üzemképes”) visszaállítható, a jegyre hivatkozva naplózva; pipa nélkül a lezárás nem állít vissza (jóváhagyott 5. döntés).
  - Megjegyzéseket a Műszaki ír; a jegyet látók (a jelentő is) olvassák. Az állapotnapló (ki, mikor, miből mibe) és az átvevő, illetve a lezáró neve a jegyen látszik.
  - A jegyek listája: nyitottak (alapból) vagy mind; nyitottak elöl, a legújabb elöl; átvevő, megjegyzés- és fotószám. A műszakvezető és a Műszaki mindenkiét látja, a jelentő a sajátjait.
  - Az eszköz adatlapján az eszköz összes jegye.
  - Adatbázison ellenőrizve: jelentés → átvétel → megjegyzés → lezárás visszaállítással; az eszköznapló két, jegyre hivatkozó sora; nyitott jegy közvetlen lezárása; a listák szűrése.
- 5. lépés (`760f0a9`): jelentés telefonról. 4. (`30588e6`): eszközök. 3. (`59412d9`): típusok. 2. (`b34a0a3`): tiszta függvények. 1. (`cceb047`): adatmodell.

## Állapot

- Utolsó commit: `feat: handle faults: take over, comment, close` (ez a commit; előtte `760f0a9`)
- Tesztek: `npm test` → 779 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A felületet bejelentkezve nem néztem meg; az adatutakat adatbázison ellenőriztem.

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: összesen legfeljebb 25 MB fotó jegyenként (az alkalmazás kéréskorlátja miatt); lezárt jegyhez a Műszaki még írhat megjegyzést.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 7. lépés: a lejáró határidők listája (hamarosan lejár, lejárt; a számlálók „elérte” jelöléssel), a „hamarosan lejár” napjai az Admin → Beállításokban, a nyitott jegyek száma a Műszaki menüjében.
