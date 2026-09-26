# Üzenetformátumok – Ground Handling App

*Verzió: 4 · 2026. szeptember 26.*

Referencia a 7. mérföldkőhöz (üzenetek fogadása, feldolgozása és előállítása), a CLAUDE.md „7. mérföldkő” szakasza hivatkozik rá. A formátumok a projekt gazdájának gyakorlatából és valós mintákból származnak. Ha a gyakorlatban új változat bukkan fel, ide kerül, és a mintájából tesztadat lesz.

## Általános szabályok

- Az üzenet első sora a típus (MVT, LDM, CPM, UCM), a második a fejléc: `járat/dátum.lajstrom`, utána típusonként eltérő mezők.
- Minden idő UTC.
- A fejléc dátuma többnyire csak a hónap napja (`/16`), de előfordul teljes dátum is (`/19SEP26`). **A fejléc dátuma a járat menetrendi napja (üzemnapja)**, akkor is, ha a járat napokat késik. A dátum feloldását lásd a „Párosítás és a járat része” szakaszban.
- A „nincs” jelölése változó: `/N`, `/NIL`, `.NIL`.
- A mezők sorrendje rendszerenként eltérhet (lásd CPM), ezért a mezőket mintázat alapján kell felismerni (állomáskód: 3 betű, súly: szám, ULD-azonosító: lásd lent), nem csak a pozíciójuk alapján.
- A SI sor (szabad szöveg) opcionális, lehet üres is. A CPM végén `CPM END` állhat. Sorvégi szóközök és üres sorok előfordulnak.
- A feldolgozás hibatűrő: az ismeretlen sor figyelmeztetést ad, a többi feldolgozás folytatódik. A nyers szöveg mindig megmarad.
- Üzenetek hiányozhatnak vagy hiányosak lehetnek; ez nem akadályozhatja a többi adat megjelenítését.

## Kódok

- **Rakománykategória:** B poggyász, C cargo, M posta, E equipment (társasági anyag), X üres ULD.
- **Különleges kódok a mintákban:** ELD üres ULD-halom (empty ULD stack), FKT flight kit, ELI lítiumion-akkumulátor, ELM lítiumfém-akkumulátor, PER romlandó áru, BIG túlméretes rakomány.
- **ULD-azonosító:** típus (3 betű) + sorszám + tulajdonos kódja, pl. `PAG72809AGH` = PAG / 72809 / AGH.
- **ULD-halom:** az üres raklapokat egymásra rakják. A CPM-ben csak a hordozó (base) raklap szerepel, ELD kóddal, a teljes halom súlyával. Az UCM-ben a hordozó E, a rajta lévők X.

## MVT (mozgásüzenet)

- Fejléc: `járat/nap.lajstrom.állomás`
- Indulás: `AD ddhhmm/ddhhmm` = off-block / felszállás. **Az off-block az ATD.**
- Várható érkezés: `EA [dd]hhmm CÉL` (a nap elmaradhat).
- Érkezés: `AA …` = földet érés / on-block; **az on-block az ATA.** Mintát még be kell szerezni (lásd „Hiányzó minták”).
- Késés: `DLkód/kód/iiii/iiii` = késéskódok és időtartamuk (óra, perc). A kódok jelentése kódtáblából jön.
- SI: szabad szöveges indoklás.
- A BUD-ról induló és a BUD-ra érkező járatok MVT-jét a BUD-i handling küldi, ezért az alkalmazás elő is állítja őket (lásd „MVT előállítása”).
- A BUD-ra érkező járat ETA-ját az indulási állomás MVT-jének EA sora adja.
- **Ellenőrzés:** a késések összege = ATD − STD. Ha nem egyezik, figyelmeztetés.

## LDM (terhelési üzenet)

- Fejléc: `járat/nap.lajstrom.konfiguráció.személyzet`, pl. `Y150.2/3` = 150 turistaosztályú ülés, 2 fő a pilótafülkében, 3 fő a kabinban; teherjáratnál `0Y`.
- Célállomás sor: `-CÉL.utasok.T összesen[.MD főfedélzet].raktér/súly….PAX/osztályonként.PAD/…`
  - utasok: férfi/nő/gyerek/infant, pl. `82/52/0/0`
  - `T`: az összes rakomány kg-ban; `MD`: főfedélzet (teherjárat); `1/50` = 1-es raktér 50 kg
  - a `PAD` jelentése megerősítendő
- Különleges tételek: `.ELD/pozíció/súly`, `.FKT/raktér/súly`.
- SI: kategóriánkénti bontás (`C/0.E/1983.M/0`) vagy poggyász (`BP/57` darab, `B/825` kg, `TB/2` valószínűleg transzfer poggyász, megerősítendő).
- **Ellenőrzés:** főfedélzet + rakterek = T; az utasok összege = PAX.

## CPM (rakodási üzenet)

- Fejléc-változatok: `P75535/16.URNPA.1983.BUD` (összsúllyal és állomással), `CZ2557/19SEP26.B2041.4/1.CANBUD` (teljes dátum, útvonal; a `4/1` jelentése megerősítendő).
- Célállomásonkénti összesítés: `.BUD/92404`, `.TW/92404`.
- Szakaszok (szélestörzsű, teherszállító): `M/D RIGHT SIDE`, `M/D LEFT SIDE`, `M/D CENTER`, `L/D …`.
- Pozíciósor, két látott változat (a súly és a cél sorrendje eltér!):
  - `-POZ/ULD/súly/cél/kontúr/kategória[.kód]`, pl. `-GR/PMC45245CZ/4765/BUD/Q5/C.ELI`
  - `-POZ/ULD/cél/súly/kategória[.kód]`, pl. `-A9/PAG72809AGH/OSR/335/E.ELD`
- Bulk: `-BLK/108/BUD/C` vagy raktérszámmal `-1/OSR/50/E.FKT` (itt is eltér a sorrend).
- Üres pozíció: `-A1/N`, `-2/NIL`, `-11P.NIL`.
- SI: súlyadatok (ZFW, TOW, index, súlypont, stab trim, üzemanyag).
- **Ellenőrzés:** a pozíciók összege = összsúly; TOW = ZFW + felszállási üzemanyag; a rakterek és a főfedélzet súlya egyezik az LDM-mel.

## UCM (ULD-mozgás)

- Fejléc: `járat/nap.lajstrom.állomás`, utána `IN` (érkező ULD-k, az állomás a honnan) vagy `OUT` (induló ULD-k, az állomás a hova).
- Tételek: `.ULD/állomás/kategória`, egy sorban több is.
- **Ellenőrzés (OUT):** az UCM E-s ULD-jei megegyeznek a CPM ELD-s pozícióinak ULD-jeivel; az X-es ULD-k nem szerepelnek a CPM-ben.
- Az IN és OUT üzenetekből a BUD-on lévő ULD-készlet követhető (későbbi lehetőség). Példa: a PAG72809AGH 12-én érkezett RMO-ból, 16-án ment tovább OSR-be.

## Fogadás és szétválasztás

A fogadó API, a kézi bemásolás és a jogosultságok leírása a CLAUDE.md 7. mérföldkő szakaszában van. Itt a szövegre vonatkozó szabályok:

- Egy beküldött szövegben több üzenet is lehet. Új üzenet ott kezdődik, ahol egy sor pontosan egy ismert típuskód: támogatott az MVT, LDM, CPM, UCM; felismert, de nem támogatott a PTM és a PSM (a lista bővíthető).
- Az UCM `IN` és `OUT` sora az üzenet része, nem új üzenet. A `CPM END` a CPM végét jelzi.
- A típussor előtti sorokat (pl. Type B fejléc és cím, email szöveg, aláírás) a feldolgozó átugorja; a nyers szöveg ezekkel együtt megmarad.
- Nem támogatott típusnál a tartalmat nem tároljuk, csak a típust, a fejlécet (járat, dátum) és a beérkezés idejét naplózzuk, mert ezek személyes adatot tartalmazhatnak.

## Párosítás és a járat része

- **Járatszám:** kétkarakteres légitársaság-kód, 1–4 számjegy, opcionálisan egy betű. A kódot a rendszerben lévő légitársaságok IATA-kódjai alapján választjuk le, pl. `P75535` = P7 5535.
- **Üzemnap:** a fejléc dátuma az adott szakasz üzemnapja, vagyis az indulás napja az indulóállomáson (a CLAUDE.md 20. eldöntött szabálya). Csak nap esetén a beérkezés idejéhez legközelebbi, azonos napú dátum.
- **A járat része:**
  - MVT: ha a fejléc állomása BUD és van `AD` sor, az indulási rész; ha a fejléc állomása BUD és van `AA` sor, az érkezési rész; ha a fejléc állomása más, és az `EA` sor célja BUD, az érkezési rész (ebből jön az ETA).
  - UCM: a fejléc állomása BUD; `IN` az érkezési, `OUT` az indulási rész.
  - LDM: ha a célállomás BUD, az érkezési rész; ha a járatszám egy BUD-ról induló járaté, az indulási rész.
  - CPM: a fejléc állomása vagy útvonala alapján (pl. `CANBUD`): ha BUD a cél, az érkezési, ha BUD az indulóállomás, az indulási rész.
- Ha a járatszám és az üzemnap alapján egy járat sem, vagy több is szóba jön, az üzenet párosítatlan. A BUD-ot nem érintő üzenet is párosítatlan, „nem érinti BUD-ot” jelzéssel.
- **Lajstrom:** másodlagos. Ha a járatrészen nincs, az üzenet kitölti; ha eltér, figyelmeztetés (pl. gépcsere).
- **Példa:** az `ET3365/12.ETBAB.BUD` MVT 17-én érkezik, az üzemnap 12-e, tehát a 12-i ET 3365 indulási részéhez párosul, és az ATD 17-én 07:16 UTC.

## Verziók

- A verziókulcs: járatrész + típus + fajta. Fajta az MVT-nél: `AD` (indulás), `AA` (érkezés), csak `EA` (várható érkezés más állomásról); az UCM-nél `IN` vagy `OUT`; az LDM-nél és a CPM-nél maga a típus.
- Az azonos kulcsú, később beérkező üzenet új verzió; a korábbi megmarad, de a legfrissebb az érvényes.

## MVT előállítása

- Az indulási MVT a minták szerkezetét követi: fejléc (`járat/üzemnap.lajstrom.BUD`), `AD off-block/felszállás EA hhmm CÉL`, késésnél `DLkód/kód/iiii/iiii` (a minta szerint legfeljebb két kód; több kódnál figyelmeztetés), opcionálisan SI.
- Az előállított szöveget a saját feldolgozónk visszaolvassa, és ugyanazokat az értékeket kell kapnia.
- Az érkezési (`AA`) és a korrekciós MVT formátumához még nincs minta.

## Hiányzó minták és kérdések

- Érkezési MVT (`AA` sor), korrekciós MVT, és ha van ilyen, a várható indulást jelző (késési) MVT.
- A LDM `PAD` és `TB`, valamint a CPM-fejléc `4/1` jelentése.
- PTM és PSM, anonimizálva, ha a feldolgozásuk sorra kerül.
- A SITA-küldés átjárója: jelenleg milyen programmal vagy átjárón keresztül megy ki a Type B üzenet.

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
