import type { PlatformName } from "@gpuixui/tokens";

/** The query parameter and storage key that remember a platform choice. */
export const PLATFORM_PARAM = "platform";
export const PLATFORM_STORAGE_KEY = "gpuixui:platform";

/** The toggle order: the three real desktops, then the library's default. */
export const platformNames = [
  "darwin",
  "linux",
  "win32",
  "default",
] as const satisfies ReadonlyArray<PlatformName>;

export const isPlatformName = (value: string | null): value is PlatformName =>
  value === "darwin" ||
  value === "linux" ||
  value === "win32" ||
  value === "default";

export const platformFromParams = (
  params: URLSearchParams,
): PlatformName | undefined => {
  const value = params.get(PLATFORM_PARAM);
  return isPlatformName(value) ? value : undefined;
};

/** Corrupt or absent storage is "no memory", never a failure. */
export const storedPlatform = (
  value: string | null,
): PlatformName | undefined => (isPlatformName(value) ? value : undefined);

/**
 * A shared URL wins over a stale stored choice, which wins over the default —
 * the default theme is the absence of a platform, not a fourth style.
 */
export const resolvePlatform = (
  fromUrl: PlatformName | undefined,
  fromStorage: PlatformName | undefined,
): PlatformName => fromUrl ?? fromStorage ?? "default";

/**
 * `default` removes the parameter so canonical URLs stay clean; every other
 * platform sets it. Unrelated query state survives.
 */
export const applyPlatformToSearch = (
  search: string,
  platform: PlatformName,
): string => {
  const params = new URLSearchParams(search);
  if (platform === "default") params.delete(PLATFORM_PARAM);
  else params.set(PLATFORM_PARAM, platform);
  const next = params.toString();
  return next === "" ? "" : `?${next}`;
};
