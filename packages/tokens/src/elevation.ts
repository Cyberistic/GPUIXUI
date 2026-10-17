/** A drop shadow, structurally compatible with GPUix's `StyleDesc.boxShadow`. */
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
  /** Draw inside the border box. */
  readonly inset?: boolean;
}

/** Elevation levels. Each level is a shadow list painted in order. */
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
