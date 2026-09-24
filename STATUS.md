# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 24. · CLAUDE.md verzió: 22*

## Mi készült el

- Utómunka (további eldöntött szabályok 1., módosítva szept. 24.): a napi járatlista, az ügynök nézet és a sávos nézet azon a napon mutatja a járatot, amelyre az érkezési horgony vagy a hatályos indulás esik, érkezési horgony szerint rendezve. A napszűrés tiszta függvény (`lib/flight-day.ts`), tesztekkel, köztük egy 5 napot késő járatra.
- 2. mérföldkő, új számozással: 1–8. és 11–15. kész (a v18 szerinti 1–13. lépés). **Az új 9. (csak érkező / csak induló járat) és 10. (késés és törlés) lépés még nincs meg.** Ezeken a lépéseken már túl voltam, amikor bekerültek; a helyükről lásd a kérdéseket.

## Állapot

- Utolsó commit: `6c11190` – docs: document permissions, roster layers and blocks (az utómunka commitja ezt követi)
- Tesztek: `npm test` → 169 teszt, mind zöld
- Lint és build: `npm run lint` hibátlan, `npx tsc --noEmit` tiszta
- Kézi próba: egy 5 napot késő járat (STA 09. 19., ETA 09. 24.) a 19-i listán és sávos nézeten nem, a 24-in igen, az érkezése szerinti helyen.

## Eltérések a CLAUDE.md-től

- **„Ügynök” a kódban = csapattag** („Minden ügynök egy csapat tagja”).
- **A beosztás táblázat heti ablakban jelenik meg**; a CLAUDE.md időszakot nem ír.
- **A tervezet és a valós rétegben a rész és a műszak eltávolítható**; a publikált réteg zárolt. Ha nem kívánt, kivehető.
- **Blokk csak nem operatív részből lehet.**
- **Lépéssorrend:** a 11–15. lépés a 9–10. előtt készült el, ezért a 9–10. után ezeket (foglaltság, ütközés, sávos nézet, ügynök nézet) utólag igazítani kell az egyoldalú és a törölt járatrészekhez.

## Kérdések a tervezéshez

1. Hova kerüljön a 9. és a 10. lépés? Javaslat: most jöjjenek, ebben a sorrendben, és mindkettő a saját lépésében igazítsa a már kész 11–14. lépést (egyoldalú járat: egy doboz; törölt rész: kimarad a foglaltságból, a sávos nézetből és az ütközésből).
2. Csak induló járatnak nincs érkezési horgonya. Mi szerint rendezzük a napi listán? Javaslat: az indulási horgony szerint, a többi járat érkezési horgonya közé.
3. Maradjon-e az ETA és az ETD a járat űrlapján, vagy csak a „Késés rögzítése” műveleten keresztül lehessen módosítani? Javaslat: csak ott, hogy minden változásnak legyen forrása, rögzítője és ideje.
4. A visszaállítás naplózásához a Flight részenkénti `cancelledBy` / `cancelledAt` mezője nem elég. Javaslat: egy járatonkénti eseménynapló (törlés, visszaállítás, késés rögzítése: ki, mikor, megjegyzés).

## Következő lépés

- A fenti kérdések eldöntése után: 2. mérföldkő, 9. lépés (csak érkező és csak induló járatok).
