# Terv: rögzítések – csak hozzáfűzés

**Állapot:** ezt építjük, a hivatkozások átírása után (`docs/tervek/hivatkozasok.md`), a szokásos terv-jóváhagyással. A projekt gazdájának döntése (2026. november 11.).

**Cél:** amit az ügynök egyszer rögzített, azt utólag senki ne tudja átírni. Javítani csak úgy lehet, hogy valaki új bejegyzést fűz a rögzítéshez; minden bejegyzésnél látszik, ki és mikor írta. Így a rögzítés egyetlen, megbízható forrás marad.

A mostani működés (`docs/spec/jaratok.md`, „Task, státusz és rögzítés”): taskonként és mérföldkövenként egy rögzítés van, amelynek az ideje utólag átírható, és csak az utolsó módosító látszik. Ez változik meg.

## Szabályok

- **Bejegyzés:** egy task egy mérföldkövének rögzítése bejegyzések sora. Egy bejegyzés: a tényleges idő (percre pontosan, 10. időszámítási szabály), megjegyzés (nem kötelező), ki és mikor írta, és hogy gyakornokként írta-e.
- **Nincs módosítás és nincs törlés:** a bejegyzés a mentése után nem változik. A kódban nincs olyan művelet, amely egy bejegyzést módosít vagy töröl; ezt teszt is biztosítja. (Nem változik, hogy a járat törlésével járó műveletek a járattal együtt a rögzítéseit is eltávolítják: az újraimportálás összevonása csak rögzítés nélküli járatot töröl, az Ikarus-import eltávolítása pedig csak fejlesztői módban fut.)
- **Hatályos érték:** a legutolsó bejegyzés ideje. Minden számítás ezt használja ott, ahol eddig a rögzített időt: eltérés, sorrend-ellenőrzés, az elsődleges task ATA/ATD-je mint a járat hatályos értéke, késés, a task automatikus IN_PROGRESS státusza (az első bejegyzéskor), az OJT-mutatók.
- **Hozzáfűzés:** új idő megadása, megjegyzéssel vagy anélkül. A jogosultsági szabály nem változik, csak javítás helyett hozzáfűzésre szól:
  - a rész ügynöke (és gyakornoka) ahhoz a rögzítéshez fűzhet hozzá, amelynek az első bejegyzését ő írta;
  - akinek a rögzítés jogosultsága csapat vagy összes hatókörű (alapból a műszakvezető és az admin), a hatókörén belül bármelyikhez;
  - a mentor a gyakornok rögzítéséhez;
  - a lezárt task rögzítéséhez is hozzá lehet fűzni, ugyanígy.
- **Megjelenítés** (task nézet és ügynök nézet): a mérföldkő sorában a hatályos érték látszik; ha több bejegyzés van, jelölve van, és a sor kinyitva időrendben mutatja mindet: idő, megjegyzés, ki és mikor írta (gyakornoknál jelölve). Az első bejegyzés az eredeti rögzítés.
- **„Most” gomb:** rögzítés után „Új érték”-re vált, amely megerősítést kér, hogy egy véletlen érintés ne fűzzön hozzá fölösleges bejegyzést.
- **ATA és ATD sora:** a rendszerből kapott érték mellett továbbra is látszik az ügynök rögzítése, a bejegyzéseivel együtt.
- **OJT:** a „gyakornok által rögzített mérföldkövek aránya” az első bejegyzés írója szerint számol; a mentor hozzáfűzése ezen nem változtat. A többi mutató a hatályos értékből számol.
- **Mire nem vonatkozik:** a késésrekordokra, a képzési rekordokra és az eszközök műszaki adataira; ezek szabálya nem változik (az eszközadatok változása eddig is naplózott).

## Adatmodell

- A rögzítés bejegyzései külön sorok (taskonként és mérföldkövenként több is lehet, időrendben). A megvalósítás módja a tervben dől el; a mostani „utolsó módosító” mezők megszűnnek.
- **Migráció:** minden meglévő rögzítésből egy bejegyzés lesz a mostani értékével; ha a rögzítést módosították, a bejegyzés írója és ideje az utolsó módosítóé, „korábbi, módosított rögzítés” megjegyzéssel (az eredeti érték nem állítható vissza). Éles adat még nincs, ez csak a demo és a fejlesztői adatokat érinti.

## Lépésterv

1. Adatmodell és migráció: bejegyzések; a meglévő rögzítések átvitele. A számítások a legutolsó bejegyzésből dolgoznak; a viselkedés a hozzáfűzésen kívül változatlan, a meglévő tesztek zöldek
2. Tiszta függvények és jogosultság: a hatályos érték, a hozzáfűzés jogosultsága (az első bejegyzés írója, hatókör, mentor, lezárt task); tesztek, köztük: nincs módosító és törlő művelet
3. Rögzítés és hozzáfűzés a szerveren; task nézet és ügynök nézet: a bejegyzések megjelenítése, „Új érték” megerősítéssel, megjegyzés
4. OJT-mutatók és a gyakornok jelölése a bejegyzéseken; seed (legalább egy rögzítés több bejegyzéssel, köztük egy megjegyzéssel)
5. README, STATUS.md; a STATUS.md jelezze, mit kell a `docs/spec/jaratok.md`-ben és a `docs/spec/kepzes.md`-ben átírni
