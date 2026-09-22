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
} as const;

export type Messages = typeof hu;
