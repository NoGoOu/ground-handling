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
  },
  login: {
    title: "Belépés",
    username: "Felhasználónév",
    password: "Jelszó",
    submit: "Belépés",
    submitting: "Belépés…",
    invalid: "Hibás felhasználónév vagy jelszó.",
  },
  home: {
    signedInAs: "Bejelentkezve:",
  },
} as const;

export type Messages = typeof hu;
