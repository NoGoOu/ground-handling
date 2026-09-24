# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 22*

## Mi készült el

- 2. mérföldkő, 9. lépés: csak érkező és csak induló járat (11. időszámítási szabály), commit `2118da1`.
- 2. mérföldkő, 10. lépés: késés és törlés. A járat szerkesztő oldalán „Késés rögzítése” (új ETA/ETD, forrás-megjegyzés, rögzítő és idő; az ETA/ETD csak így módosítható). „Késik” címke az eredeti menetrendi nappal és idővel a napi listán, a task, az ügynök és a sávos nézetben. Az érkezési és az indulási rész külön töröltre állítható és visszaállítható: a törölt rész áthúzva látszik, kimarad a foglaltságból, a forduló típusából, a sávos nézetből, az ütközésből és a hiányzó-jelölésből; a kiosztás megmarad. Járatonkénti napló (késés, törlés, visszaállítás: ki, mikor, mit). Tesztekkel.
- Ezzel a 2. mérföldkő 1–14. lépése kész; a 11–14. lépést a 9. és a 10. lépés utólag igazította.

## Állapot

- Utolsó commit: `2118da1` – feat: support arrival-only and departure-only flights (a 10. lépés commitja ezt követi)
- Tesztek: `npm test` → 210 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: 5 napos késés rögzítése (a járat a 29-i listára került „Késik · menetrend: 09. 24. 16:00” címkével, a 24-iről eltűnt); indulási rész törlése (áthúzva a listán, eltűnt a sávos nézetből, a task nézetben nincs rögzítés rajta, a kiosztás megmaradt) és visszaállítása; a napló mindhárom eseményt mutatja. A próbaadatok törölve.

## Eltérések a CLAUDE.md-től

- **„Ügynök” a kódban = csapattag** („Minden ügynök egy csapat tagja”).
- **A beosztás táblázat heti ablakban jelenik meg**; a CLAUDE.md időszakot nem ír.
- **A tervezet és a valós rétegben a rész és a műszak eltávolítható**; a publikált réteg zárolt.
- **Blokk csak nem operatív részből lehet.**
- **Egy rész nem hagyható el a járatból, ha már van hozzá rögzítés vagy rendszerből kapott ATA/ATD.**
- **Törölt részre nem lehet mérföldkövet rögzíteni** (nincs kiszolgálás), és törölt részre nem rögzíthető késés.
- **A törölt rész a napi listán a saját napján marad** (áthúzva), a napszűrés a meglévő részek szerint számol.
- **Az ETA/ETD a járat űrlapjáról lekerült**, csak a „Késés rögzítése” művelet módosítja (jóváhagyva). Eseménynapló készült (jóváhagyva).

## Kérdések a tervezéshez

1. Egy oldalas vagy részben törölt járatnál egy mérföldkő a hiányzó horgonyra is mutathat (a sablonban a horgony és a rész független). Most a meglévő horgonytól számol, és a 3. szabály szerint nem kerülhet az előző elé. Jó így, vagy a sablon kösse a horgonyt a részhez?
2. A „Késik” címke már 1 perc eltérésnél megjelenik (a szabály szerint „későbbi a menetrendinél”), a szoros menetrendű járatoknál a minimális fordulóidő miatt is. Kell-e küszöb?

## Következő lépés

- 2. mérföldkő, 15. lépés: README és STATUS.md végső frissítése, indítás tiszta állapotból (`docker compose down -v`, `docker compose up --build`).
