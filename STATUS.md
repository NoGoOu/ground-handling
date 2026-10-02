# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 39*

## Mi készült el

- **12. mérföldkő, 2. lépés:** „Beosztásom” nézet telefonra (`/agent/roster`).
  - Az ügynök nézetéből a „Beosztásom” gombbal nyílik; heti lista hétfőtől vasárnapig, lapozással és dátumválasztóval (a beosztás táblázatának heti ablaka; a lapozó közös komponens lett).
  - Naponként a valós műszak ideje nagy betűvel; „Még nincs publikálva” a nem publikált napon, „Szabad”, ha a publikált napon nincs műszak. A mai nap kiemelve.
  - Eltérésnél kiemelve: „Publikált: 14:00–22:00 → Valós: 16:00–22:00, módosult: 10. 02. 08:05”; a törölt valós műszaknál „Valós: szabad”, idő nélkül.
  - A napra koppintva a részek: típus, idő, helyszín, leírás, a blokk az utazási idővel; eltérésnél alatta halványan a publikált részek is.
  - Az éjfélen átnyúló műszak a kezdőnapjánál, „22:00–06:00 (+1)” alakban.
  - Tesztek: az időtartam felirata (+1 nap, éjfélkor végződő műszak, óraátállítás napja), több műszak egy napon, a módosulás idejének rövid alakja.
  - Statikusan renderelve, a demo ügynök valódi hetével, telefonméretben megnéztem; bejelentkezve nem.
- 1. lépés (`c0e5a15`): jogosultság és adatréteg.

## Állapot

- Utolsó commit: `feat: show agents their own week on the phone` (ez a commit; előtte `c0e5a15`)
- Tesztek: `npm test` → 796 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 3. lépés: napi összefoglaló az ügynök nézetében (a napi műszak, a blokkok, az eltérés jelölése).
