/**
 * Guards the defect fixed in plan 051: the family a platform uses was a private
 * `monoByPlatform` record inside `typography.ts` and the UI face was an
 * unverified literal, so nothing could ask for a platform's type, a preview
 * could not obtain a real theme, and nothing stopped a theme naming a CSS comma
 * stack — which GPUix 0.10.0 cannot resolve, because `fontFamily` is one family.
 */

import { describe, expect, it } from "vitest";
import {
  currentPlatform,
  platformTypes,
  systemMonoFamily,
  systemUiFont,
  type PlatformName,
} from "./platforms.js";
import { textStyle } from "./styles.js";
import { highContrastDarkTheme, lightTheme, platformTheme } from "./theme.js";
import { typography } from "./typography.js";

const platforms: ReadonlyArray<PlatformName> = [
  "darwin",
  "linux",
  "win32",
  "default",
];

describe("platformTypes", () => {
  it("describes every platform the library knows, and nothing else", () => {
    expect(Object.keys(platformTypes).toSorted()).toEqual(platforms.toSorted());
  });

  it("names each platform with a label and one family per role", () => {
    platforms.forEach((platform) => {
      const type = platformTypes[platform];
      expect(type.label, platform).not.toBe("");
      expect(type.sans, platform).not.toBe("");
      expect(type.mono, platform).not.toBe("");
    });
  });

  it("uses the system UI sentinel for sans", () => {
    platforms.forEach((platform) => {
      expect(platformTypes[platform].sans, platform).toBe(systemUiFont);
    });
  });

  it("names a single family, never a comma stack", () => {
    platforms.forEach((platform) => {
      expect(platformTypes[platform].mono, platform).not.toContain(",");
    });
  });

  it("gives each real platform its own monospace family", () => {
    const monos = (["darwin", "linux", "win32"] as const).map(
      (platform) => platformTypes[platform].mono,
    );
    expect(new Set(monos).size).toBe(monos.length);
    expect(platformTypes.default.mono).toBe(platformTypes.darwin.mono);
  });
});

describe("currentPlatform", () => {
  it("is one of the known platforms", () => {
    expect(platforms).toContain(currentPlatform);
  });

  it("resolves the monospace family the process should use", () => {
    expect(systemMonoFamily).toBe(platformTypes[currentPlatform].mono);
  });
});

describe("the default typography", () => {
  it("takes its families from the platform table", () => {
    expect(typography.sans).toBe(systemUiFont);
    expect(typography.mono).toBe(systemMonoFamily);
  });
});

describe("platformTheme", () => {
  it("changes only the families and the name", () => {
    const themed = platformTheme(lightTheme, "win32");
    expect(themed.mode).toBe(lightTheme.mode);
    expect(themed.name).toContain(platformTypes.win32.label);
    expect(themed.typography.mono).toBe("Consolas");
    expect(themed.typography.sans).toBe(systemUiFont);
    expect(themed.colors).toEqual(lightTheme.colors);
    expect(themed.spacing).toEqual(lightTheme.spacing);
    expect(themed.radius).toEqual(lightTheme.radius);
    expect(themed.density).toEqual(lightTheme.density);
    expect(themed.elevation).toEqual(lightTheme.elevation);
    expect(themed.borderWidth).toEqual(lightTheme.borderWidth);
    expect(themed.iconSize).toEqual(lightTheme.iconSize);
    expect(themed.typography.body).toEqual(lightTheme.typography.body);
  });

  it("leaves the base theme untouched", () => {
    const before = { ...lightTheme.typography };
    platformTheme(lightTheme, "linux");
    expect(lightTheme.typography).toEqual(before);
    expect(lightTheme.typography.mono).toBe(systemMonoFamily);
  });

  it("keeps a high-contrast theme's contrast values", () => {
    const themed = platformTheme(highContrastDarkTheme, "linux");
    expect(themed.mode).toBe("dark");
    expect(themed.colors).toEqual(highContrastDarkTheme.colors);
    expect(themed.typography.mono).toBe("DejaVu Sans Mono");
  });

  it("resolves a mono role to the platform family", () => {
    const themed = platformTheme(lightTheme, "linux");
    expect(textStyle(themed, "code").fontFamily).toBe("DejaVu Sans Mono");
    expect(textStyle(themed, "body").fontFamily).toBe(systemUiFont);
  });
});
