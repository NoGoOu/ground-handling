# Állapot – Ground Handling App

*Frissítve: 2026. szeptember 28. · CLAUDE.md verzió: 29*

## Mi készült el

- **A 8. mérföldkő (üzenetek bővítése) kész.**
- 7. lépés: seed – a szeptember 27-i minták a demo járatokra (ZZ1101 érkezés: Lufthansa LDM, CPM, PSM, AA; ZZ1204 IST: Turkish PSM és PTM; ZZ1102: célállomási COR AA), SAM + SRM a ZZ1306-ra, SAM a ZZ1408-ra (slot-figyelmeztetéssel), célállomások a demo indulásokon, repülőtér-tábla, 81 és 82 késéskód; README; tiszta Docker-indítás rendben.
- 1–6. lépés: szétválasztás (COR, -TITLE; a csomag kilenc üzenetre bomlik); Lufthansa LDM/CPM figyelmeztetés nélkül, SI szabad szöveg, ellenőrzések a törzsből; PSM és PTM csak darabszámokkal (teszt: név sehova nem kerül); érkezési és korrekciós MVT visszaolvasási tesztekkel, bejövő korrekció, célállomási AA; SAM/SRM, repülőtér-tábla, párosítás, „Slot hh:mm”, figyelmeztetés, felajánlások; infografika legfelül az SI-vel.

## Állapot

- Utolsó commit: `3985a52` – feat: put the SI on top of the infographic, with positions, PSM, PTM and slot (a 7. lépés commitja ezt követi)
- Tesztek: `npm test` → 610 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A felületet belépés nélkül nem néztem meg; az adatréteget adatbázison, az infografikát statikus rendereléssel ellenőriztem.

## Eltérések a CLAUDE.md-től

- Nincs. A jóváhagyott döntések (felvehetők a szabályok közé): a 7. mérföldkő SI-feldolgozása megszűnt (LDM-bontás, CPM-súlyok, TOW-ellenőrzés; a rájuk épülő régi tesztek igazítva); a `Q` + egy karakter kontúr, a magában álló `Q` sürgős cargo; a PSM/PTM helyén a darabszámok szöveges alakja, boríték és eredeti hash nélkül, olvashatatlan sorról csak darabszám; más slot-TITLE nyersen, hatás nélkül; a slot-párosítás a járat célállomását kéri (enélkül csak kézzel); az IFPLID a járat indulási részén; a slot-figyelmeztetés a task nézetben és a napi listán, az elsődleges task indulási horgonyával; felajánlás az ETD-hez és a késéskódhoz (perc: cél off-block − STD); a korrekció a küldött MVT kártyájáról; az érkezési MVT-t az érkezési ügynök vagy a járatkezelő küldi, ATA kell hozzá; repülőtér nem törölhető. Megvalósításban: a célállomási AA saját fajta (`AA_DEST`); a korrekcióból jött ATD/ATA „COR” jelöléssel kerül a járatnaplóba.

## Kérdések a tervezéshez

- A `PAD`, `CRW`, `DHC`, `TB`, a CPM `4/1` és a `.TW` jelentése; az `XOM` és az `XCS` pontos jelentése.
- A 36, 68, 81, 82, 93 késéskód leírása; a SITA-átjáró fajtája; slottörlés és a késési (ED) MVT mintája.

## Következő lépés

- A tervezés döntése szerint.
