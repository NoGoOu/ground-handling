// All user-facing Hungarian texts live here so they can be translated later.
export const hu = {
  app: {
    name: "Ground Handling",
    description: "Repülőtéri földi kiszolgálás szervezése",
  },
  roles: {
    ADMIN: "Admin",
    SHIFT_LEAD: "Műszakvezető",
    AGENT: "Ügynök",
  },
  nav: {
    logout: "Kilépés",
    flights: "Járatok",
    myTasks: "Taskjaim",
    admin: "Admin",
  },
  errors: {
    forbidden: "Ehhez nincs jogosultságod.",
    notFound: "A keresett elem nem található.",
    invalidInput: "Hibás adatok, ellenőrizd a mezőket.",
  },
  pages: {
    flights: "Napi járatlista",
    agent: "Taskjaim",
    admin: "Admin",
  },
  login: {
    title: "Belépés",
    username: "Felhasználónév",
    password: "Jelszó",
    submit: "Belépés",
    submitting: "Belépés…",
    invalid: "Hibás felhasználónév vagy jelszó.",
  },
  status: {
    PLANNED: "Tervezett",
    IN_PROGRESS: "Folyamatban",
    COMPLETED: "Lezárva",
  },
  turnaroundType: {
    QUICK: "Gyors",
    LONG: "Hosszú",
  },
  part: {
    ARRIVAL_PART: "Érkezési rész",
    DEPARTURE_PART: "Indulási rész",
  },
  times: {
    sta: "STA",
    eta: "ETA",
    ata: "ATA",
    std: "STD",
    etd: "ETD",
    atd: "ATD",
    minutes: "{minutes} perc",
    delay: "Késés: +{minutes} perc",
  },
  dateNav: {
    date: "Dátum",
    today: "Ma",
    previous: "‹ Előző nap",
    next: "Következő nap ›",
    show: "Mutasd",
  },
  flights: {
    empty: "Erre a napra nincs járat.",
    count: "{count} járat",
    newFlight: "Új járat",
    open: "Megnyitás",
    edit: "Szerkesztés",
    columns: {
      flight: "Járat",
      stand: "Állóhely",
      arrival: "Érkezés",
      departure: "Indulás",
      type: "Típus",
      status: "Státusz",
      agents: "Ügynökök",
      delay: "Késés",
    },
    arrivalAgent: "Érkezés",
    departureAgent: "Indulás",
    unassigned: "nincs kiosztva",
  },
} as const;

export type Messages = typeof hu;
