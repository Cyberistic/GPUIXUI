/**
 * The shapes a platform style is made of. Kept separate from the registry in
 * `platforms.ts` so the per-platform style files can import the sentinel and the
 * shapes without a runtime cycle back through the registry.
 */

import type { ThemeColors } from "./color.js";
import type { Elevation } from "./elevation.js";
import type { Motion } from "./motion.js";
import type { DensityName, Radius } from "./scale.js";
import type { ThemeMode } from "./theme.js";

/** GPUI's system UI font sentinel; it resolves to each platform's own UI font. */
export const systemUiFont = ".SystemUIFont";

/** A platform a GPUIXUI application runs on. */
export type PlatformName = "darwin" | "linux" | "win32" | "default";

/** The families one platform's type resolves to. */
export interface PlatformType {
  /** Human-readable name for documentation and previews. */
  readonly label: string;
  /** UI font family. */
  readonly sans: string;
  /** The monospace family the platform has installed. */
  readonly mono: string;
}

/** Mode-independent shape a platform style applies. */
export interface PlatformStyleStructure {
  /** Corner radii. Omitted radii inherit the identity. */
  readonly radius?: Partial<Radius>;
  /** Control density preset. */
  readonly density?: DensityName;
  /** Transition timings; easings are shared. */
  readonly motion?: Partial<Omit<Motion, "ease">>;
}

/**
 * A platform's visual variant of the identity. The shape is plain data, so a
 * consumer can copy a style file and change a value, then apply it with
 * `applyPlatformStyle`. The families travel with the style because a copied
 * variant must be able to name its own platform's mono face.
 */
export interface PlatformStyle {
  /** Families and the human-readable label. */
  readonly types: PlatformType;
  /** Radii, density and motion shared by both modes. */
  readonly structure: PlatformStyleStructure;
  /** Surface and accent roles per mode. Omitted roles inherit the identity. */
  readonly colors: Readonly<Record<ThemeMode, Partial<ThemeColors>>>;
  /** Shadow levels per mode. Omitted levels inherit the identity. */
  readonly elevation: Readonly<Record<ThemeMode, Partial<Elevation>>>;
}
