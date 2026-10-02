# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 39*

## Mi készült el

- **12. mérföldkő, 4. lépés:** naptár (.ics), letöltés és feliratkozás.
  - `lib/calendar/`: szabványos iCalendar tiszta függvényekkel: CRLF, 75 bájtos sortördelés (ékezetet nem vág ketté), escape-elés, UTC-időpontok, `METHOD:PUBLISH`, a naptár neve „Beosztás – <név>” (`X-WR-CALNAME`, `NAME`), javasolt frissítés (`REFRESH-INTERVAL`, `X-PUBLISHED-TTL`). Műszakonként egy esemény, a műszakhoz kötött azonosítóval; cím „Műszak 06:00–14:00”, a leírásban a részek (helyszín, leírás, blokk az utazással), eltérésnél „Módosult: … Publikált: …”. Csak a publikált napok valós műszakjai.
  - Letöltés a „Beosztásom” oldalról: a megjelenített hét, vagy választott időszak (legfeljebb 31 nap), csak a saját beosztás, bejelentkezve.
  - Feliratkozás: személyes link (`/api/calendar/<kulcs>.ics`), a kulcs hash-elve, csak létrehozáskor látszik, másolás gombbal és rövid útmutatóval (Outlook, Google, iPhone). Új link a régit érvényteleníti; az ügynök visszavonhatja. Hibás kulcs, inaktív felhasználó vagy elvesztett jog: 404. Látszik a létrehozás és az utolsó lekérés ideje. A link az `APP_PUBLIC_URL`-ből készül (HTTPS; HTTP csak localhoston); nélküle a felület jelzi, hogy csak a letöltés működik.
  - Admin: a felhasználók listáján „Naptárlink” oszlop (élő-e, utolsó lekérés), a felhasználó oldalán visszavonás; az `Admin → Beállítások` oldalon a javasolt frissítés (15–1440 perc, helyőrző: 60).
  - Migráció: `CalendarFeed` tábla, `Setting.calendarRefreshMinutes`; `.env.example` és `docker-compose.yml`: `APP_PUBLIC_URL`.
  - Tesztek: stabil azonosító, óraátállítás (október 25., 9 órás éjszakai műszak), éjfélen átnyúló műszak, eltérés és a publikált műszak a leírásban, escape, sortördelés, fejléc, időszakok, a nyilvános cím és a kulcs formája.
  - Ellenőrizve a fejlesztői szerveren: a feliratkozási link 200 és szabványos naptárat ad (független elemzővel, ical.js-sel is visszaolvasva), rossz kulcs 404, újragenerálás után a régi 404, inaktív felhasználónál 404, az utolsó lekérés rögzül, bejelentkezés nélkül a letöltés a belépésre irányít. A naptár szakasz statikusan, telefonméretben megnézve.
- 3. (`bfc6279`) napi összefoglaló; 2. (`4b832a6`) „Beosztásom”; 1. (`c0e5a15`) jogosultság és adatréteg.

## Állapot

- Utolsó commit: `feat: save and subscribe to one's own roster as a calendar` (ez a commit; előtte `bfc6279`)
- Tesztek: `npm test` → 814 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres

## Eltérések a CLAUDE.md-től

- nincs

## Kérdések a tervezéshez

- nincs

## Következő lépés

- 5. lépés: seed (ha kell), README (a feliratkozás a gyakori naptárakban, az üzemeltetés feltételei, `APP_PUBLIC_URL`), STATUS.md, indítás tiszta állapotból.
