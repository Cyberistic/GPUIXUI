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
  /** Shadow colour, usually the theme's `shadow` role with alpha. */
  readonly color: string;
}

/**
 * Elevation levels. A level is a list so a web renderer can composite several
 * shadows; the native runtime paints **one** shadow per element, so a shipped
 * level carries at most one entry and a consumer reads it with
 * {@link elevationShadow}. `overlay` is reserved and empty.
 */
export interface Elevation {
  /** Resting cards and raised rows. */
  readonly sm: BoxShadow[];
  /** Menus, popovers and tooltips. */
  readonly md: BoxShadow[];
  /** Dialogs and command palettes. */
  readonly lg: BoxShadow[];
  /** Reserved for surfaces that need an additional inset ring. */
  readonly overlay: BoxShadow[];
}

/** A level a surface can be raised to. */
export type ElevationLevel = keyof Elevation;

/**
 * The shadow an elevation level paints. A level is designed as one shadow, so it
 * resolves to its first entry; a reserved empty level paints nothing and returns
 * `undefined`, which `boxShadow` accepts. The runtime also accepts a shadow list;
 * the scale does not use one, so a level cannot render half of itself.
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
  return theme.elevation[level][0];
}

/** Light theme elevation. */
export const lightElevation: Elevation = {
  sm: [
    {
      offsetX: 0,
      offsetY: 1,
      blurRadius: 2,
      spreadRadius: 0,
      color: "#191D2514",
    },
  ],
  md: [
    {
      offsetX: 0,
      offsetY: 4,
      blurRadius: 12,
      spreadRadius: -2,
      color: "#191D251F",
    },
  ],
  lg: [
    {
      offsetX: 0,
      offsetY: 16,
      blurRadius: 40,
      spreadRadius: -8,
      color: "#191D2529",
    },
  ],
  overlay: [],
};

/** Dark theme elevation; darker and more opaque because the canvas is darker. */
export const darkElevation: Elevation = {
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
      offsetY: 8,
      blurRadius: 24,
      spreadRadius: -4,
      color: "#000000A6",
    },
  ],
  lg: [
    {
      offsetX: 0,
      offsetY: 24,
      blurRadius: 56,
      spreadRadius: -12,
      color: "#000000CC",
    },
  ],
  overlay: [],
};
