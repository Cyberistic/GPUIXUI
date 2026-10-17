/**
 * Platform type styles.
 *
 * GPUix takes one `fontFamily` string per element, and GPUI resolves the
 * `.SystemUIFont` sentinel to the operating system's own UI font, so the UI face
 * follows the platform at runtime. What a component cannot know is the platform's
 * monospace family, or which platform a preview is showing. Both come from here.
 */

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

/**
 * Type styles per platform. `sans` is GPUI's sentinel everywhere — GPUI maps it
 * to the platform's own UI font, so a theme never names a face the operating
 * system may not have. `mono` names the family each platform installs.
 * `default` covers a platform the library does not know.
 */
export const platformTypes: Readonly<Record<PlatformName, PlatformType>> = {
  darwin: { label: "macOS", sans: systemUiFont, mono: "Menlo" },
  linux: { label: "Linux", sans: systemUiFont, mono: "DejaVu Sans Mono" },
  win32: { label: "Windows", sans: systemUiFont, mono: "Consolas" },
  default: { label: "Default", sans: systemUiFont, mono: "Menlo" },
};

const knownPlatform = (name: string): PlatformName =>
  name === "darwin" || name === "linux" || name === "win32" ? name : "default";

/**
 * The platform the code runs on, or `default` when it is not one the library
 * knows — a browser, for example.
 */
export const currentPlatform: PlatformName =
  typeof process === "undefined" ? "default" : knownPlatform(process.platform);

/** The platform's monospace family. */
export const systemMonoFamily: string = platformTypes[currentPlatform].mono;
