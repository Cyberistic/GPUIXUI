import { palette } from "../color.js";
import { systemUiFont, type PlatformStyle } from "../platform-types.js";

/**
 * Linux (GNOME / Adwaita): Adwaita's blue accent (`#1C71D8` light, `#78AEED`
 * dark), warm grey surfaces, roomier corners and slightly longer transitions.
 * `sans` stays GPUI's system sentinel; `mono` is the family GNOME installs. The
 * dark selection wash uses the light accent as its base so white text keeps the
 * body floor on the fills a row paints (plan 081). The dark secondary grey is
 * one step lighter so secondary text keeps its floor through the selection wash
 * on the selected row (plan 087). The accent's readable text
 * step is `#12488F` light and `#99C1F1` dark; the fill's `#1C71D8` is 3.51:1 on
 * the pressed wash (plan 082). The dark boundary is one step lighter so a
 * checkbox edge clears the floor on the selected row (plan 084). Elevation
 * levels apply their own alpha to the `shadow` tint, so a copied style retints
 * all three by editing one role (plan 085). The dark soft destructive fill is a
 * step darker so the light-accent wash stays visible on it (plan 091).
 */
export const linuxPlatformStyle = {
  types: { label: "Linux", sans: systemUiFont, mono: "DejaVu Sans Mono" },
  structure: {
    density: "comfortable",
    radius: { sm: 4, md: 6, lg: 12, xl: 12 },
    motion: { fast: 160, normal: 220, slow: 320 },
  },
  colors: {
    light: {
      background: "#F6F5F4",
      card: "#FFFFFF",
      popover: "#FFFFFF",
      muted: "#EBEBEA",
      mutedForeground: "#4A4844",
      border: "#D4D2CF",
      borderStrong: "#77767B",
      input: "#FFFFFF",
      inputForeground: "#1D1D1D",
      hover: "#EAE9E8",
      active: "#DEDDDB",
      secondary: "#E8E7E6",
      secondaryForeground: "#1D1D1D",
      primary: "#1C71D8",
      primaryForeground: "#FFFFFF",
      primaryHover: "#1A65C0",
      primaryText: "#12488F",
      accent: "#E1ECFA",
      accentForeground: "#12488F",
      ring: "#1C71D8",
      selection: "#1C71D833",
      selected: "#D7E6F9",
      selectedForeground: "#0F3D77",
      placeholder: "#6A6865",
      shadow: "#000000",
    },
    dark: {
      background: "#242424",
      card: "#303030",
      popover: "#303030",
      muted: "#303030",
      mutedForeground: "#D6D5D2",
      border: "#3F3F3F",
      borderStrong: "#A09F9C",
      input: "#303030",
      inputForeground: "#FFFFFF",
      hover: "#3A3A3A",
      active: "#464646",
      skeleton: "#3E3E3E",
      secondary: "#3A3A3A",
      secondaryForeground: "#FFFFFF",
      primary: "#78AEED",
      primaryForeground: "#000000",
      primaryHover: "#99C1F1",
      primaryText: "#99C1F1",
      accent: "#1B3A5C",
      accentForeground: "#A8CBF0",
      ring: "#78AEED",
      selection: "#1C71D833",
      selected: "#2B4F76",
      selectedForeground: "#D6E7FA",
      placeholder: "#A8A7A3",
      destructiveSoft: palette.red[950],
      shadow: "#000000",
    },
  },
  elevation: {
    light: {
      sm: [
        {
          offsetX: 0,
          offsetY: 2,
          blurRadius: 4,
          spreadRadius: 0,
          alpha: 0.1,
        },
      ],
      md: [
        {
          offsetX: 0,
          offsetY: 6,
          blurRadius: 16,
          spreadRadius: -2,
          alpha: 0.14,
        },
      ],
      lg: [
        {
          offsetX: 0,
          offsetY: 18,
          blurRadius: 44,
          spreadRadius: -8,
          alpha: 0.19,
        },
      ],
    },
    dark: {
      sm: [
        {
          offsetX: 0,
          offsetY: 2,
          blurRadius: 4,
          spreadRadius: 0,
          alpha: 0.4,
        },
      ],
      md: [
        {
          offsetX: 0,
          offsetY: 8,
          blurRadius: 20,
          spreadRadius: -2,
          alpha: 0.65,
        },
      ],
      lg: [
        {
          offsetX: 0,
          offsetY: 22,
          blurRadius: 52,
          spreadRadius: -10,
          alpha: 0.8,
        },
      ],
    },
  },
} as const satisfies PlatformStyle;
