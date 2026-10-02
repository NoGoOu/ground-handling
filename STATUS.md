# Állapot – Ground Handling App

*Frissítve: 2026. október 2. · CLAUDE.md verzió: 39*

## Mi készült el

- **12. mérföldkő kész** (ügynöki beosztásnézet, naptármentéssel és feliratkozással), az 5. lépéssel:
  - Seed: nem kellett változtatni; a demo beosztásban már van eltérő nap (Nagy Eszter, a betöltés utáni nap: publikált 14:00–22:00, valós 16:00–22:00), blokkos nap és nem publikált napok.
  - README: a 12. mérföldkő leírása; kipróbálás (napi összefoglaló, „Beosztásom”, letöltés, helyi feliratkozás `APP_PUBLIC_URL=http://localhost:3000`-rel, admin nézet); „Naptár-feliratkozás” fejezet: nyilvános HTTPS-cím fordított proxyval (Caddy-példa), `APP_PUBLIC_URL`, a link titkossága, a frissítés korlátai, a céges M365-korlátozás, a feliratkozás lépései Outlookban (web, új, klasszikus), Google Naptárban, iPhone-on, Mac Naptárban és Thunderbirdben; a `lib/calendar/` sor.
  - Tiszta indítás (`docker compose down -v`, `up --build`): 22 migráció, a seed lefut, az Ügynök szerepkörnél „Beosztás megtekintése” saját hatókörrel, a javasolt frissítés 60 perc; a feliratkozási végpont belépés nélkül is elérhető (rossz kulcsra 404), a többi védett oldal a belépésre irányít.
- Korábbi lépések: 4. (`dfbf463`) naptár; 3. (`bfc6279`) napi összefoglaló; 2. (`4b832a6`) „Beosztásom”; 1. (`c0e5a15`) jogosultság és adatréteg.

## Állapot

- Utolsó commit: `docs: describe the agent roster view and the calendar subscription` (ez a commit; előtte `dfbf463`)
- Tesztek: `npm test` → 814 teszt, mind zöld; `npm run lint` hibátlan, `npx tsc --noEmit` tiszta, `npm run build` sikeres
- A bejelentkezett felületet nem néztem meg (jelszót nem írok be); a nézeteket statikusan, telefonméretben, a demo adatokkal, a naptárvégpontot élő szerveren ellenőriztem.

## Eltérések a CLAUDE.md-től

- nincs. Megvalósításban: a feliratkozási link HTTP-n csak `localhost`-on fogadható el (fejlesztéshez); a linket akkor is 404 zárja, ha a felhasználó elveszti a saját beosztásához való jogát (jóváhagyott 3. döntés).

## Kérdések a tervezéshez

- nincs

## Következő lépés

- A 12. mérföldkő lezárása a CLAUDE.md-ben (a jóváhagyott döntések szabályként), és a következő mérföldkő terve.
