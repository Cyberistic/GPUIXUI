export type Platform = "darwin" | "linux" | "win32" | "default";

export type TanstackPlatform = "mac" | "windows" | "linux";

export const toTanstackPlatform = (platform: Platform): TanstackPlatform =>
  platform === "darwin" ? "mac" : platform === "win32" ? "windows" : "linux";
