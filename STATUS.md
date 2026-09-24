# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 22*

## Mi készült el

- A 2. mérföldkő mind a 15 lépése kész (CLAUDE.md v22 szerinti számozás).
- 9. lépés: csak érkező és csak induló járat (11. időszámítási szabály), commit `2118da1`.
- 10. lépés: késés és törlés („Késés rögzítése” forrással, „Késik” címke, részenkénti törlés és visszaállítás, járatnapló), commit `08cada1`.
- 15. lépés: README frissítve (egy oldalas járatok, késés és törlés), indítás tiszta állapotból ellenőrizve.
- Utómunka: napszűrés a hatályos idők szerint (`lib/flight-day.ts`), commit `cb2bde0`.

## Állapot

- Utolsó commit: `08cada1` – feat: record delays and cancel flight parts (a 15. lépés commitja ezt követi)
- Tesztek: `npm test` → 210 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Tiszta indítás: `docker compose down -v` után a `docker compose up --build` mind a 7 migrációt lefuttatta, a seed betöltött, `/api/health` → `{"db":"ok"}`; a napi lista a konténerben is mutatja az egy oldalas járatokat és a „Késik” címkéket.

## Eltérések a CLAUDE.md-től

- **„Ügynök” a kódban = csapattag** („Minden ügynök egy csapat tagja”).
- **A beosztás táblázat heti ablakban jelenik meg**; a CLAUDE.md időszakot nem ír.
- **A tervezet és a valós rétegben a rész és a műszak eltávolítható**; a publikált réteg zárolt.
- **Blokk csak nem operatív részből lehet.**
- **Egy rész nem hagyható el a járatból, ha már van hozzá rögzítés vagy rendszerből kapott ATA/ATD.**
- **Törölt részre nem rögzíthető mérföldkő és késés.**
- **A törölt rész a saját napján marad a listán** (áthúzva); a napszűrés a meglévő részek szerint számol.
- **Az ETA/ETD csak a „Késés rögzítése” művelettel módosítható, és van járatnapló** (jóváhagyva).

## Kérdések a tervezéshez

1. Egy oldalas vagy részben törölt járatnál egy mérföldkő a hiányzó horgonyra is mutathat (a sablonban a horgony és a rész független). Most a meglévő horgonytól számol, és a 3. szabály szerint nem kerülhet az előző elé. Jó így, vagy a sablon kösse a horgonyt a részhez?
2. A „Késik” címke már 1 perc eltérésnél megjelenik, a szoros menetrendű járatoknál a minimális fordulóidő miatt is. Kell-e küszöb?

## Következő lépés

- A 2. mérföldkő kész. A következő mérföldkő a tervezésben dől el (Később szakasz).
