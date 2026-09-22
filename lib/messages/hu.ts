// All user-facing Hungarian texts live here so they can be translated later.
export const hu = {
  app: {
    name: "Ground Handling",
    description: "Repülőtéri földi kiszolgálás szervezése",
  },
  home: {
    underConstruction:
      "Az alkalmazás fejlesztés alatt áll. A belépés és a járatlista a következő lépésekben készül el.",
  },
} as const;

export type Messages = typeof hu;
