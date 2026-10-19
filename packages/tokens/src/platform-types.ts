/**
 * The shapes a platform style is made of. Kept separate from the registry in
 * `platforms.ts` so the per-platform style files can import the sentinel and the
 * shapes without a runtime cycle back through the registry.
 */

import type { ThemeColors } from "./color.js";
import type { Elevation } from "./elevation.js";
import type { MotionOverrides } from "./motion.js";
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
 * A platform that carries its own style: every shipped platform except
 * `default`, which is the identity rather than a fourth look. Derived from
 * {@link PlatformName}, so a new platform joins the styled set by default.
 */
export type PlatformVariant = Exclude<PlatformName, "default">;

/**
 * Narrow unknown input — a stored preference or a URL parameter — to a platform
 * the library ships, `default` included. A consumer never retypes the names.
 */
export const isPlatformName = (value: unknown): value is PlatformName =>
  platformNames.some((name) => name === value);

/**
 * The monospace family each shipped platform installs. The owner for the
 * families the identity and the Default variant share: each platform style
 * names its own family from this record, and {@link systemMonoFamily} resolves
 * the running platform from the same values.
 */
export const platformMonos = {
  darwin: "Menlo",
  linux: "DejaVu Sans Mono",
  win32: "Consolas",
} as const satisfies Readonly<Record<PlatformVariant, string>>;

/** The identity's fallback where the runtime reports no known platform. */
const fallbackMono = platformMonos.darwin;

/**
 * Narrow a runtime platform string to a styled platform. A value the library
 * does not ship — another OS, a browser, or the `default` sentinel — is not a
 * variant.
 */
const isPlatformVariant = (value: string): value is PlatformVariant =>
  platformNames.some(
    (platform) => platform === value && platform !== "default",
  );

const knownPlatform = (name: string): PlatformName =>
  isPlatformVariant(name) ? name : "default";

/**
 * The platform this code runs on, or `default` where the runtime exposes none
 * (a browser) or one the library does not know.
 */
export const currentPlatform: PlatformName =
  typeof process === "undefined" ? "default" : knownPlatform(process.platform);

/**
 * The monospace family the identity's `typography.mono` names: the running
 * platform's installed family, so a theme never names a face the machine may
 * not have.
 */
export const systemMonoFamily: string =
  currentPlatform === "default" ? fallbackMono : platformMonos[currentPlatform];

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
  /** Transition timings and easings; omitted values inherit the identity. */
  readonly motion?: MotionOverrides;
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
