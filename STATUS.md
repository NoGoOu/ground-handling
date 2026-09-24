# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 22*

## Mi készült el

- Utómunka (további eldöntött szabályok 1.): a napi lista, az ügynök nézet és a sávos nézet a hatályos idők napján mutatja a járatot, érkezési horgony szerint rendezve (`lib/flight-day.ts`, tesztekkel, 5 napot késő járattal is).
- 2. mérföldkő, 9. lépés: csak érkező és csak induló járat (11. időszámítási szabály). A Flight két része külön-külön opcionális, adatbázis-szintű ellenőrzéssel (legalább egy rész, és mindegyik rész egész). A `lib/turnaround.ts` szerint egy oldalas járatnak csak a saját részének mérföldkövei, horgonya és egy foglaltsági ablaka van, forduló típus nélkül; tesztekkel. A járat űrlapja, a napi lista, a task nézet, az ügynök nézet, a kiosztás és a sávos nézet kezeli őket. Seed: egy csak induló (ZZ1612) és egy csak érkező (ZZ1511) járat.
- 2. mérföldkő: 1–8. és 11–15. már korábban elkészült (a v18 szerinti sorrendben); a 11–14. lépést a 9. lépés az egy oldalas járatokra igazította.

## Állapot

- Utolsó commit: `cb2bde0` – feat: show turnarounds on the day of their effective times (a 9. lépés commitja ezt követi)
- Tesztek: `npm test` → 193 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: a napi lista, a task nézet, az ügynök nézet (telefon) és a sávos nézet az egy oldalas járatokkal; húzással kiosztás és visszavétel; csak induló járat felvétele az űrlapon; üres űrlap és egy rögzített rész elhagyása elutasítva. A próbaadatok törölve.

## Eltérések a CLAUDE.md-től

- **„Ügynök” a kódban = csapattag** („Minden ügynök egy csapat tagja”).
- **A beosztás táblázat heti ablakban jelenik meg**; a CLAUDE.md időszakot nem ír.
- **A tervezet és a valós rétegben a rész és a műszak eltávolítható**; a publikált réteg zárolt.
- **Blokk csak nem operatív részből lehet.**
- **Egy rész nem hagyható el a járatból, ha már van hozzá rögzítés vagy rendszerből kapott ATA/ATD**, különben a mérföldkövei nyom nélkül eltűnnének. Az elhagyott rész ügynöke törlődik.
- **A csak induló járat a napi listán az indulási horgonya szerint áll** a többi járat érkezési horgonya között (jóváhagyva).

## Kérdések a tervezéshez

1. A sablonban a mérföldkő horgonya és része független, így egy oldalas járatnál előfordulhat, hogy egy mérföldkő a hiányzó horgonyra mutat (pl. érkezési rész, DEPARTURE horgony). Most a meglévő horgonytól számol, és a 3. szabály szerint nem kerülhet az előző elé. Jó így, vagy a sablon kösse a horgonyt a részhez?

## Következő lépés

- 2. mérföldkő, 10. lépés: késés és törlés (a jóváhagyás szerint: az ETA/ETD csak a „Késés rögzítése” műveleten át módosítható, és járatonkénti eseménynapló készül).
