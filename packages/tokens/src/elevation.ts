import { alpha } from "./color.js";
import type { Theme } from "./theme.js";

/** A drop shadow, structurally identical to GPUix's `StyleDesc.boxShadow`. */
export interface BoxShadow {
  /** Horizontal offset in pixels. */
  readonly offsetX: number;
  /** Vertical offset in pixels. */
  readonly offsetY: number;
  /** Blur radius in pixels. */
  readonly blurRadius: number;
  /** Spread radius in pixels. */
  readonly spreadRadius: number;
  /** Shadow colour: the theme's opaque tint at this level's alpha. */
  readonly color: string;
}

/**
 * One elevation level's geometry and opacity, before the theme's tint is
 * applied. The tint is the `shadow` colour role, so editing one role retints
 * every level; {@link elevationShadow} composes the two into the runtime's
 * five-field {@link BoxShadow}.
 */
export interface ElevationShape {
  /** Horizontal offset in pixels. */
  readonly offsetX: number;
  /** Vertical offset in pixels. */
  readonly offsetY: number;
  /** Blur radius in pixels. */
  readonly blurRadius: number;
  /** Spread radius in pixels. */
  readonly spreadRadius: number;
  /** Opacity of the `shadow` tint, `0…1`. */
  readonly alpha: number;
}

/**
 * Elevation levels. A level is a list so a web renderer can composite several
 * shadows; the native runtime paints **one** shadow per element, so a shipped
 * level carries at most one entry and a consumer reads it with
 * {@link elevationShadow}. `overlay` is reserved and empty.
 */
export interface Elevation {
  /** Resting cards and raised rows. */
  readonly sm: ElevationShape[];
  /** Menus, popovers and tooltips. */
  readonly md: ElevationShape[];
  /** Dialogs and command palettes. */
  readonly lg: ElevationShape[];
  /**
   * Reserved and empty. Nothing is designed for this level yet, so it paints
   * no shadow until one is.
   */
  readonly overlay: ElevationShape[];
}

/** The elevation levels in documentation order, the reserved `overlay` included. */
export const elevationLevels = ["sm", "md", "lg", "overlay"] as const;

/** A level a surface can be raised to. */
export type ElevationLevel = (typeof elevationLevels)[number];

const paint = (theme: Theme, shape: ElevationShape): BoxShadow => {
  const { alpha: opacity, ...geometry } = shape;
  return { ...geometry, color: alpha(theme.colors.shadow, opacity) };
};

/**
 * The shadow an elevation level paints. The runtime paints one shadow per
 * element, so a level resolves to its first entry; a reserved empty level paints
 * nothing and returns `undefined`, which `boxShadow` accepts.
 *
 * @example
 * ```tsx
 * <div style={{ boxShadow: elevationShadow(theme, "md") }} />
 * ```
 */
export function elevationShadow(
  theme: Theme,
  level: ElevationLevel,
): BoxShadow | undefined {
  const [shape] = theme.elevation[level];
  return shape === undefined ? undefined : paint(theme, shape);
}

/**
 * Every shadow an elevation level holds, resolved with the theme's tint — for a
 * web renderer that composites a list. The native runtime paints only the first;
 * use {@link elevationShadow} for it.
 *
 * @example
 * ```ts
 * const shadows = elevationShadows(theme, "lg");
 * ```
 */
export function elevationShadows(
  theme: Theme,
  level: ElevationLevel,
): ReadonlyArray<BoxShadow> {
  return theme.elevation[level].map((shape) => paint(theme, shape));
}

/** Light theme elevation. */
export const lightElevation: Elevation = {
  sm: [{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, alpha: 0.08 }],
  md: [
    { offsetX: 0, offsetY: 4, blurRadius: 12, spreadRadius: -2, alpha: 0.12 },
  ],
  lg: [
    { offsetX: 0, offsetY: 16, blurRadius: 40, spreadRadius: -8, alpha: 0.16 },
  ],
  overlay: [],
};

/** Dark theme elevation; darker and more opaque because the canvas is darker. */
export const darkElevation: Elevation = {
  sm: [{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, alpha: 0.4 }],
  md: [
    { offsetX: 0, offsetY: 8, blurRadius: 24, spreadRadius: -4, alpha: 0.65 },
  ],
  lg: [
    { offsetX: 0, offsetY: 24, blurRadius: 56, spreadRadius: -12, alpha: 0.8 },
  ],
  overlay: [],
};

/**
 * High-contrast dark elevation. The canvas is pure black, so a dark tint cannot
 * darken it: the identity dark set measured **1.000:1** on the canvas at every
 * level and 1.030:1 at the tightest on the card. This set paints with the light
 * tint instead — the same choice the AAA scrim makes (plan 099) — and its
 * alphas are its own, because a light tint is as potent on black as a dark tint
 * is on white. The geometry is the identity dark set's, so the feather ladder
 * still holds.
 */
export const highContrastDarkElevation: Elevation = {
  sm: [{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, alpha: 0.1 }],
  md: [
    { offsetX: 0, offsetY: 8, blurRadius: 24, spreadRadius: -4, alpha: 0.14 },
  ],
  lg: [
    { offsetX: 0, offsetY: 24, blurRadius: 56, spreadRadius: -12, alpha: 0.18 },
  ],
  overlay: [],
};
