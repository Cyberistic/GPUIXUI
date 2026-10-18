import { darkColors } from "../color.js";
import { systemUiFont, type PlatformStyle } from "../platform-types.js";

/**
 * Windows 11: Fluent's blue accent (`#0067C0` light, `#4CC2FF` dark), almost
 * square control corners, comfortable controls and crisp shadows. `sans` stays
 * GPUI's system sentinel; `mono` is the family Windows installs. The dark
 * selection wash uses the light accent as its base so white text keeps the body
 * floor on the fills a row paints (plan 081). The light secondary grey is one
 * step darker so secondary text keeps its floor through the selection wash on
 * the pressed row (plan 087). The accent's readable text step is
 * `#005BA1` light and `#76D0FF` dark; the fill's `#0067C0` is 4.30:1 on the
 * pressed wash (plan 082). The dark wash is 33% rather than 20% because a 20%
 * tint is invisible on the dark-red soft destructive fill — the selection
 * highlight must stay perceivable on a status surface too (plan 091) — and it
 * stops at 33% rather than the 40% plan 091 chose, because a selected row's
 * title (`foreground`) keeps the 7:1 body floor through it at that strength
 * (plan 506). Elevation levels apply their own alpha to the `shadow` tint, so a
 * copied style retints all three by editing one role (plan 085).
 * The dark skeleton is one step off the pressed wash, so a loading row keeps its
 * placeholder visible (plan 094). The filled-control hover and pressed steps are
 * designed opaque roles in Fluent's blue and grey families, not alpha composites
 * (plan 097). The light quiet panel and accent are a step toward the card, so a
 * sidebar wash, a neutral filled control and a toggle-on fill stay perceivable
 * on the surface they paint on (plan 309), the selected row is a step past the
 * accent wash a selectable row hovers with (plan 381), and the pressed neutral
 * step sits one
 * designed step below the divider so an outlined control keeps its edge while
 * pressed (plan 318). The dark soft destructive tint is named rather than left
 * to inheritance, so applying this style over another platform's theme cannot
 * keep that platform's tint (plan 374); both Windows recipes share this dark
 * set, so they inherit the fix. The hint clears the secondary floor on the row
 * washes a field inside a row paints (plan 527). The light link is a step darker
 * so it keeps the secondary floor through the selection wash (plan 528).
 */
export const windowsPlatformStyle = {
  types: { label: "Windows", sans: systemUiFont, mono: "Consolas" },
  structure: {
    density: "comfortable",
    radius: { sm: 2, md: 4, lg: 8, xl: 8 },
    motion: { fast: 120, normal: 160, slow: 240 },
  },
  colors: {
    light: {
      background: "#F3F3F3",
      card: "#FFFFFF",
      popover: "#FFFFFF",
      muted: "#F7F7F7",
      mutedForeground: "#4A4A4A",
      border: "#D6D6D6",
      borderStrong: "#767676",
      input: "#FFFFFF",
      inputForeground: "#1A1A1A",
      hover: "#EBEBEB",
      active: "#E0E0E0",
      secondary: "#EDEDED",
      secondaryForeground: "#1A1A1A",
      secondaryHover: "#E0E0E0",
      secondaryActive: "#CCCCCC",
      primary: "#0067C0",
      primaryForeground: "#FFFFFF",
      primaryHover: "#005BA1",
      primaryActive: "#004E8C",
      primaryText: "#004F8A",
      accent: "#DCEBF8",
      accentForeground: "#004A8F",
      accentHover: "#CFE3F5",
      accentActive: "#B9D3EF",
      ring: "#0067C0",
      selection: "#0067C033",
      selected: "#C2E2FF",
      selectedForeground: "#003A6B",
      // The hint clears the secondary floor on the row washes a field inside a
      // row paints, not only on the plain surfaces (plan 527).
      placeholder: "#606060",
      track: "#D8D8D8",
      shadow: "#000000",
    },
    dark: {
      background: "#202020",
      card: "#2B2B2B",
      popover: "#2B2B2B",
      muted: "#2B2B2B",
      mutedForeground: "#C7C7C7",
      border: "#3D3D3D",
      borderStrong: "#9A9A9A",
      input: "#2B2B2B",
      inputForeground: "#FFFFFF",
      hover: "#383838",
      active: "#454545",
      skeleton: "#525252",
      track: "#262626",
      secondary: "#383838",
      secondaryForeground: "#FFFFFF",
      secondaryHover: "#424242",
      secondaryActive: "#4C4C4C",
      primary: "#4CC2FF",
      primaryForeground: "#000000",
      primaryHover: "#76D0FF",
      primaryActive: "#9BDDFF",
      primaryText: "#76D0FF",
      accent: "#0F3554",
      accentForeground: "#9CD9FF",
      accentHover: "#113A5D",
      accentActive: "#174572",
      ring: "#4CC2FF",
      selection: "#0067C055",
      selected: "#094771",
      selectedForeground: "#CFE9FF",
      placeholder: "#B5B5B5",
      destructiveSoft: darkColors.destructiveSoft,
      shadow: "#000000",
    },
  },
  elevation: {
    light: {
      sm: [
        {
          offsetX: 0,
          offsetY: 1,
          blurRadius: 2,
          spreadRadius: 0,
          alpha: 0.1,
        },
      ],
      md: [
        {
          offsetX: 0,
          offsetY: 4,
          blurRadius: 10,
          spreadRadius: -2,
          alpha: 0.16,
        },
      ],
      lg: [
        {
          offsetX: 0,
          offsetY: 12,
          blurRadius: 32,
          spreadRadius: -6,
          alpha: 0.2,
        },
      ],
    },
    dark: {
      sm: [
        {
          offsetX: 0,
          offsetY: 1,
          blurRadius: 2,
          spreadRadius: 0,
          alpha: 0.4,
        },
      ],
      md: [
        {
          offsetX: 0,
          offsetY: 6,
          blurRadius: 18,
          spreadRadius: -2,
          alpha: 0.65,
        },
      ],
      lg: [
        {
          offsetX: 0,
          offsetY: 18,
          blurRadius: 44,
          spreadRadius: -8,
          alpha: 0.8,
        },
      ],
    },
  },
} as const satisfies PlatformStyle;
