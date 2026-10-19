/**
 * The bug this suite guards: the Default platform variant is the identity, but
 * its `types.mono` was the literal `Menlo`. On Linux and Windows the identity's
 * mono is that platform's installed family, so `applyPlatformStyle(base,
 * platformStyles.default)` named a macOS-only face — GPUix resolves `fontFamily`
 * by name and falls back silently — while `getPlatformTheme("default", mode)`
 * returned the right family. The suite simulates each platform because the box
 * that runs the tokens package is macOS, where the old value happened to match.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const originalPlatform = process.platform;

/** The family each shipped platform's identity must name. */
const installedMono = {
  linux: "DejaVu Sans Mono",
  win32: "Consolas",
} as const;

const simulate = (platform: string): void => {
  Object.defineProperty(process, "platform", {
    value: platform,
    configurable: true,
  });
  vi.resetModules();
};

afterEach(() => {
  Object.defineProperty(process, "platform", {
    value: originalPlatform,
    configurable: true,
  });
  vi.resetModules();
});

describe.each(["linux", "win32"] as const)(
  "the Default variant on %s",
  (platform) => {
    it("carries the identity's mono in every path that resolves it", async () => {
      simulate(platform);
      const { applyPlatformStyle, getPlatformTheme, getTheme } =
        await import("./theme.js");
      const { currentPlatform, platformStyles, platformTypes } =
        await import("./platforms.js");
      const expected = installedMono[platform];

      expect(currentPlatform).toBe(platform);
      (["light", "dark"] as const).forEach((mode) => {
        const identity = getTheme(mode);
        expect(identity.typography.mono).toBe(expected);
        expect(platformTypes.default.mono).toBe(expected);
        expect(platformStyles.default.types.mono).toBe(expected);
        expect(getPlatformTheme("default", mode).typography.mono).toBe(
          expected,
        );
        expect(
          applyPlatformStyle(identity, platformStyles.default).typography.mono,
        ).toBe(expected);
      });
    });
  },
);

it("falls back to the identity on a platform the library does not know", async () => {
  simulate("freebsd");
  const { currentPlatform, platformMonos, systemMonoFamily } =
    await import("./platform-types.js");

  expect(currentPlatform).toBe("default");
  expect(systemMonoFamily).toBe(platformMonos.darwin);
});
