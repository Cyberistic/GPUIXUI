/**
 * The platform `Mod` resolves against, mirroring `@gpuixui/tokens` `PlatformName`
 * so the two are interchangeable.
 */
export type Platform = "darwin" | "linux" | "win32" | "default";

/** The platform names `@tanstack/hotkeys` resolves `Mod` and glyphs against. */
export type TanstackPlatform = "mac" | "windows" | "linux";

/**
 * Map this package's `Platform` to the platform `@tanstack/hotkeys` understands.
 * `default` is a non-macOS host, so it folds into `linux` where `Mod` is Control.
 */
export const toTanstackPlatform = (platform: Platform): TanstackPlatform =>
  platform === "darwin" ? "mac" : platform === "win32" ? "windows" : "linux";
