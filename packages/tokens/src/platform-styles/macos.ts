import { systemUiFont, type PlatformStyle } from "../platform-types.js";

/**
 * macOS: Apple's blue accent (`#0071E3` light, `#0A84FF` dark), grouped-canvas
 * greys, compact controls and softly blurred shadows. The dark focus ring steps
 * up to `#409CFF` — the accent at its hovered weight — because `#0A84FF` is
 * 2.50:1 on the pressed-row wash, under the 3:1 boundary floor. The dark
 * secondary grey and pressed wash are set so row descriptions clear 4.5:1 on
 * both pointer washes (plan 079). `sans` stays GPUI's system sentinel; `mono` is
 * the family macOS installs. The dark divider is Apple's separator grey
 * (`#48484A`), so an outlined control's edge clears the floor on the washes it
 * paints (plan 080). The accent's readable text step is `#0055B3` light and
 * `#64B5FF` dark: the fill's `#0071E3` measures 4.21:1 on the canvas and
 * `#0A84FF` 3.82:1 on a dark card (plan 082). The light boundary is Apple's
 * secondary label grey (`#6E6E73`), so a checkbox in a row keeps its edge on
 * every wash (plan 084). Elevation levels apply their own alpha to the `shadow`
 * tint, so a copied style retints all three by editing one role (plan 085).
 */
export const macosPlatformStyle = {
  types: { label: "macOS", sans: systemUiFont, mono: "Menlo" },
  structure: {
    density: "compact",
    radius: { sm: 4, md: 6, lg: 10, xl: 12 },
    motion: { fast: 140, normal: 180, slow: 260 },
  },
  colors: {
    light: {
      background: "#F2F2F7",
      card: "#FFFFFF",
      popover: "#FFFFFF",
      muted: "#ECECF0",
      mutedForeground: "#5A5A5F",
      border: "#D1D1D6",
      borderStrong: "#6E6E73",
      input: "#FFFFFF",
      inputForeground: "#1D1D1F",
      hover: "#E8E8ED",
      active: "#DCDCE2",
      secondary: "#E8E8ED",
      secondaryForeground: "#1D1D1F",
      primary: "#0071E3",
      primaryForeground: "#FFFFFF",
      primaryHover: "#0063CC",
      primaryText: "#0055B3",
      accent: "#E7F1FF",
      accentForeground: "#0055B3",
      ring: "#0071E3",
      selection: "#0071E333",
      selected: "#E7F1FF",
      selectedForeground: "#0055B3",
      placeholder: "#6E6E73",
      shadow: "#000000",
    },
    dark: {
      background: "#1C1C1E",
      card: "#2C2C2E",
      popover: "#2C2C2E",
      muted: "#2C2C2E",
      mutedForeground: "#AEAEB2",
      border: "#48484A",
      borderStrong: "#8E8E93",
      input: "#1C1C1E",
      inputForeground: "#F5F5F7",
      hover: "#3A3A3C",
      active: "#404042",
      skeleton: "#3C3C3E",
      secondary: "#3A3A3C",
      secondaryForeground: "#F5F5F7",
      primary: "#0A84FF",
      primaryForeground: "#000000",
      primaryHover: "#409CFF",
      primaryText: "#64B5FF",
      accent: "#1C3A57",
      accentForeground: "#A8D4FF",
      ring: "#409CFF",
      selection: "#0A84FF33",
      selected: "#123A5C",
      selectedForeground: "#CFE8FF",
      placeholder: "#9A9AA0",
      shadow: "#000000",
    },
  },
  elevation: {
    light: {
      sm: [
        {
          offsetX: 0,
          offsetY: 1,
          blurRadius: 3,
          spreadRadius: 0,
          alpha: 0.08,
        },
      ],
      md: [
        {
          offsetX: 0,
          offsetY: 6,
          blurRadius: 18,
          spreadRadius: -2,
          alpha: 0.12,
        },
      ],
      lg: [
        {
          offsetX: 0,
          offsetY: 20,
          blurRadius: 48,
          spreadRadius: -8,
          alpha: 0.16,
        },
      ],
    },
    dark: {
      sm: [
        {
          offsetX: 0,
          offsetY: 1,
          blurRadius: 3,
          spreadRadius: 0,
          alpha: 0.4,
        },
      ],
      md: [
        {
          offsetX: 0,
          offsetY: 10,
          blurRadius: 28,
          spreadRadius: -4,
          alpha: 0.6,
        },
      ],
      lg: [
        {
          offsetX: 0,
          offsetY: 28,
          blurRadius: 64,
          spreadRadius: -12,
          alpha: 0.8,
        },
      ],
    },
  },
} as const satisfies PlatformStyle;
