import { systemUiFont, type PlatformStyle } from "../../platform-types.js";
import { windowsPlatformStyle } from "../windows.js";

/**
 * Windows 7 (Aero): the glass-blue shell, soft corners and the Aero accent.
 * A recipe is an edition of the Windows variant, not a fifth platform — it
 * resolves through the same `applyPlatformStyle` path and stays out of
 * `platformNames`.
 *
 * Aero's glass is an approximation: GPUix 0.10.0 has no backdrop blur, inset
 * shadow, radial/conic gradient or clip-path, so the layers are solid tinted
 * surfaces, not translucency. Windows 7 shipped no dark mode: the dark half
 * keeps the Windows dark surfaces and is documented as an interpretation. The
 * values are held to `themeContrastFailures` in both modes by
 * `platform-recipes.test.ts`.
 */
export const aeroPlatformRecipe = {
  types: { label: "Windows 7", sans: systemUiFont, mono: "Consolas" },
  structure: {
    density: "comfortable",
    radius: { sm: 3, md: 5, lg: 8, xl: 10 },
    motion: { fast: 120, normal: 160, slow: 240 },
  },
  colors: {
    light: {
      background: "#F0F4F9",
      card: "#FFFFFF",
      popover: "#FFFFFF",
      muted: "#EBF3FC",
      foreground: "#101828",
      mutedForeground: "#3D4C5F",
      border: "#BCC9DA",
      borderStrong: "#66758C",
      input: "#FFFFFF",
      inputForeground: "#101828",
      hover: "#E0EAF6",
      active: "#D5E3F4",
      secondary: "#DAE6F4",
      secondaryForeground: "#101828",
      secondaryHover: "#CFDFF0",
      secondaryActive: "#C2D4E9",
      disabled: "#EAF0F7",
      disabledForeground: "#5A6678",
      primary: "#1565C0",
      primaryForeground: "#FFFFFF",
      primaryHover: "#0F55A3",
      primaryActive: "#0B478A",
      primaryText: "#0F55A3",
      accent: "#D8EAFB",
      accentForeground: "#0B478A",
      accentHover: "#CFE5FA",
      accentActive: "#C4DEF9",
      ring: "#1565C0",
      selection: "#1565C03D",
      selected: "#CCE4FA",
      selectedForeground: "#0B3A6B",
      placeholder: "#5B6B80",
      skeleton: "#BDCFE4",
      shadow: "#0B1F33",
    },
    dark: {},
  },
  elevation: windowsPlatformStyle.elevation,
} as const satisfies PlatformStyle;
