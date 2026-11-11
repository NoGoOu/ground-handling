# Jogosultság, szerepkörök és felhasználók

Ki mit láthat és tehet. A kód jogosultságokat ellenőriz, nem szerepkörneveket; a jogosultságok listája a kódban van (`lib/permissions/catalog.ts`), magyar megnevezéssel. Hogy egy-egy jogosultság pontosan mit enged, azt az érintett téma leírásának „Jogosultság” szakasza írja le.

## Szerepkörök és jogosultsági rendszer

Az alábbi táblázat az első négy alapértelmezett szerepkört írja le. A szerepkörök adatként szerkeszthetők, a jogosultsági rendszer szerint (lásd a táblázat alatt).

| Szerepkör | Jogosultság |
|---|---|
| ADMIN | Mindenhez hozzáfér. Felhasználókat, légitársaságokat és sablonokat kezel. |
| PLANNER (tervező) | Műszakbeosztást készít (tervezet), szabadon választott időszakra publikálja, a valós beosztást módosíthatja, a műszakrész-típusokat kezeli. A járatokat és a taskokat nem kezeli. |
| SHIFT_LEAD (műszakvezető) | Járatokat hoz létre és módosít; a járathoz a task automatikusan létrejön. Ügynököket rendel a taskokhoz. Minden taskot lát, bármelyik rögzített időt javíthatja, a task státuszát módosíthatja. A publikált és a valós beosztást látja, a valósat módosíthatja. |
| AGENT (ügynök) | Csak a hozzá rendelt taskokat látja, a műszakbeosztástól függetlenül. Csak a hozzá rendelt rész mérföldköveit rögzítheti, a saját rögzítéseit javíthatja. A hozzá rendelt task státuszát ő váltja. |

- Hosszú fordulónál a két ügynök nem nyúlhat egymás részébe: az érkezési ügynök csak az érkezési, az indulási ügynök csak az indulási rész mérföldköveit rögzítheti. Gyors fordulónál mindkét rész az érkezési ügynöké (8. időszámítási szabály).
- Minden rögzítésnél látszik a felületen, ki rögzítette és ki módosította utoljára.
- **Jogosultsági rendszer:**
  - A kód jogosultságokat ellenőriz (pl. taskok megtekintése, rögzítés, kiosztás, beosztás publikálása), nem szerepkörneveket.
  - A szerepkör adat: egy név és a hozzá pipált jogosultságok. Az admin egy szerepkör × jogosultság táblázatban pipál, és új szerepkört is létrehozhat.
  - Hatókör: ahol értelmes, a jogosultsághoz hatókör tartozik: saját, csapat vagy összes. A csapat hatókör a felhasználó által vezetett csapatok tagjait és a felhasználót magát jelenti. Egy task a csapat hatókörébe esik, ha az érkezési vagy az indulási ügynöke a csapat tagja.
  - Egy felhasználónak több szerepköre lehet, és egyénileg további jogosultságokat is kaphat. A tényleges jogosultság ezek uniója; hatókörnél a legszélesebb érvényes. Egyéni megvonás nincs.
  - A felhasználó admin oldalán látszik a tényleges jogosultsága és hatóköre, mindegyiknél a forrásával (melyik szerepkörből vagy egyéni kiegészítésből jön).
  - Aki taskot oszthat ki, a kiosztatlan taskokat a hatókörétől függetlenül látja, különben nem tudná kiosztani őket.
  - Az Admin beépített szerepkör: nem szerkeszthető és nem törölhető, és az utolsó aktív admin nem veszítheti el.
  - Terv: a szerepkör és az egyéni jogosultság egy állomásra vagy minden állomásra szól majd (`docs/tervek/14-tobb-allomas.md`).
- A jogosultságot szerveroldalon is ellenőrizni kell, nem elég a felületen elrejteni.

## Alapértelmezett szerepkörök

- Admin (beépített), Tervező, Műszakvezető, Ügynök, Oktatási koordinátor, Mentor, Vizsgáztató, Műszaki.
- Az alapértelmezett kiosztást a seed hozza létre; az admin a szerepkör × jogosultság táblázatban átállíthatja.

## Felhasználók

- Az admin kezeli: létrehozás, szerepkörök és egyéni jogosultságok, csapat, aktív vagy inaktív állapot, jelszó. A felhasználó nem törölhető, csak inaktiválható.
- Belépés felhasználónévvel és jelszóval (Auth.js). A belépési kísérletek korlátozása: `docs/spec/uzemeltetes.md`.
- **Jelszó:** jelszót csak az admin állít. Önkiszolgáló jelszóváltoztatás és kötelező csere nincs.

## Csapatok

- **Csapat:** név és vezető; az admin kezeli. Egy felhasználó több csapatot is vezethet.
- **Ügynök = csapattag:** a kódban az „ügynök” a csapat tagja; minden ügynök egy csapat tagja.
