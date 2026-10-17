import { systemUiFont, type PlatformStyle } from "../platform-types.js";

/**
 * Windows 11: Fluent's blue accent (`#0067C0` light, `#4CC2FF` dark), almost
 * square control corners, comfortable controls and crisp shadows. `sans` stays
 * GPUI's system sentinel; `mono` is the family Windows installs.
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
      muted: "#EDEDED",
      mutedForeground: "#5C5C5C",
      border: "#D6D6D6",
      borderStrong: "#767676",
      input: "#FFFFFF",
      inputForeground: "#1A1A1A",
      hover: "#EBEBEB",
      active: "#E0E0E0",
      secondary: "#EDEDED",
      secondaryForeground: "#1A1A1A",
      primary: "#0067C0",
      primaryForeground: "#FFFFFF",
      primaryHover: "#005BA1",
      accent: "#E5F1FB",
      accentForeground: "#004A8F",
      ring: "#0067C0",
      selection: "#0067C033",
      selected: "#CCE8FF",
      selectedForeground: "#003A6B",
      placeholder: "#6B6B6B",
      shadow: "#00000026",
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
      skeleton: "#3C3C3C",
      secondary: "#383838",
      secondaryForeground: "#FFFFFF",
      primary: "#4CC2FF",
      primaryForeground: "#000000",
      primaryHover: "#76D0FF",
      accent: "#0F3554",
      accentForeground: "#9CD9FF",
      ring: "#4CC2FF",
      selection: "#4CC2FF33",
      selected: "#094771",
      selectedForeground: "#CFE9FF",
      placeholder: "#A6A6A6",
      shadow: "#00000080",
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
          color: "#0000001A",
        },
      ],
      md: [
        {
          offsetX: 0,
          offsetY: 4,
          blurRadius: 10,
          spreadRadius: -2,
          color: "#00000029",
        },
      ],
      lg: [
        {
          offsetX: 0,
          offsetY: 12,
          blurRadius: 32,
          spreadRadius: -6,
          color: "#00000033",
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
          color: "#00000066",
        },
      ],
      md: [
        {
          offsetX: 0,
          offsetY: 6,
          blurRadius: 18,
          spreadRadius: -2,
          color: "#000000A6",
        },
      ],
      lg: [
        {
          offsetX: 0,
          offsetY: 18,
          blurRadius: 44,
          spreadRadius: -8,
          color: "#000000CC",
        },
      ],
    },
  },
} as const satisfies PlatformStyle;
