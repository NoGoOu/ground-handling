# Állapot – Ground Handling App

*Frissítve: 2026. október 1. · CLAUDE.md verzió: 35*

## Mi készült el

- **11. mérföldkő kész** (földi eszközök és hibajegy), a 8. lépéssel:
  - Seed: Műszaki felhasználó (`muszaki`, Műszaki Márton); négy eszköztípus (Pushback, Szalagkocsi, Utasbusz, Utaslépcső) a CLAUDE.md alapmezőivel; hét eszköz, a betöltés napjához igazított határidőkkel, így minden állapot látszik (érvényes, hamarosan lejár, lejárt, nincs megadva; elért és nem elért üzemóra), egy kivont busz (a lejáró listán nem szerepel), egy változásnapló-sor és egy minta szervizlap (PDF). Három hibajegy az adatfüggvényeken át: nyitott (STR-01), folyamatban, üzemképtelenre állítva, megjegyzéssel (PB-02), lezárva, javítva, az eszköz visszaállítva (BUS-01); az idők a múltba tolva.
  - Seed-tesztek: minden határidő- és számlálóállapot, mindkét lejáró csoport, a három jegyállapot, az idők sorrendje.
  - README: a 11. mérföldkő leírása, kipróbálási útmutató, a `muszaki` felhasználó, a `lib/equipment/` sor, az `uploads` kötet tartalma.
- Korábbi lépések: 7. (`3ef01c4`) lejáró határidők, menüjelzés; 6. (`9a59d79`) jegykezelés; 5. (`760f0a9`) jelentés telefonról; 4. (`30588e6`) eszközök; 3. (`59412d9`) típusok; 2. (`b34a0a3`) tiszta függvények; 1. (`cceb047`) adatmodell. Előtte: a 10. mérföldkő utómunkája, kizáró szempontok (`3c2069f`).

## Állapot

- Utolsó commit: `feat: seed ground equipment and faults, document milestone 11` (ez a commit; előtte `3ef01c4`)
- Tesztek: `npm test` → 787 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- Tiszta indítás (`docker compose down -v`, `up --build`): 20 migráció, a seed lefut (8 felhasználó, 4 típus, 7 eszköz, 20 érték, 1 dokumentum, 3 jegy), a belépő oldal 200, a védett oldalak a belépésre irányítanak.
- A felületet bejelentkezve nem néztem meg; az adatutakat adatbázison ellenőriztem.

## Eltérések a CLAUDE.md-től

- Nincs. Megvalósításban: jegyenként összesen legfeljebb 25 MB fotó (az alkalmazás kéréskorlátja miatt); a menüben a nyitott jegyek száma oldalbetöltéskor és minden műveletnél frissül, nem élőben.

## Kérdések a tervezéshez

- Lezárt jegyhez írhat-e még megjegyzést a Műszaki? Most igen (pl. utólagos alkatrész-információ); a jegy nem nyílik újra.

## Következő lépés

- A 11. mérföldkő lezárása a CLAUDE.md-ben (a jóváhagyott 1–7. döntés szabályként), és a következő mérföldkő terve.
