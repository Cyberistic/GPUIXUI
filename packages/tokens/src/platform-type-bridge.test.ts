/**
 * The bug these cases guard: plan 063 removed `platformTheme` when platform
 * styles replaced platform type choices, but the primitives workstream merged
 * on `master` still imports it in `runtime/theme-axes.runtime.test.tsx`. The
 * deprecated bridge must keep the pre-063 contract — the two font families and
 * the display name, nothing else — so the merged workspace compiles and an old
 * consumer's pixels do not change. Case "not a style variant" fails if someone
 * reimplements the bridge as `getPlatformTheme`/`applyPlatformStyle`, which
 * would silently apply platform colours and shape to code that only asked for a
 * typeface.
 */
import { describe, expect, it } from "vitest";
import { platformNames, platformTypes } from "./platforms.js";
import { textStyle } from "./styles.js";
import {
  getPlatformTheme,
  highContrastDarkTheme,
  lightTheme,
  platformTheme,
} from "./theme.js";

const scaleGroups = [
  "spacing",
  "radius",
  "density",
  "elevation",
  "motion",
  "borderWidth",
  "iconSize",
  "avatarSize",
] as const;

describe("platformTheme (deprecated type-only bridge)", () => {
  it("changes the families and the name for every platform", () => {
    platformNames.forEach((platform) => {
      const themed = platformTheme(lightTheme, platform);
      expect(themed.typography.mono, platform).toBe(
        platformTypes[platform].mono,
      );
      expect(themed.typography.sans, platform).toBe(
        platformTypes[platform].sans,
      );
      expect(themed.name, platform).toContain(platformTypes[platform].label);
    });
  });

  it("inherits every other group from the base", () => {
    platformNames.forEach((platform) => {
      const themed = platformTheme(lightTheme, platform);
      expect(themed.colors, platform).toEqual(lightTheme.colors);
      expect(themed.mode, platform).toBe(lightTheme.mode);
      expect(themed.contrast, platform).toBe(lightTheme.contrast);
      scaleGroups.forEach((group) => {
        expect(themed[group], `${platform} ${group}`).toEqual(
          lightTheme[group],
        );
      });
      expect(themed.typography.body, platform).toEqual(
        lightTheme.typography.body,
      );
    });
  });

  it("resolves through textStyle, which is what a component paints", () => {
    expect(
      textStyle(platformTheme(lightTheme, "linux"), "code").fontFamily,
    ).toBe(platformTypes.linux.mono);
    expect(
      textStyle(platformTheme(lightTheme, "win32"), "code").fontFamily,
    ).toBe(platformTypes.win32.mono);
    expect(platformTypes.win32.mono).not.toBe(platformTypes.linux.mono);
  });

  it("is not a style variant", () => {
    const themed = platformTheme(lightTheme, "win32");
    const variant = getPlatformTheme("win32", "light");
    expect(themed.colors.primary).toBe(lightTheme.colors.primary);
    expect(themed.radius.md).toBe(lightTheme.radius.md);
    expect(variant.colors.primary).not.toBe(lightTheme.colors.primary);
    expect(variant.radius.md).not.toBe(lightTheme.radius.md);
  });

  it("keeps a high-contrast base's palette and declaration", () => {
    const themed = platformTheme(highContrastDarkTheme, "win32");
    expect(themed.mode).toBe("dark");
    expect(themed.contrast).toBe("high");
    expect(themed.colors).toEqual(highContrastDarkTheme.colors);
  });

  it("does not mutate its base", () => {
    const before = { ...lightTheme.typography };
    platformTheme(lightTheme, "linux");
    expect(lightTheme.typography).toEqual(before);
  });
});
