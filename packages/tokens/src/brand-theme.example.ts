import { createTheme, darkTheme } from "./index.js";

export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: {
    primary: "#B49CFF",
    primaryForeground: "#1C1547",
    ring: "#9B8CFF",
  },
  radius: { md: 8 },
  density: "compact",
});

export const brandLightTheme = createTheme({
  mode: "light",
  name: "Acme Light",
  colors: {
    primary: "#6A45F0",
    primaryForeground: "#FFFFFF",

    ring: "#7A57FA",
  },
});

export const brandBaseTheme = darkTheme;
