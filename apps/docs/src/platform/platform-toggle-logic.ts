import type { PlatformName } from "@gpuixui/tokens";

/** The direction an arrow key moves the choice. */
export type PlatformStep = "next" | "previous";

/**
 * Each platform's neighbour in both directions. `platformNames` owns the order;
 * `platform-toggle-logic.test.ts` walks this table and proves it agrees.
 */
export const platformSteps: Readonly<
  Record<PlatformName, Readonly<Record<PlatformStep, PlatformName>>>
> = {
  darwin: { next: "linux", previous: "default" },
  linux: { next: "win32", previous: "darwin" },
  win32: { next: "default", previous: "linux" },
  default: { next: "darwin", previous: "win32" },
};

const ARROW_STEP: Readonly<Record<string, PlatformStep>> = {
  ArrowRight: "next",
  ArrowDown: "next",
  ArrowLeft: "previous",
  ArrowUp: "previous",
};

/** The choice an arrow key moves to; any other key is not a navigation. */
export const movePlatform = (
  current: PlatformName,
  key: string,
): PlatformName | undefined => {
  const step = ARROW_STEP[key];
  return step === undefined ? undefined : platformSteps[current][step];
};
