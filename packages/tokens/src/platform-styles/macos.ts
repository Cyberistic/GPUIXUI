import { systemUiFont, type PlatformStyle } from "../platform-types.js";

/**
 * macOS: Apple's blue accent (`#0071E3` light, `#0A84FF` dark), grouped-canvas
 * greys, compact controls and softly blurred shadows. The dark focus ring steps
 * up to `#409CFF` — the accent at its hovered weight — because `#0A84FF` is
 * 2.50:1 on the pressed-row wash, under the 3:1 boundary floor. `sans` stays
 * GPUI's system sentinel; `mono` is the family macOS installs.
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
      borderStrong: "#8A8A8E",
      input: "#FFFFFF",
      inputForeground: "#1D1D1F",
      hover: "#E8E8ED",
      active: "#DCDCE2",
      secondary: "#E8E8ED",
      secondaryForeground: "#1D1D1F",
      primary: "#0071E3",
      primaryForeground: "#FFFFFF",
      primaryHover: "#0063CC",
      accent: "#E7F1FF",
      accentForeground: "#0055B3",
      ring: "#0071E3",
      selection: "#0071E333",
      selected: "#E7F1FF",
      selectedForeground: "#0055B3",
      placeholder: "#6E6E73",
      shadow: "#00000026",
    },
    dark: {
      background: "#1C1C1E",
      card: "#2C2C2E",
      popover: "#2C2C2E",
      muted: "#2C2C2E",
      mutedForeground: "#A1A1A6",
      border: "#3A3A3C",
      borderStrong: "#8E8E93",
      input: "#1C1C1E",
      inputForeground: "#F5F5F7",
      hover: "#3A3A3C",
      active: "#48484A",
      skeleton: "#3C3C3E",
      secondary: "#3A3A3C",
      secondaryForeground: "#F5F5F7",
      primary: "#0A84FF",
      primaryForeground: "#000000",
      primaryHover: "#409CFF",
      accent: "#1C3A57",
      accentForeground: "#A8D4FF",
      ring: "#409CFF",
      selection: "#0A84FF33",
      selected: "#123A5C",
      selectedForeground: "#CFE8FF",
      placeholder: "#9A9AA0",
      shadow: "#00000080",
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
          color: "#00000014",
        },
      ],
      md: [
        {
          offsetX: 0,
          offsetY: 6,
          blurRadius: 18,
          spreadRadius: -2,
          color: "#0000001F",
        },
      ],
      lg: [
        {
          offsetX: 0,
          offsetY: 20,
          blurRadius: 48,
          spreadRadius: -8,
          color: "#00000029",
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
          color: "#00000066",
        },
      ],
      md: [
        {
          offsetX: 0,
          offsetY: 10,
          blurRadius: 28,
          spreadRadius: -4,
          color: "#00000099",
        },
      ],
      lg: [
        {
          offsetX: 0,
          offsetY: 28,
          blurRadius: 64,
          spreadRadius: -12,
          color: "#000000CC",
        },
      ],
    },
  },
} as const satisfies PlatformStyle;
