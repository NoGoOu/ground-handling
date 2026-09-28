# Üzenetformátumok – Ground Handling App

*Verzió: 5 · 2026. szeptember 28.*

Referencia a 7. és a 8. mérföldkőhöz (üzenetek fogadása, feldolgozása és előállítása), a CLAUDE.md ezekre a szakaszokra hivatkozik. A formátumok a projekt gazdájának gyakorlatából és valós mintákból származnak. Ha a gyakorlatban új változat bukkan fel, ide kerül, és a mintájából tesztadat lesz.

## Általános szabályok

- Az üzenet első sora a típus (MVT, LDM, CPM, UCM, PSM, PTM), a második a fejléc: `járat/dátum.lajstrom`, utána típusonként eltérő mezők. A PSM és a PTM fejléce eltér (lásd ott).
- **Korrekció:** a típussor előtti külön `COR` sor jelzi (pl. `COR` / `MVT` / …). A `COR` az utána következő üzenethez tartozik.
- Az Eurocontrol slotüzenetei (SAM, SRM) más családba tartoznak: ADEXP formátum, `-TITLE` sorral kezdődnek (lásd „Slotüzenetek”).
- Minden idő UTC.
- A fejléc dátuma többnyire csak a hónap napja (`/16`), de előfordul teljes dátum is (`/19SEP26`). **A fejléc dátuma a járat menetrendi napja (üzemnapja)**, akkor is, ha a járat napokat késik. A dátum feloldását lásd a „Párosítás és a járat része” szakaszban.
- A „nincs” jelölése változó: `/N`, `/NIL`, `.NIL`.
- A mezők sorrendje rendszerenként eltérhet (lásd CPM), ezért a mezőket mintázat alapján kell felismerni (állomáskód: 3 betű, súly: szám, ULD-azonosító: lásd lent), nem csak a pozíciójuk alapján.
- A SI (supplementary information, szabad szöveg) opcionális, lehet üres is, és több sorra is kiterjedhet. **Üzemi utasítást is hordozhat**, csillagsorok közé keretezve (pl. „TAILTIPPING CRITICAL AIRCRAFT DO NOT START UNLOADING OF THE FORWARD HOLD BEFORE DEBOARDING HAS FINISHED.”): ezt kiemelve kell megjeleníteni, nem feldolgozási figyelmeztetésként. A CPM végén `CPM END` állhat. Sorvégi szóközök és üres sorok előfordulnak.
- A feldolgozás hibatűrő: az ismeretlen sor figyelmeztetést ad, a többi feldolgozás folytatódik. A nyers szöveg mindig megmarad, kivéve a PSM-et és a PTM-et, mert azok neveket tartalmaznak (lásd ott).
- Üzenetek hiányozhatnak vagy hiányosak lehetnek; ez nem akadályozhatja a többi adat megjelenítését.

## Kódok

- **Rakománykategória:** B poggyász (BC business, BY economy), C cargo, M posta, E equipment (társasági anyag), X üres ULD, D a személyzet poggyásza (crew bag), Q sürgős cargo („quick”, Lufthansa-specifikus).
- **Szabad hely:** a kategória utáni számjegy (pl. `BY0`, `BY1`, `BC1`) megadja, hány negyed szabad a konténerben; kézi rakodású (bulk) pozíciónál ugyanezt a `VR` kód jelzi (pl. `VR1`, `VR3`).
- **Különleges kódok a mintákban:** ELD üres ULD-halom (empty ULD stack), FKT flight kit, ELI lítiumion-akkumulátor, ELM lítiumfém-akkumulátor, PER romlandó áru, BIG túlméretes rakomány; XOM és XCS Lufthansa-specifikus cargokódok (a Q-val együtt).
- **DAA** (delivery at the aircraft): a gép ajtajához kiadott tétel, általában babakocsi vagy tolószék. Alakja: `DAA/pozíció/darab/cél//leírás`, pl. `DAA/52/2/BUD//2 STROLLER.` = az 52-es pozícióból 2 darab, két babakocsi. Az érkezési ügynöknek kiemelten kell látnia.
- **ULD-azonosító:** típus (3 betű) + sorszám + tulajdonos kódja, pl. `PAG72809AGH` = PAG / 72809 / AGH.
- **ULD-halom:** az üres raklapokat egymásra rakják. A CPM-ben csak a hordozó (base) raklap szerepel, ELD kóddal, a teljes halom súlyával. Az UCM-ben a hordozó E, a rajta lévők X.

## MVT (mozgásüzenet)

- Fejléc: `járat/nap.lajstrom.állomás`
- Indulás: `AD ddhhmm/ddhhmm` = off-block / felszállás. **Az off-block az ATD.**
- Várható érkezés: `EA [dd]hhmm CÉL` (a nap elmaradhat).
- Érkezés: `AA ddhhmm/ddhhmm` = földet érés / on-block, pl. `AA271110/271114`; **az on-block az ATA.**
- Ha egy BUD-ról induló járat célállomása küld `AA` sort (pl. `TK1034/26.TCJSO.IST` / `AA261421/261429`), az a mi indulási részünk célállomási érkezése: tájékoztató adat, a járat idejét nem változtatja.
- Késés: `DLkód/kód/iiii/iiii` = késéskódok és időtartamuk (óra, perc). A kódok jelentése kódtáblából jön.
- SI: szabad szöveges indoklás.
- A BUD-ról induló és a BUD-ra érkező járatok MVT-jét a BUD-i handling küldi, ezért az alkalmazás elő is állítja őket (lásd „MVT előállítása”).
- A BUD-ra érkező járat ETA-ját az indulási állomás MVT-jének EA sora adja.
- **Ellenőrzés:** a késések összege = ATD − STD. Ha nem egyezik, figyelmeztetés.

## LDM (terhelési üzenet)

- Fejléc: `járat/nap.lajstrom.konfiguráció.személyzet`, pl. `Y150.2/3` = 150 turistaosztályú ülés, 2 fő a pilótafülkében, 3 fő a kabinban; teherjáratnál `0Y`. Több osztálynál a konfiguráció osztályonként: `C20M138` = 20 business és 138 economy ülés.
- Célállomás sor: `-CÉL.utasok.T összesen[.MD főfedélzet].raktér/súly….PAX/osztályonként.PAD/…`
  - utasok: férfi/nő/gyerek/infant, pl. `82/52/0/0`
  - `T`: az összes rakomány kg-ban; `MD`: főfedélzet (teherjárat); `1/50` = 1-es raktér 50 kg, bruttóban (a konténerek önsúlyával)
  - Lufthansa-változat: az utasbontás után előtag nélkül áll a főfedélzet súlya, pl. `-BUD.96/48/2/1.0.T3336.1/1511.3/1003.4/588.5/234.PAX/12/134` = 96 férfi, 48 nő, 2 gyerek, 1 infant; főfedélzet 0 kg; összesen 3336 kg; rakterenként 1511, 1003, 588, 234 kg; utasok osztályonként 12 és 134
  - `PAX/…`: az ülést foglaló utasok osztályonként, a konfiguráció sorrendjében; **az infant nem számít bele**
  - `.JMP/0`: jump seat; `.CRW/0` és `.PAD/0/3` (osztályonként): a jelentésük megerősítendő
- Különleges tételek: `.ELD/pozíció/súly`, `.FKT/raktér/súly`.
- SI: kategóriánkénti bontás (`C/0.E/1983.M/0`) vagy poggyász (`BP/57` darab, `B/825` kg, `TB/2` valószínűleg transzfer poggyász, megerősítendő).
- SI, Lufthansa-változat, soronként felismerendő elemek:
  - `DAA/…` (lásd Kódok);
  - csillagsorok közé keretezett üzemi utasítás;
  - célállomásonkénti nettó bontás: `BUD C 327 M 0 B 143/ 2384 O 110 T 0` = cargo 327 kg, posta 0, poggyász 143 darab / 2384 kg, egyéb (other) 110 kg, tranzit 0 (a szóközök száma változó);
  - `CHECKED BAGGAGE PIECES BUD 1/Y/57 3/Y/50 4/C/22 5/C/3/Y/11` = feladott poggyász darabszáma rakterenként és osztályonként (egy raktérnél több osztály is lehet);
  - `DHC/0/0`: a jelentése megerősítendő.
- **Ellenőrzés:** főfedélzet + rakterek = T; férfi + nő + gyerek = a PAX osztályonkénti összege (az infant nélkül); a nettó bontás poggyásza egyezik a CHECKED BAGGAGE PIECES összegével.
- A nettó bontás és a T különbsége a konténerek önsúlya (a Lufthansa-mintán 3336 − 2821 = 515 kg, pontosan a hét konténer önsúlya). Ezt nem ellenőrizzük, de az eltérés így magyarázható.

## CPM (rakodási üzenet)

- Fejléc-változatok: `P75535/16.URNPA.1983.BUD` (összsúllyal és állomással), `CZ2557/19SEP26.B2041.4/1.CANBUD` (teljes dátum, útvonal; a `4/1` jelentése megerősítendő), `LH1338/27.DAIQT` (se összsúly, se állomás: a részt a járatszám dönti el).
- Célállomásonkénti összesítés: `.BUD/92404`, `.TW/92404`.
- Szakaszok (szélestörzsű, teherszállító): `M/D RIGHT SIDE`, `M/D LEFT SIDE`, `M/D CENTER`, `L/D …`.
- Pozíciósor, két látott változat (a súly és a cél sorrendje eltér!):
  - `-POZ/ULD/súly/cél/kontúr/kategória[.kód]`, pl. `-GR/PMC45245CZ/4765/BUD/Q5/C.ELI`
  - `-POZ/ULD/cél/súly/kategória[.kód]`, pl. `-A9/PAG72809AGH/OSR/335/E.ELD`, `-11/AKH42390LH/BUD/565/BY0` (a kategória utáni számjegy a szabad negyedek száma)
- A pozíció súlya bruttó (a konténer önsúlyával).
- Bulk: `-BLK/108/BUD/C` vagy raktérszámmal `-1/OSR/50/E.FKT` (itt is eltér a sorrend). ULD nélküli pozíció szabad hellyel: `-51/BUD/30/D.VR1`.
- **Egy pozíción több tétel:** `-52/BUD/47/BC/187/BY.VR3` = az 52-es pozíción 47 kg BC és 187 kg BY poggyász, 3 negyed szabad.
- Üres pozíció: `-A1/N`, `-2/NIL`, `-11P.NIL`.
- SI: súlyadatok (ZFW, TOW, index, súlypont, stab trim, üzemanyag).
- SI, Lufthansa-változat: az LDM SI-jének elemei (DAA, keretezett utasítás, nettó bontás), valamint:
  - `LOAD IN CPTS 0/0 1/1511 3/1003 4/588 5/234` = rakomány rakterenként (a 0 a főfedélzet);
  - poggyász pozíciónként: `B11/BUD/BY/29/490` = a 11-es pozícióban BY poggyász, 29 darab, nettó 490 kg. A szóközzel kezdődő `   /BUD/BY/11/187` sor az előző pozíció (itt a 52-es) további tétele.
- **Ellenőrzés:** a pozíciók összege = összsúly; TOW = ZFW + felszállási üzemanyag; a rakterek és a főfedélzet súlya egyezik az LDM-mel.
- **Ellenőrzés (ha van LOAD IN CPTS és B-sor):** a pozíciók raktérenkénti összege a személyzet poggyásza (D) nélkül = LOAD IN CPTS = az LDM rakterei; a B-sorok darabszáma és nettó súlya = az LDM nettó bontásának poggyásza; a B-sorok rakterenkénti darabszáma = CHECKED BAGGAGE PIECES.
- A D (crew bag) a gép üzemi tömegének része, ezért nem számít bele a rakománysúlyba.
- A Lufthansa-mintán a Q kategóriájú (sürgős) tétel nettó súlya (110 kg) az LDM nettó bontásában az O (other) alatt szerepel.

## UCM (ULD-mozgás)

- Fejléc: `járat/nap.lajstrom.állomás`, utána `IN` (érkező ULD-k, az állomás a honnan) vagy `OUT` (induló ULD-k, az állomás a hova).
- Tételek: `.ULD/állomás/kategória`, egy sorban több is.
- **Ellenőrzés (OUT):** az UCM E-s ULD-jei megegyeznek a CPM ELD-s pozícióinak ULD-jeivel; az X-es ULD-k nem szerepelnek a CPM-ben.
- Az IN és OUT üzenetekből a BUD-on lévő ULD-készlet követhető (későbbi lehetőség). Példa: a PAG72809AGH 12-én érkezett RMO-ból, 16-án ment tovább OSR-be.

## PSM (utasok különleges igényei)

- Fejléc: `járat/napHÓNAP indulóállomás PARTn`, pl. `LH1338/27SEP FRA PART1` vagy `TK1034/26SEP BUD PART1`. A dátum a nap és a hónap rövidítése, év nélkül.
- Célállomásonként egy blokk: `-BUD 1PAX / 1SSR`, utána kódonként és osztályonként a darabszám: `WCHR 001C 000M` = WCHR: business 1, economy 0.
- Utána osztályonként (`C CLASS 1PAX / 1SSR`, `M CLASS NIL`) az utasok: név, ülés, esetleg csatlakozó járat (pl. `TK0399Y26LED`), majd a kódjaik.
- Vége: `ENDPSM`; több részből álló üzenetnél a nem utolsó rész vége `ENDPARTn`.
- **Amit megtartunk:** célállomásonként, kódonként (pl. WCHR, WCHS) és osztályonként a darabszám. **Nevet, ülést és a nyers szöveget nem tároljuk**, a feldolgozási figyelmeztetésekbe sem kerülhet sor a szövegből.
- **Ellenőrzés:** a kódonkénti darabszámok összege = a blokk `nSSR` értéke.

## PTM (átszálló utasok)

- Fejléc: `járat/napHÓNAP útvonal PARTn`, pl. `TK1034/26SEP BUDIST PART2` (BUD-ról IST-be).
- Soronként: továbbjárat, célállomás, utasszám és osztály, poggyász darab és súly, név, pl. `TK0720 BOM 1Y 1B11K MINTA/A` = TK720 Bombay felé 1 economy utas, 1 poggyász 11 kg. A `0B0K` poggyász nélküli utas.
- Vége: `ENDPTM` (nem utolsó résznél `ENDPARTn`).
- **Amit megtartunk:** továbbjáratonként (járatszám és célállomás) és osztályonként az utasszám, a poggyász darabszáma és súlya. **Nevet és nyers szöveget nem tárolunk.**

## Slotüzenetek (Eurocontrol, ADEXP)

- SITA-n érkeznek, ugyanazon a fogadó API-n. Formájuk ADEXP: soronként `-KULCS érték`, az első sor `-TITLE`.
- `SAM` (slot allocation, slotkiosztás) és `SRM` (slot revision, slotmódosítás). Más `TITLE` (pl. slottörlés) felismerendő, de még nincs mintánk.
- Mezők:
  - `ARCID`: hívójel, pl. `RYR48VM`. **Nem azonos a járatszámmal** (FR…).
  - `IFPLID`: a repülési terv azonosítója; ugyanannak a járatnak a későbbi üzenetei ugyanezzel jönnek.
  - `ADEP`, `ADES`: indulási és célrepülőtér ICAO-kóddal (pl. `LHBP` = BUD, `LFOB` = BVA, `LGSA` = CHQ).
  - `EOBD`: dátum `ÉÉHHNN` alakban (`260927` = 2026. 09. 27.); `EOBT`: tervezett off-block, UTC.
  - `CTOT` (SAM) vagy `NEWCTOT` (SRM): a kiosztott felszállási idő (slot), UTC.
  - `TAXITIME`: gurulási idő `ÓÓPP` alakban (`0012` = 12 perc).
  - `REGUL`: szabályozás azonosítója, több is lehet.
  - `REGCAUSE`: az ok kódja és a hozzá tartozó IATA-késéskód, pl. `CE 81`, `SE 82`.
  - `TTO` és társai (útvonalpont, időpont, szint): nyersen megtartjuk.
- **Cél off-block** = CTOT − gurulási idő (a SAM-mintán 12:36 − 12 = 12:24, az SRM-mintán 13:00 − 12 = 12:48 UTC).
- Nem tartalmaz személyes adatot, a nyers szöveg megmarad.

## Fogadás és szétválasztás

A fogadó API, a kézi bemásolás és a jogosultságok leírása a CLAUDE.md 7. mérföldkő szakaszában van. Itt a szövegre vonatkozó szabályok:

- Egy beküldött szövegben több üzenet is lehet. Új üzenet ott kezdődik, ahol:
  - egy sor pontosan egy ismert típuskód (MVT, LDM, CPM, UCM, PSM, PTM; a lista bővíthető); ha közvetlenül előtte (üres sorokat nem számítva) egy `COR` sor áll, az is az új üzenethez tartozik, és korrekciót jelez;
  - vagy egy sor `-TITLE `-lal kezdődik (slotüzenet).
- Egy üzenet a következő üzenet kezdetéig tart. Ezért a PTM után következő slotüzenetek nem olvadhatnak bele a PTM-be.
- Az UCM `IN` és `OUT` sora az üzenet része, nem új üzenet. A `CPM END` a CPM végét jelzi.
- A típussor előtti sorokat (pl. Type B fejléc és cím, email szöveg, aláírás) a feldolgozó átugorja; a nyers szöveg ezekkel együtt megmarad.
- Nem támogatott típusnál a tartalmat nem tároljuk, csak a típust, a fejlécet (járat, dátum) és a beérkezés idejét naplózzuk, mert személyes adatot tartalmazhat. A PSM-ből és a PTM-ből csak a származtatott darabszámok maradnak meg.

## Párosítás és a járat része

- **Járatszám:** kétkarakteres légitársaság-kód, 1–4 számjegy, opcionálisan egy betű. A kódot a rendszerben lévő légitársaságok IATA-kódjai alapján választjuk le, pl. `P75535` = P7 5535.
- **Üzemnap:** a fejléc dátuma az adott szakasz üzemnapja, vagyis az indulás napja az indulóállomáson (a CLAUDE.md 20. eldöntött szabálya). Csak nap esetén a beérkezés idejéhez legközelebbi, azonos napú dátum.
- **A járat része:**
  - MVT: ha a fejléc állomása BUD és van `AD` sor, az indulási rész; ha a fejléc állomása BUD és van `AA` sor, az érkezési rész; ha a fejléc állomása más, és az `EA` sor célja BUD, az érkezési rész (ebből jön az ETA).
  - UCM: a fejléc állomása BUD; `IN` az érkezési, `OUT` az indulási rész.
  - LDM: ha a célállomás BUD, az érkezési rész; ha a járatszám egy BUD-ról induló járaté, az indulási rész.
  - CPM: a fejléc állomása vagy útvonala alapján (pl. `CANBUD`): ha BUD a cél, az érkezési, ha BUD az indulóállomás, az indulási rész. Ha a fejlécben nincs állomás (`LH1338/27.DAIQT`), a járatszám dönt: a BUD-ra érkező vagy a BUD-ról induló részhez tartozik.
  - MVT más állomásról `AA` sorral: ha a járatszám és az üzemnap egy BUD-ról induló részhez tartozik, ahhoz párosul, tájékoztatásként.
  - PSM: az indulóállomás és a célállomás-blokk dönt (FRA-ból, `-BUD` blokk: érkezési rész; BUD-ról: indulási rész). A dátum év nélküli: a beérkezéshez legközelebbi év.
  - PTM: az útvonal dönt (`BUDIST`: indulási rész; `…BUD`: érkezési rész).
  - Slotüzenet: először az `IFPLID` alapján (ha már van ugyanezzel párosított üzenet); különben a BUD-ról induló részek közül az, amelynek célállomása az `ADES` (ICAO→IATA megfeleltetés a repülőtér-táblából), üzemnapja az `EOBD`, és menetrendi vagy várható indulása legfeljebb 2 órára (helyőrző) van az `EOBT`-től. Pontosan egy jelölt kell, különben párosítatlan. Kézi hozzárendelés után az `IFPLID` a járathoz kötődik.
- Ha a járatszám és az üzemnap alapján egy járat sem, vagy több is szóba jön, az üzenet párosítatlan. A BUD-ot nem érintő üzenet is párosítatlan, „nem érinti BUD-ot” jelzéssel.
- **Lajstrom:** másodlagos. Ha a járatrészen nincs, az üzenet kitölti; ha eltér, figyelmeztetés (pl. gépcsere).
- **Példa:** az `ET3365/12.ETBAB.BUD` MVT 17-én érkezik, az üzemnap 12-e, tehát a 12-i ET 3365 indulási részéhez párosul, és az ATD 17-én 07:16 UTC.

## Verziók

- A verziókulcs: járatrész + típus + fajta. Fajta az MVT-nél: `AD` (indulás), `AA` (érkezés; más állomásról külön fajta), csak `EA` (várható érkezés más állomásról); az UCM-nél `IN` vagy `OUT`; az LDM-nél és a CPM-nél maga a típus; a PSM-nél és a PTM-nél a rész száma (`PART1`, `PART2`…), és a részek együtt adják az érvényes állapotot; a slotüzenetnél az `IFPLID` (a SRM a SAM új verziója).
- A `COR` jelölésű üzenet a korrekció: ugyanúgy új verzió, de a felületen „Korrekció” jelölést kap.
- Az azonos kulcsú, később beérkező üzenet új verzió; a korábbi megmarad, de a legfrissebb az érvényes.

## MVT előállítása

- Az indulási MVT a minták szerkezetét követi: fejléc (`járat/üzemnap.lajstrom.BUD`), `AD off-block/felszállás EA hhmm CÉL`, késésnél `DLkód/kód/iiii/iiii` (a minta szerint legfeljebb két kód; több kódnál figyelmeztetés), opcionálisan SI.
- Az érkezési MVT: fejléc (`járat/üzemnap.lajstrom.BUD`), `AA földetérés/on-block`, mindkettő `ddhhmm` alakban, pl. `AA271110/271114`.
- A korrekciós MVT: a javított MVT teljes szövege, előtte egy `COR` sorral.
- Az előállított szöveget a saját feldolgozónk visszaolvassa, és ugyanazokat az értékeket kell kapnia.

## Hiányzó minták és kérdések

- A várható indulást jelző (késési, `ED`) MVT, ha van ilyen.
- Az LDM `PAD`, `CRW`, `DHC` és `TB`, a CPM-fejléc `4/1` és a `.TW` sor jelentése. Addig nyersen látszanak.
- A Lufthansa XOM és XCS kódjának pontos jelentése.
- Slottörlés és más `TITLE`-ű slotüzenet mintája.
- A 36, 68, 93 késéskód leírása.
- A SITA-küldés átjárója: jelenleg milyen programmal vagy átjárón keresztül megy ki a Type B üzenet.

## Ellenőrzés a Lufthansa-mintán (tesztesetnek)

A 2026. szeptember 27-i LH1338 FRA–BUD LDM-je és CPM-je mindenben egyezik. A feldolgozónak ezeket az értékeket kell kapnia, figyelmeztetés nélkül:

| Ellenőrzés | Érték |
|---|---|
| férfi + nő + gyerek = PAX osztályonként | 96 + 48 + 2 = 146 = 12 + 134 (az 1 infant nélkül) |
| főfedélzet + rakterek = T | 0 + 1511 + 1003 + 588 + 234 = 3336 |
| CPM-pozíciók rakterenként, D nélkül = LOAD IN CPTS | 1: 565 + 550 + 396 = 1511; 3: 555 + 448 = 1003; 4: 409 + 179 = 588; 5: 47 + 187 = 234 (az 51-es pozíció 30 kg D-je nélkül) |
| B-sorok = nettó bontás poggyásza | 29 + 28 + 28 + 22 + 22 + 3 + 11 = 143 darab; 490 + 473 + 473 + 371 + 343 + 47 + 187 = 2384 kg |
| B-sorok rakterenként = CHECKED BAGGAGE PIECES | 1: Y 57; 3: Y 50; 4: C 22; 5: C 3 és Y 11 |
| PSM kódok = nSSR | WCHR: 1 = 1SSR |

A mostani (7. mérföldkő utáni) feldolgozó ezen a mintán téves eltérést jelez (146 helyett 147 utas; az 5-ös raktér 77 kg), ezek a 8. mérföldkőben javulnak.

## Ismert hibák a mintákban (tesztesetnek)

- **P7 5535/16:** az UCM-ben a PAG59334JG E és a PAG72809AGH X, a CPM szerint viszont a PAG72809AGH a hordozó raklap (A9). Az egyik üzenet elírás; az ellenőrzésnek jeleznie kell.
- **ET 3365/12:** a menetrendi nap 12-e, az off-block 17-én volt. A késéskódok összege 76 perc, ami nem fedi a teljes késést: hiányzik egy kód (pl. 93), vagy elírás. Az ellenőrzésnek jeleznie kell.

## Minták

Szó szerint, sorvégi szóközökkel együtt; ezek lesznek a feldolgozó első tesztesetei.

```
UCM
P75535/16.URNPA.BUD
OUT
.PAJ17653FF/OSR/E.PAG59336JG/OSR/X.PAG59333JG/OSR/X
.PAJ46028FF/OSR/X.PAJ40283FI/OSR/X.PAG59335JG/OSR/X
.PAJ42815FF/OSR/X.PAJ42647FF/OSR/X.PAJ22019FF/OSR/X
.PAG59334JG/OSR/E.PAG72809AGH/OSR/X.PKC39592FF/OSR/X 
SI
```

```
LDM
P75535/16.URNPA.0Y.2/1
-OSR.0/0/0/0.T1983.MD1305.1/50.2/0.3/351.4/277.PAX/0.PAD/0
.ELD/A9/335.ELD/A10/970.FKT/1/50.FKT/3/351.FKT/4/277
SI OSR C/0.E/1983.M/0
```

```
CPM
P75535/16.URNPA.1983.BUD
-A1/N
-A2/N
-A3/N
-A4/N
-A5/N
-A6/N
-A7/N
-A8/N
-A9/PAG72809AGH/OSR/335/E.ELD
-A10/PAJ17653FF/OSR/970/E.ELD
-A11/N
-P12/N
-1/OSR/50/E.FKT
-2/NIL
-3/OSR/351/E.FKT
-4/OSR/277/E.FKT
```

```
MVT
P75535/16.URNPA.BUD
AD162036/162049 EA162132 OSR
```

```
UCM
P71103/12.URNPA.BUD
IN
.PAG72801AGH/RMO/X.PAG72802AGH/RMO/X.PAG72803AGH/RMO/X
.PAG72804AGH/RMO/X.PAG72805AGH/RMO/X.PAG72806AGH/RMO/X
.PAG72807AGH/RMO/X.PAG72809AGH/RMO/X.PAG72815AGH/RMO/X
.PAG72816AGH/RMO/X.PAG72808AGH/RMO/X
SI
```

```
MVT
ET3365/12.ETBAB.BUD
AD170716/170735 EA1745 HKG
DL68/36/0040/0036
SI LATE ORDER OF CATERING
```

```
LDM
EW2783/03.DAGWJ.Y150.2/3
-STR.82/52/0/0.T825.4/825.PAX/134
SI STR BP/57.B/825.TB/2
```

```
CPM
CZ2557/19SEP26.B2041.4/1.CANBUD
.BUD/92404
.TW/92404
M/D RIGHT SIDE
-AR/PMC37259CZ/3255/BUD/Q4/C
-BR/PMC36410CZ/2544/BUD/Q5/C
-CR/PMC41831CZ/2341/BUD/Q5/C
-DR/PMC45025CZ/2487/BUD/Q5/C
-ER/PMC34983CZ/2832/BUD/Q5/C
-FR/PMC46983CZ/2822/BUD/Q5/C
-GR/PMC45245CZ/4765/BUD/Q5/C.ELI
-HR/PMC42275CZ/2965/BUD/Q5/C
-JR/PMC43433CZ/2481/BUD/Q5/C
-KR/PMC47867CZ/2182/BUD/Q5/C
-LR/PMC45091CZ/2651/BUD/Q5/C
-MR/PMC34041CZ/2824/BUD/Q5/C
-PR/PMC35083CZ/1829/BUD/Q4/C
M/D LEFT SIDE
-AL/PMC33076CZ/654/BUD/Q4/C
-BL/PMC44921CZ/1616/BUD/Q5/C
-CL/PMC34643CZ/2148/BUD/Q5/C
-DL/PMC34284CZ/3640/BUD/Q5/C.PER
-EL/PMC42459CZ/2825/BUD/Q5/C
-FL/PMC33715CZ/4988/BUD/Q5/C.ELI
-GL/PMC49699CZ/2779/BUD/Q5/C
-HL/PMC34144CZ/3360/BUD/Q5/C.ELI
-JL/PMC34823CZ/2845/BUD/Q5/C
-KL/PMC49595CZ/2170/BUD/Q5/C
-LL/PMC45264CZ/2402/BUD/Q5/C
-ML/PMC34337CZ/2561/BUD/Q5/C
-PL/PMC46252CZ/4044/BUD/Q4/C
M/D CENTER 
-R/PMC45821CZ/2320/BUD/Q6/C
L/D RIGHT SIDE
L/D LEFT SIDE
L/D CENTER
-11P.NIL
-12P.NIL
-13P/PMC48484CZ/945/BUD/QM/C.ELM
-21P/PMC45723CZ/1830/BUD/QM/C.ELM
-22P/PMC42629CZ/1948/BUD/QL/C
-23P/PMC43797CZ/3010/BUD/QM/C
-31P/PMC36893CZ/1965/BUD/QL/C
-33LR/FLA21075CZ/2655/BUD/QM/C.BIG
-41LR/FLA22020CZ/2653/BUD/QM/C.BIG
-41P.NIL
-42P/PMC46335CZ/2960/BUD/QL/C
-BLK/108/BUD/C
SI ALL WEIGHTS IN KG, ALL DIMENSIONS IN CM
SI ZFW=234408,ZF INDEX=41.46,ZF C.G.=26.71
SI TOW=346078,TO INDEX=35.67,TO C.G.=26.27
SI STAB TRIM=5.89
SI TAKE OFF FUEL 111670,TRIP FUEL 98206
CPM END
```

### Minták, 2026. szeptember 27. (a PSM-ben és a PTM-ben a nevek kicserélve)

Lufthansa érkezési MVT:

```
MVT
LH1338/27.DAIQT.BUD
AA271110/271114
```

Lufthansa LDM:

```
LDM
LH1338/27.DAIQT.C20M138.2/4
-BUD.96/48/2/1.0.T3336.1/1511.3/1003.4/588.5/234.PAX/12/134
.JMP/0.CRW/0.PAD/0/3
SI DAA/52/2/BUD//2 STROLLER.
***************************************************************
TAILTIPPING CRITICAL AIRCRAFT  DO NOT START UNLOADING OF THE
FORWARD HOLD BEFORE DEBOARDING HAS FINISHED.
***************************************************************
BUD C     327 M       0 B   143/   2384 O     110 T       0
CHECKED BAGGAGE PIECES BUD 1/Y/57 3/Y/50 4/C/22 5/C/3/Y/11
DHC/0/0
```

Lufthansa PSM (a név kicserélve):

```
PSM
LH1338/27SEP FRA PART1
-BUD 1PAX / 1SSR
WCHR 001C 000M
C CLASS 1PAX / 1SSR
1MINTA/ELEK  003C
WCHR
M CLASS NIL
ENDPSM
```

Lufthansa CPM:

```
CPM
LH1338/27.DAIQT
-11/AKH42390LH/BUD/565/BY0
-12/AKH77288LH/BUD/550/BY0
-13/AKH78608LH/BUD/396/C.XCS
-31/AKH43485LH/BUD/555/BY0
-32/AKH77201LH/BUD/448/BY1
-41/AKH73414LH/BUD/409/BC1
-42/AKH78364LH/BUD/179/Q.XOM
-51/BUD/30/D.VR1
-52/BUD/47/BC/187/BY.VR3
SI DAA/52/2/BUD//2 STROLLER.
***************************************************************
TAILTIPPING CRITICAL AIRCRAFT  DO NOT START UNLOADING OF THE
FORWARD HOLD BEFORE DEBOARDING HAS FINISHED.
***************************************************************
BUD C     327 M       0 B   143/   2384 O     110 T       0
LOAD IN CPTS 0/0 1/1511 3/1003 4/588 5/234
B11/BUD/BY/29/490
B12/BUD/BY/28/473
B31/BUD/BY/28/473
B32/BUD/BY/22/371
B41/BUD/BC/22/343
B52/BUD/BC/3/47
   /BUD/BY/11/187
```

Korrekciós MVT (célállomási érkezés):

```
COR
MVT
TK1034/26.TCJSO.IST
AA261421/261429
```

Turkish PSM (a név kicserélve):

```
PSM
TK1034/26SEP BUD PART1 
-IST 1PAX / 1SSR
WCHS 000F 000C 001Y
F CLASS NIL
C CLASS NIL
Y CLASS 1PAX / 1SSR
1TESZT/ANNA 27A
TK0399Y26LED
  WCHS
ENDPSM
```

Turkish PTM (a nevek kicserélve):

```
PTM
TK1034/26SEP BUDIST PART2
TK0720 BOM 1Y 1B11K MINTA/A
TK0720 BOM 1Y 0B0K MINTA/B
TK0730 CMB 1Y 1B19K MINTA/C
TK0730 CMB 1Y 1B17K MINTA/D
TK0738 SEZ 2Y 1B19K MINTA/E/F
TK0738 SEZ 2Y 2B31K MINTA/G/H
TK0758 DXB 1Y 1B24K MINTA/I
TK0758 DXB 2Y 2B46K MINTA/J/K
TK0760 DXB 1Y 1B13K MINTA/L
TK0812 AMM 1Y 1B23K MINTA/M
TK0812 AMM 1Y 1B14K MINTA/N
TK0868 AUH 2Y 2B32K MINTA/O/P
TK2174 ESB 1C 1B10K MINTA/Q
ENDPTM
```

Slotkiosztás (SAM):

```
-TITLE SAM
-ARCID RYR48VM
-IFPLID AA87995557
-ADEP LHBP
-ADES LFOB
-EOBD 260927
-EOBT 1220
-CTOT 1236
-REGUL YB5LL27A
-TTO -PTID IDOSA -TO 1359 -FL F342
-TAXITIME 0012
-REGCAUSE CE 81
```

Slotmódosítás (SRM):

```
-TITLE SRM
-ARCID RYR516
-IFPLID AA87996388
-ADEP LHBP
-ADES LGSA
-EOBD 260927
-EOBT 1245
-NEWCTOT 1300
-REGUL LGMW227
-REGUL LWUPP27M
-REGUL LGSAA27
-TTO -PTID MAKED -TO 1357 -FL F370
-TAXITIME 0012
-REGCAUSE SE 82
```
