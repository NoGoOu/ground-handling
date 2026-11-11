# Ground Handling App

*Verzió: 48 · 2026. november 11.*

Nyílt forráskódú webalkalmazás repülőtéri földi kiszolgálás (ground handling) szervezésére. Minden járatfordulóhoz feladattípusonként egy task tartozik, benne mérföldkövekkel, amelyeknek van tervezett és tényleges időpontja. A mérföldkövek légitársaságonként testreszabható sablonokból jönnek. A hozzáférés szerepkör alapú. A projekt gazdája a földi kiszolgálásban dolgozik, a domain-szabályok az ő gyakorlatából jönnek, és az alkalmazást ő üzemelteti.

Ha a domain logika nem egyértelmű, kérdezz, ne találj ki új üzleti szabályt.

## Egy tény, egy hely

Minden tény egyetlen helyen van leírva; máshol csak hivatkozás áll rá.

| Mi | Egyetlen helye | Ki tartja karban |
|---|---|---|
| Hogyan működik a rendszer (üzleti szabályok, a megépült működés) | `docs/spec/`, témánként | tervezés |
| Ami még nem épült meg (tervek, lépéstervvel) | `docs/tervek/` | tervezés |
| Mi épül most, és mi jön utána | ez a fájl, „Ütemterv” | tervezés |
| Nyitott kérdések, helyőrzők, feltevések | `docs/nyitott-kerdesek.md` | tervezés |
| Hol tart az építés | `STATUS.md` | építés |
| Adatmodell | `prisma/schema.prisma` | építés |
| A jogosultságok listája | `lib/permissions/catalog.ts` | építés |
| A felület szövegei | `lib/messages/hu.ts` | építés |
| Telepítés, indítás, üzemeltetés, használat lépésről lépésre | `README.md` | építés |
| Mi mikor és miért változott | a git előzményei | – |

- A `docs/spec/` a mostani működést írja le, jelen időben. Nincs benne történet, mérföldkő-szám, és az sem, ami még csak terv.
- A `docs/tervek/` azt írja le, ami még nem épült meg. Amikor egy terv megépült, a működése a `docs/spec/`-be kerül (a tervezés írja át, a `STATUS.md` eltérései alapján), a tervfájl pedig törlődik.
- A kód megjegyzése a leírásra hivatkozik (fájl és szakasz), a szabályt nem ismétli meg. Egy érték (alapérték, korlát, állomáskód) a kódban is csak egy helyen szerepel.
- Ha a kód és a leírás eltér, az hiba: jelezd a `STATUS.md`-ben. A leírást a tervezés módosítja; az építés nem írja át csendben.
- Ez a fájl és a `docs/` a GitHubon érvényes; másolat máshol (pl. a Claude Project tudásbázisában) nincs.

## A leírások

| Fájl | Miről szól |
|---|---|
| `docs/spec/jaratok.md` | fogalmak, járat, sablon és mérföldkövek, feladattípusok, task és rögzítés, **időszámítási szabályok**, ügynök-foglaltság, késés és törlés, a járatos nézetek |
| `docs/spec/jogosultsag.md` | szerepkörök, jogosultsági rendszer, hatókör, felhasználók, csapatok |
| `docs/spec/beosztas.md` | a beosztás rétegei, műszakok és részeik, blokk, sávos nézet, kiosztás és ütközés, „Beosztásom”, naptár |
| `docs/spec/tervezo.md` | tervezői nézet: automatikus beosztás, pozíciók, a terv, kiosztás átvétele |
| `docs/spec/letszamigeny.md` | létszámigény 15 perces sávokban, összevetés a beosztással |
| `docs/spec/jaratrend-import.md` | járatrend-import fájlból; Ikarus-import (valós járatok helyi kipróbáláshoz) |
| `docs/spec/uzenetek.md` | üzenetek fogadása, hatásuk a járatra, infografika, késéskód, MVT előállítása és küldése, slot |
| `docs/spec/uzenet-formatumok.md` | az üzenetek szövege: formátumok, kódok, szétválasztás, párosítás, ellenőrzések, minták |
| `docs/spec/kepzes.md` | képzések, jogosítások, követelmények, e-vizsga, OJT, gyakorlati vizsga, kibocsátás |
| `docs/spec/eszkozok.md` | földi eszközök nyilvántartása, hibajegy |
| `docs/spec/uzemeltetes.md` | éles telepítés, biztonság, mentés és visszaállítás, frissítés, állapotfigyelés, terhelési próba |

Kód írása előtt olvasd el az érintett leírást. A leírások a mostani, egyállomásos működést (BUD, Europe/Budapest) írják le.

## Tech stack

- Next.js (App Router) + TypeScript
- PostgreSQL + Prisma
- Auth.js (felhasználónév/jelszó alapú belépés)
- Tailwind CSS
- Vitest a unit tesztekhez
- Docker Compose (app + adatbázis), hogy bárki egy paranccsal elindíthassa
- Külső AI API-t nem használunk
- Az útvonalszintű belépés- és jogosultság-ellenőrzés fájlja a Next.js 16-ban `proxy.ts` (a korábbi middleware helyett).
- A jogosultságot a szerver is ellenőrzi minden műveletnél, nem elég a felületen elrejteni.
- A számítások tiszta függvények, unit tesztekkel (`lib/turnaround.ts`, `lib/planning/`, `lib/staffing/`, `lib/telex/` stb.).

## Ütemterv

**Kész:** MVP (járatok, taskok, rögzítés); jogosultsági rendszer, beosztás, sávos nézet és kiosztás; járatrend-import; tervezői nézet; feladattípusok; képzések és jogosítások; üzenetek és slot; létszámigény; e-vizsga, OJT és kibocsátás; földi eszközök és hibajegy; ügynöki beosztásnézet és naptár; éles üzemeltetés (helyben kipróbálva, valódi szerveren még nem); Ikarus-import; a több állomás 1. lépése (az állomás az adatmodellben, minden adat a BUD-é).

**Most épül, ebben a sorrendben** (mindegyik a szokásos terv-jóváhagyással):

1. A kód hivatkozásainak átírása az új leírásokra: `docs/tervek/hivatkozasok.md`
2. Rögzítések – csak hozzáfűzés: `docs/tervek/rogzites-hozzafuzes.md`
3. 14. mérföldkő, a 2. lépéstől – több állomás egy cégen belül: `docs/tervek/14-tobb-allomas.md`
4. 15. mérföldkő – skálázás 3000 egyidejű felhasználóra: `docs/tervek/15-skalazas.md`

**Később (most ne építsd):**

- Több gép: az alkalmazás több szerveren, közös fájltárral (pl. S3-kompatibilis), és folyamatos működés (adatbázis-replika, automatikus átállás), ha a mentésből való visszaállítás már nem elég
- A járatidők forrásrendje: mezőnként rögzítve, melyik forrás a mérvadó (AODB, MVT, ügynök), és a tényleges idő forrásának tárolása (a döntés a `docs/nyitott-kerdesek.md`-ben vár)
- Személyre szabható elrendezés: az ügynök drag and droppal állítja be, mit lát és hogyan, felhasználónként mentve
- A lezárt taskok utólagos javításának külön jogosultsága
- A beosztás TRN részének összekötése egy konkrét képzéssel
- Földi eszközök: az eszköz hozzárendelése a taskhoz; emailes értesítés a hibajegyekről
- Naptár: a kiosztott taskok is a naptárban; értesítés a beosztás változásáról (email vagy push)
- E-vizsga: véletlen kérdéshúzás a kérdésbankból, képek a kérdésekben
- További slotüzenetek (pl. slottörlés), minta után
- Az SI elemeinek feldolgozása (DAA, célállomásonkénti nettó bontás, poggyászdarabszámok, LOAD IN CPTS, B-sorok), ha a minták alapján egységesíthető
- Email- és SITA-átjáró a bejövő üzenetekhez (a fogadó API-ra csatlakozik); a valós adatforrás (AODB) éles bekötése
- A BUD-on lévő ULD-készlet követése az UCM-ekből
- Járatinfó: a sablonban definiált egyedi mezők taskonként (pl. utaslétszám, különleges igények)
- Szolgáltatások rögzítése taskonként, időpontokkal
- Kimutatások légitársaságonként (kiszállítás és beszállítás hossza, földi idő, késések), a valós adatok után
- Több nyelv támogatása

## Állapotjelentés (`STATUS.md`)

A tervezés a Claude Projectben folyik, az építés itt, a repóban. A kettő között a repó gyökerében lévő `STATUS.md` tartja a kapcsolatot: a tervezés ebből tudja meg, hol tart a munka. Minden lépés (commit) után frissítsd, mindig felülírva, sosem bővítve, és maradjon egy oldalnál rövidebb. Szerkezete:

- **Fejléc:** a frissítés dátuma és a CLAUDE.md verziószáma.
- **Mi készült el:** az utolsó lépés vagy lépések, egy-egy sorban, a terv lépésszámával.
- **Állapot:** utolsó commit (rövid hash és üzenet), a tesztek eredménye, lint és build.
- **Eltérések a leírástól:** ha valamit másképp kellett megoldani, mint a `docs/tervek/` vagy a `docs/spec/` írja, mi és miért. Ezekből írja át a tervezés a leírást. Ha nincs ilyen: „nincs”.
- **Kérdések a tervezéshez:** domain- vagy szabálykérdés, amit magadtól nem dönthetsz el.
- **Következő lépés:** mi jön az ütemterv szerint.

## Munkamód

- **A kör:** a tervezés (Claude Project) dönt, átírja a leírást a repóban, és egy rövid feladatlappal zárul; az építés (Claude Code) megépíti, és frissíti a `STATUS.md`-t; a tervezés ebből és a repóból ellenőriz, majd a megépült működést a `docs/spec/`-be írja.
- Új funkció előtt röviden vázold a tervet, és várd meg a jóváhagyást.
- Kis lépésekben haladj: minden lépés után legyen futtatható állapot, commit, és frissített `STATUS.md`.
- Kódban, azonosítókban és commit üzenetekben angol nyelv; a felület szövegei magyarok, egy helyen összegyűjtve, hogy később fordíthatók legyenek.
- A már megépített működés nem változhat észrevétlenül: a meglévő tesztek zöldek maradnak.
- Valós adat (járatlista, járatszám, lajstrom, utasnév, a forrásrendszerek címe) és titok nem kerül a repóba, a tesztekbe és a naplóba; a tesztek kitalált mintákkal dolgoznak.
- Az adatintegritási kiegészítések (createdAt / updatedAt, egyedi kulcsok) és az űrlapok formátum-ellenőrzései (`lib/validation/`) a kódban élnek. Nem üzleti szabályok, módosításuk nem igényel leírás-változást.
- **Verziószám:** ennek a fájlnak a verziószáma a teljes leírásé (`CLAUDE.md`, `docs/spec/`, `docs/tervek/`, `docs/nyitott-kerdesek.md`): bármelyik módosításakor eggyel nő, a dátummal együtt.
- A Next.js-re vonatkozó szabályok (a `next dev` tartja karban, kód írása előtt olvasd el): @AGENTS.md
