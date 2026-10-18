/**
 * The shapes a platform style is made of. Kept separate from the registry in
 * `platforms.ts` so the per-platform style files can import the sentinel and the
 * shapes without a runtime cycle back through the registry.
 */

import type { ThemeColors } from "./color.js";
import type { Elevation } from "./elevation.js";
import type { Motion } from "./motion.js";
import type {
  AvatarSize,
  BorderWidth,
  DensityName,
  DensityOverrides,
  Dimensions,
  IconSize,
  Radius,
  Spacing,
} from "./scale.js";
import type { ThemeMode } from "./theme.js";
import type { TextStyle, TextRole } from "./typography.js";

/** GPUI's system UI font sentinel; it resolves to each platform's own UI font. */
export const systemUiFont = ".SystemUIFont";

/**
 * Every platform variant, in documentation and toggle order: macOS, Linux,
 * Windows and Default. `platformStyles` and `platformTypes` index the same set;
 * iterate this when order matters, such as the docs platform toggle.
 */
export const platformNames = ["darwin", "linux", "win32", "default"] as const;

/** A platform a GPUIXUI application runs on. */
export type PlatformName = (typeof platformNames)[number];

/**
 * Narrow unknown input — a stored preference or a URL parameter — to a platform
 * the library ships, `default` included. A consumer never retypes the names.
 */
export const isPlatformName = (value: unknown): value is PlatformName =>
  platformNames.some((name) => name === value);

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
  /**
   * Control density: a preset, or a preset with the metrics tuned inside it.
   * Omitted, the base theme's density is kept.
   */
  readonly density?: DensityName | DensityOverrides;
  /** Transition timings; easings are shared. */
  readonly motion?: Partial<Omit<Motion, "ease">>;
  /**
   * Type roles — size, leading and weight. Families stay in `types`, so a style
   * cannot name two different UI faces. Omitted roles inherit the identity.
   */
  readonly typography?: Partial<Record<TextRole, Partial<TextStyle>>>;
  /** Spacing steps. Omitted steps inherit the identity. */
  readonly spacing?: Partial<Spacing>;
  /** Border thicknesses. Omitted widths inherit the identity. */
  readonly borderWidth?: Partial<BorderWidth>;
  /** Named icon sizes. Omitted sizes inherit the identity. */
  readonly iconSize?: Partial<IconSize>;
  /** Avatar diameters. Omitted sizes inherit the identity. */
  readonly avatarSize?: Partial<AvatarSize>;
  /**
   * Overlay, field, chip, toast and preview-card metrics. Omitted metrics
   * inherit the identity.
   */
  readonly dimensions?: Partial<Dimensions>;
}

/**
 * A platform's visual variant of the identity. The shape is plain data, so a
 * consumer can copy a style file and change a value, then apply it with
 * `applyPlatformStyle`. The families travel with the style because a copied
 * variant must be able to name its own platform's mono face; `structure` carries
 * the rest of the shape — radii, density, motion and the numeric scales (type
 * roles, spacing, borders, icon/avatar sizes and component dimensions), so a
 * copied file owns the whole look, not only its palette.
 */
export interface PlatformStyle {
  /** Families and the human-readable label. */
  readonly types: PlatformType;
  /** Radii, density, motion and the numeric scales shared by both modes. */
  readonly structure: PlatformStyleStructure;
  /** Surface and accent roles per mode. Omitted roles inherit the identity. */
  readonly colors: Readonly<Record<ThemeMode, Partial<ThemeColors>>>;
  /**
   * Elevation levels per mode, before the theme's tint is applied. Omitted
   * levels inherit the identity.
   */
  readonly elevation: Readonly<Record<ThemeMode, Partial<Elevation>>>;
}
