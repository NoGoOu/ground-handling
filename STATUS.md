# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 30. · CLAUDE.md verzió: 31*

## Mi készült el

- **A 9. mérföldkő (létszámigény) kész, a 8. mérföldkő utómunkájával együtt.**
- 7. lépés: a seed demo napján teszt őrzi, hogy van hiányos sáv (csúcs 16:15-kor 4 fő, beosztás 1, hiány 3; délben fedezett; másnap van beosztás igény nélkül; utána nincs valós beosztás). A seedet nem kellett módosítani. README (9. mérföldkő, kipróbálás, felépítés); tiszta Docker-indítás rendben.
- 6. lépés (`cf0add9`): többnapos áttekintés, legfeljebb 31 nap, nap × negyedóra táblázat, naponként csúcs és legnagyobb hiány.
- 5. lépés (`945a1cc`): napi nézet – lépcsős grafikon és sávonkénti táblázat a `Létszámigény` oldalon.
- 4. lépés (`8602a2d`): adatréteg (a nappal átfedő ablakok, a valós réteg) és a „Létszámigény megtekintése” jogosultság.
- 3. lépés (`2def19f`): beosztás és hiány. 2. lépés (`8fda5cb`): a nap sávjai óraátállítással, a sáv csúcsa feladattípusonként és összesen.
- 1. lépés (`4ffa147`, `24bf6f3`): késéskód-dokumentum légitársaságonként, megnyitás a járatról, az alapértelmezett tábla IATA-leírásai, minta-PDF a demo légitársasághoz.

## Állapot

- Utolsó commit: `feat: guard the short bands of the demo day` (ez a commit; előtte `cf0add9`)
- Tesztek: `npm test` → 689 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres, figyelmeztetés nélkül
- Tiszta Docker-indítás: 17 migráció, seed, a minta-PDF a kötetben, a három szerepkör megkapta az új jogosultságot.
- A felületet bejelentkezve nem néztem meg (jelszót nem írok be): a számítást tesztek és adatbázis-ellenőrzés, a nézeteket a demo adatok statikus renderelése igazolja; belépés nélkül az új oldalak és a letöltési útvonalak a belépéshez irányítanak.

## Eltérések a CLAUDE.md-től

- Nincs. A jóváhagyott döntések (felvehetők a szabályok közé): a közös kódtábla helyben nyílik le, a légitársaság PDF-je új lapon; minden task beleszámít az igénybe, státusztól függetlenül; valós beosztás nélküli napon az igény látszik, hiány nem jelölődik; az áttekintés oszlopai a helyi óra negyedórái (tavasszal üres cellák, ősszel a nagyobb igény és a nagyobb hiány, megjelölve); az áttekintés alapból mától egy hét, a 31 napnál hosszabb időszakot elutasítja; a beosztásba mindenki beleszámít, akinek a valós rétegben operatív része van.
- Pontosítások: a késéskód-dokumentumot az is megnyithatja, aki járatot kezel vagy a dokumentumokat feltölti; a nappal átfedő ablakokhoz az előző és a következő nap járatlistája is betöltődik (a tervezőével azonos feltevés: egy ablak legfeljebb a szomszédos napra nyúlik át).

## Kérdések a tervezéshez

- A még nem publikált napokon az igényt össze kell-e vetni a tervezet réteggel (most csak a valós réteg számít)?
- Változatlanul nyitott a 8. mérföldkőből: a `PAD`, `CRW`, `DHC`, `TB`, a CPM `4/1` és a `.TW`, az `XOM` és az `XCS` jelentése; a SITA-átjáró fajtája; slottörlés és a késési (ED) MVT mintája.

## Következő lépés

- A tervezés döntése szerint.
