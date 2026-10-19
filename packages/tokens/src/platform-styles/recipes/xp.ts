import { systemUiFont, type PlatformStyle } from "../../platform-types.js";
import { windowsPlatformStyle } from "../windows.js";

/**
 * Windows XP (Luna): the beige shell, the dense 3px controls and the Luna
 * blue. A recipe is an edition of the Windows variant, not a fifth platform —
 * it resolves through the same `applyPlatformStyle` path and stays out of
 * `platformNames`.
 *
 * XP's 3D bevel cannot be an inset shadow (GPUix has none), so it is a designed
 * light/dark border pair. XP shipped no dark mode: the dark half carries the
 * Windows dark palette and is documented as an interpretation.
 * The selected row is a step past the accent wash a selectable row hovers with,
 * so the Luna click is perceivable (plan 381). The groove is the era's darker
 * beige and the progress mark is XP's own Luna green, because the inherited
 * identity green cannot keep a segment at the mark floor on a rail that clears
 * the pressed wash (plan 503). The link is a step darker so it keeps the
 * secondary floor through the selection wash (plan 528). The four status inks
 * take one designed step darker so a native document's syntax captures keep the
 * body floor on the beige canvas, opaque and through the runtime's 3.5% ink
 * wash (plan 574). The values are held to `themeContrastFailures` in both modes
 * by `platform-recipes.test.ts`.
 */
export const xpPlatformRecipe = {
  types: { label: "Windows XP", sans: systemUiFont, mono: "Consolas" },
  structure: {
    density: "compact",
    radius: { sm: 2, md: 3, lg: 6, xl: 8 },
    motion: { fast: 120, normal: 160, slow: 240 },
  },
  colors: {
    light: {
      background: "#ECE9D8",
      card: "#FFFDF4",
      popover: "#FFFDF4",
      muted: "#F6F3E6",
      foreground: "#1A1A1A",
      mutedForeground: "#474130",
      border: "#C9C4B0",
      borderStrong: "#6E6957",
      input: "#FFFFFF",
      inputForeground: "#1A1A1A",
      hover: "#E4DFC9",
      active: "#DDD7BE",
      secondary: "#E2DCC7",
      secondaryForeground: "#1A1A1A",
      secondaryHover: "#D6CFB4",
      secondaryActive: "#BDB590",
      disabled: "#E7E2CE",
      disabledForeground: "#5A5445",
      primary: "#0054E3",
      primaryForeground: "#FFFFFF",
      primaryHover: "#0046BD",
      primaryActive: "#003A9C",
      primaryText: "#003FA8",
      // The native code surface: the inherited light status inks measured
      // 6.41–6.95:1 on the beige canvas, opaque and through the runtime's 3.5%
      // ink wash, under the 7:1 body floor. Each takes one designed step in its
      // own family (plan 574).
      infoText: "#173A88",
      successText: "#0E5135",
      warningText: "#4B3100",
      destructiveText: "#7E1D21",
      accent: "#C6DAFA",
      accentForeground: "#003C74",
      accentHover: "#BDD4F9",
      accentActive: "#B0CBF7",
      ring: "#0054E3",
      selection: "#5B8DE647",
      selected: "#BDD4FF",
      selectedForeground: "#003C74",
      // The hint clears the secondary floor on the row washes a field inside a
      // row paints, not only on the plain surfaces (plan 527).
      placeholder: "#5F5949",
      skeleton: "#CFC8AE",
      // XP's own Luna green: the identity `success` is too light to keep a
      // progress segment at the mark floor on the groove the row washes require
      // (plan 503). White stays well above the on-colour floor on it.
      success: "#0E6B40",
      track: "#D2CCB4",
      shadow: "#000000",
    },
    dark: windowsPlatformStyle.colors.dark,
  },
  elevation: windowsPlatformStyle.elevation,
} as const satisfies PlatformStyle;
