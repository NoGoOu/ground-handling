# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 34*

## Mi készült el

- **10. mérföldkő, 7. lépés:** gyakorlati vizsga.
  - A folyamat oldaláról rögzíti a vizsgáztató: a vizsgázó elmúlt 14 napjának (paraméter) olyan task részéből választ, ahol ügynök vagy gyakornok volt; szempontonként megfelelt / nem felelt meg, megjegyzéssel; végeredmény, visszajelzés és belső megjegyzés.
  - Rögzíteni a „Vizsgáztatás” jogosultsággal és a képzés jogosításával lehet, amely a választott task napján érvényes; a felület előre jelzi, ha ma nem érvényes.
  - Figyelmeztet, de enged, ha az OJT-követelmény még nem teljesül (a rögzítés előtt és után is).
  - A folyamat oldalán a vizsgák listája: task, vizsgáztató, szempontonkénti eredmény, visszajelzés; a belső megjegyzés csak a vizsgáztatóknak, a kibocsátásra jogosultaknak és a koordinátornak. A szempontok másolatként tárolódnak, a későbbi szerkesztés nem változtatja meg őket.
- 6. lépés (`283f5e6`): OJT a taskon. 5. lépés (`2d3010d`): képzési folyamat. 1–4. lépés: adatmodell, tiszta függvények, szerkesztőfelületek, e-vizsga.

## Állapot

- Utolsó commit: `feat: record the practical exam on a real flight` (ez a commit; előtte `283f5e6`)
- Tesztek: `npm test` → 749 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Adatbázison végigpróbálva: a vizsgázó task részei (ügynökként), a szerep ellenőrzése, a vizsga rögzítése szempontokkal, utána a folyamat gyakorlati része sikeres. Bejelentkezve nem néztem meg.

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: a gyakorlati vizsga rögzítés után nem módosítható (új vizsga rögzíthető); a végeredményt a vizsgáztató adja, a szempontok eredményétől függetlenül.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 8. lépés: kibocsátás – „kibocsátható” jelzés, jóváhagyás, a képzési rekord létrehozása.
