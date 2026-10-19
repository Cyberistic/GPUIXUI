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
 * carries the Windows dark palette and is documented as an interpretation. The
 * link is a step darker so it keeps the secondary floor through the selection
 * wash (plan 528). The information and warning inks take one designed step
 * darker so a native document's syntax captures keep the body floor on the quiet
 * panel through the runtime's 3.5% ink wash (plan 574), and the success and
 * destructive inks take the XP step so a find match keeps the secondary floor
 * through the active wash on that painted surface (plan 582). The values are
 * held to `themeContrastFailures` in both modes by `platform-recipes.test.ts`.
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
      // The secondary and primary inks take one designed step darker so the
      // active find match keeps the secondary floor over the native diff's 5.5%
      // row tints (plan 649): the inherited values measured 4.437–4.498:1 on
      // the quiet panel and the canvas, under 4.5:1, while the code-ink and
      // plain arms passed.
      mutedForeground: "#36455A",
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
      primaryText: "#0A417A",
      // The information and warning inks take one designed step darker so a
      // native document's syntax captures keep the body floor on the quiet
      // panel through the runtime's 3.5% ink wash (plan 574). The success and
      // destructive inks take the XP recipe's step because a find match paints
      // over that same ink wash: the inherited values measured 4.429–4.496:1
      // through the active match, under the 4.5:1 secondary floor (plan 582).
      infoText: "#173A88",
      warningText: "#4B3100",
      successText: "#0A3A26",
      destructiveText: "#7E1D21",
      accent: "#D8EAFB",
      accentForeground: "#0B478A",
      accentHover: "#CFE5FA",
      accentActive: "#C4DEF9",
      ring: "#1565C0",
      selection: "#1565C03D",
      selected: "#CCE4FA",
      selectedForeground: "#0B3A6B",
      // The hint clears the secondary floor on the row washes a field inside a
      // row paints, not only on the plain surfaces (plan 527).
      placeholder: "#546378",
      skeleton: "#BDCFE4",
      track: "#CED8E5",
      shadow: "#0B1F33",
    },
    dark: windowsPlatformStyle.colors.dark,
  },
  elevation: windowsPlatformStyle.elevation,
} as const satisfies PlatformStyle;
