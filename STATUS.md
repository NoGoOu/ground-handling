# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 35*

## Mi készült el

- **A 10. mérföldkő utómunkája kész: kizáró szempontok a gyakorlati vizsgán.**
  - A gyakorlati szempont „kizáró” jelölést kaphat (`Képzések → Vizsgák`, a képzés oldalán).
  - Ha egy kizáró szempont „nem felelt meg”, a végeredmény automatikusan sikertelen: az űrlapon a végeredmény sikertelenre áll és nem módosítható, a szerver pedig az űrlapról érkező végeredményt figyelmen kívül hagyja. Ha minden kizáró szempont megfelelt, a végeredményt a vizsgáztató adja, mint eddig.
  - A vizsga elmenti a szempontok akkori kizáró jelölését; a folyamat oldalán a kizáró szempontok jelölve, és kiírva, ha a végeredmény emiatt sikertelen. A korábbi vizsgák jelölés nélkül változatlanul látszanak.
  - Tesztek (`lib/exams/practical.test.ts`, az űrlap ellenőrzése, a seed); seed: a „Biztonságos munkavégzés az előtéren” kizáró; README.

## Állapot

- Utolsó commit: `feat: fail the practical exam on a knock-out criterion` (ez a commit; előtte `ff95eaa`)
- Tesztek: `npm test` → 757 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Bejelentkezve nem néztem meg; a döntést a szerver és az űrlap ugyanazzal a tiszta függvénnyel hozza.

## Eltérések a CLAUDE.md-től

- Nincs. A jóváhagyott döntések: a kizáró jelölés változása csak a később rögzített vizsgákra hat; inaktív szempont új vizsgába nem kerül.

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 11. mérföldkő (földi eszközök és hibajegy): a terv jóváhagyásra vár.
