import { palette } from "../color.js";
import {
  platformMonos,
  systemUiFont,
  type PlatformStyle,
} from "../platform-types.js";

/**
 * Linux (GNOME / Adwaita): Adwaita's blue accent (`#1C71D8` light, `#78AEED`
 * dark), warm grey surfaces, roomier corners and slightly longer transitions.
 * `sans` stays GPUI's system sentinel; `mono` is the family GNOME installs. The
 * dark selection wash uses the light accent as its base so white text keeps the
 * body floor on the fills a row paints (plan 081). The dark secondary grey is
 * one step lighter so secondary text keeps its floor through the selection wash
 * on the selected row (plan 087). The accent's readable text
 * step is `#12488F` light and `#B4D5F7` dark; the fill's `#1C71D8` is 3.51:1 on
 * the pressed wash (plan 082). The dark boundary is one step lighter so a
 * checkbox edge clears the floor on the selected row (plan 084). Elevation
 * levels apply their own alpha to the `shadow` tint, so a copied style retints
 * all three by editing one role (plan 085). The dark soft destructive fill is a
 * step darker so the light-accent wash stays visible on it (plan 091).
 * The dark skeleton is one step off the pressed wash, so a loading row keeps its
 * placeholder visible (plan 094). The filled-control hover and pressed steps are
 * designed opaque roles in Adwaita's blue and grey families, not alpha
 * composites (plan 097). The light quiet panel is a step toward the card, so a
 * sidebar wash and a neutral filled control stay perceivable on it (plan 309),
 * and the pressed neutral step sits one designed step below the divider so an
 * outlined control keeps its edge while pressed (plan 318). The dark accent
 * foreground is a step lighter, so selecting the label on the accent fill keeps
 * its floor through the inverse veil (plan 382). The dark selected row is one
 * designed step darker than plan 381 left it, so the row's title (`foreground`)
 * keeps the 7:1 body floor through the selection wash while the row stays a
 * 1.216:1 step past its accent wash; the wash itself cannot soften further — at
 * the alpha the title needs it measures 1.052:1 on the fill (plan 506). The hint
 * clears the secondary floor on the row washes a field inside a row paints
 * (plan 527). The dark link is a step lighter so it keeps the secondary floor
 * through the selection wash (plan 528).
 */
export const linuxPlatformStyle = {
  types: {
    label: "Linux",
    sans: systemUiFont,
    mono: platformMonos.linux,
  },
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
      muted: "#FBFBFA",
      mutedForeground: "#4A4844",
      border: "#D4D2CF",
      borderStrong: "#77767B",
      input: "#FFFFFF",
      inputForeground: "#1D1D1D",
      hover: "#EAE9E8",
      active: "#DEDDDB",
      secondary: "#E8E7E6",
      secondaryForeground: "#1D1D1D",
      secondaryHover: "#DEDDDB",
      secondaryActive: "#CAC8C6",
      primary: "#1C71D8",
      primaryForeground: "#FFFFFF",
      primaryHover: "#1A65C0",
      primaryActive: "#16518D",
      primaryText: "#12488F",
      accent: "#E1ECFA",
      accentForeground: "#12488F",
      accentHover: "#D8E6F9",
      accentActive: "#CFE0F8",
      ring: "#1C71D8",
      selection: "#1C71D833",
      selected: "#D7E6F9",
      selectedActive: "#E1ECFA",
      selectedForeground: "#0F3D77",
      // The hint clears the secondary floor on the row washes a field inside a
      // row paints, not only on the plain surfaces (plan 527).
      placeholder: "#615F5C",
      track: "#D8D8D8",
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
      // The card, popover and quiet panel are #303030, so the fill is its own
      // step above them (1.126:1) rather than the identity's neutral-850 (plan
      // 737).
      disabled: "#383838",
      skeleton: "#585858",
      track: "#2A2A2A",
      secondary: "#3A3A3A",
      secondaryForeground: "#FFFFFF",
      secondaryHover: "#434343",
      secondaryActive: "#4D4D4D",
      primary: "#78AEED",
      primaryForeground: "#000000",
      primaryHover: "#99C1F1",
      primaryActive: "#A9CCF5",
      primaryText: "#B4D5F7",
      accent: "#1B3A5C",
      accentForeground: "#B4D5F7",
      accentHover: "#20446C",
      accentActive: "#264C77",
      ring: "#78AEED",
      selection: "#1C71D833",
      selected: "#27476A",
      selectedActive: "#1E3651",
      selectedForeground: "#D6E7FA",
      placeholder: "#B7B6B2",
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
