# Terv: a kód hivatkozásainak átírása az új leírásokra

**Állapot:** ez az első teendő. Csak megjegyzések és dokumentáció változik, a működés nem; a tesztek, a tsc és a lint zöldek maradnak. Ha kész, ez a fájl törlődik.

2026. november 11-én a leírás átrendeződött az „egy tény, egy hely” elv szerint (`CLAUDE.md`): a működés a `docs/spec/` fájljaiban van témánként, a `CLAUDE.md` rövid lett, a mérföldkő-szakaszok és a számozott „További eldöntött szabályok” megszűntek. A kód megjegyzései még a régi helyekre mutatnak (kb. 540 hivatkozás, kb. 250 fájlban).

## Mit kell átírni

| Régi hivatkozás a megjegyzésben | Új hivatkozás |
|---|---|
| `CLAUDE.md`, „Időszámítási szabályok”; `rule 1` … `rule 11`, ha az időszámítási szabályt jelenti | `docs/spec/jaratok.md`, „Időszámítási szabályok”; `time rule N` |
| `CLAUDE.md`, 1. mérföldkő (MVP); „Első sablon”; „Késés és törlés”; „Lezárt task pillanatképe”; 5. mérföldkő | `docs/spec/jaratok.md` |
| `CLAUDE.md`, „Szerepkörök”, „Jogosultsági rendszer” | `docs/spec/jogosultsag.md` |
| `CLAUDE.md`, 2. mérföldkő és szakaszai („Beosztás rétegei”, „Beosztás felülete”, „Nem operatív részek blokkja”, „Sávos idősoros nézet”, „Kiosztás és ütközés”); 12. mérföldkő („Tartalom” stb.) | `docs/spec/beosztas.md` |
| `CLAUDE.md`, 3. mérföldkő; az Ikarus-import szakaszai („A mentés formátuma” stb.); `docs/schedule-import.md` | `docs/spec/jaratrend-import.md` |
| `CLAUDE.md`, 4. mérföldkő és szakaszai („Folyamat”, „Pozíció és műszak”, „Mutatók”, „Tervezési beállítások”, „A terv”, „Nevek és tervezet”); a 6. mérföldkő „Tervező” szakasza | `docs/spec/tervezo.md` |
| `CLAUDE.md`, 6. mérföldkő („Fájlok” stb.); 10. mérföldkő | `docs/spec/kepzes.md` |
| `CLAUDE.md`, 7. és 8. mérföldkő | `docs/spec/uzenetek.md` |
| `docs/messages.md` | `docs/spec/uzenet-formatumok.md` |
| `CLAUDE.md`, 9. mérföldkő | `docs/spec/letszamigeny.md` |
| `CLAUDE.md`, 11. mérföldkő | `docs/spec/eszkozok.md` |
| `CLAUDE.md`, 13. mérföldkő (az utómunkával) | `docs/spec/uzemeltetes.md`; az ügynök nézet gyorsítása: `docs/spec/jaratok.md`, „Nézetek” |
| `CLAUDE.md`, 14. mérföldkő | `docs/tervek/14-tobb-allomas.md` |

A számozott „További eldöntött szabályok” megszűntek, a szövegük a témájuk leírásába került. A kódban használt számok új helye:

| Régi szám | Hol van most |
|---|---|
| 1 (napi járatlista), 9 (ügynök nézet időkerete) | `docs/spec/jaratok.md`, „Nézetek” |
| 2 (visszanyitás), 4 (sablon szerkesztése) | `docs/spec/jaratok.md`, „Sablon és mérföldkövek” |
| 3 (rögzítés törlése), 5 (hiányzó kötelező mérföldkő), 10 („Most” gomb) | `docs/spec/jaratok.md`, „Task, státusz és rögzítés” |
| 6 (járat űrlap), 42 (kézzel felvett járat üzemnapja) | `docs/spec/jaratok.md`, „Járat” |
| 7 (eltérés-küszöbök) | `docs/spec/jaratok.md`, 5. időszámítási szabály |
| 8 (jelszó), 12 (ügynök = csapattag) | `docs/spec/jogosultsag.md` |
| 11 (törlés) | `docs/spec/jaratok.md`, „Admin” |
| 15 (blokk) | `docs/spec/beosztas.md`, „Nem operatív részek blokkja” |
| 17 (törölt rész) | `docs/spec/jaratok.md`, „Késés és törlés” |
| 30 (járatszintű megjelenítés) | `docs/spec/jaratok.md`, „Feladattípusok” |
| 33 (inaktív jogosítás) | `docs/spec/kepzes.md`, „Jogosítás, képzés, képzési rekord” |
| 39 (tervező és jogosítások) | `docs/spec/tervezo.md`, „Jogosítások a tervezőben” |
| 51 (időpont napjának feloldása), 53 (CPM `.TW`) | `docs/spec/uzenet-formatumok.md` |

Az 1–11. szám kétféle listát jelenthetett (időszámítási szabály vagy eldöntött szabály): a megjegyzés környezete dönti el, melyik. Ezután a kódban `time rule N` csak időszámítási szabályt jelent; minden más hivatkozás fájl és szakasz.

## Lépésterv

1. A megjegyzések átírása a fenti táblázatok szerint, a kódban, a tesztekben, a szkriptekben, a migrációk megjegyzéseiben és a sémában. A megjegyzés a leírásra hivatkozik (fájl és szakasz), a szabályt nem ismétli meg. Ellenőrzés: a repóban a `docs/spec/` és a `docs/tervek/` fájljain, a `CLAUDE.md`-n és a `STATUS.md`-n kívül ne maradjon „N. mérföldkő” alakú, `docs/messages.md`-re vagy `docs/schedule-import.md`-re mutató hivatkozás (a „mérföldkő” mint a forduló időpontja természetesen marad)
2. README: a „Mit tud” rész legyen egy képernyőnyi lista, amely a `docs/spec/` fájljaira mutat (a szabályokat ne ismételje); a telepítés, az indítás, az éles üzemeltetés és a használati útmutatók maradnak. A „Felépítés” rész a `docs/` új szerkezetét mutassa
3. Alapértékek egy helyen: ahol egy beállítás alapértéke a sémában (`@default`) és a kódban is szerepel (pl. `lib/settings.ts`, `lib/planning/settings.ts`), maradjon egy forrás, a másik onnan vegye
4. STATUS.md; ennek a fájlnak a törlése
