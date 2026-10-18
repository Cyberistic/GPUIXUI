/**
 * Guards the defect plan 551 fixed: `applyPlatformStyle` rebased a forced
 * `"default"` request on the default-level palette, but a colour the copied
 * style set to `undefined` was spread over that palette and then treated as
 * omitted by `extendTheme`, which fell back to the AAA base. The result mixed
 * two primary families — `primary` from AAA, `primaryHover` from the default
 * identity — and the package's own total check reported a direction failure.
 */
import { describe, expect, it } from "vitest";
import {
  applyPlatformStyle,
  extendTheme,
  getTheme,
  platformStyles,
  themeFailures,
  type PlatformStyle,
} from "./index.js";

const mixedStyle = (label: string): PlatformStyle => ({
  ...platformStyles.default,
  types: { ...platformStyles.default.types, label },
  colors: {
    light: { primary: undefined, background: "#FAFAFA" },
    dark: {},
  },
});

describe("an undefined platform colour inherits the requested palette", () => {
  it("takes the undefined role from the default palette, not the AAA base", () => {
    const base = getTheme("light", "high");
    const themed = applyPlatformStyle(
      base,
      mixedStyle("Mixed colours"),
      "default",
    );

    expect(themed.colors.primary).toBe(getTheme("light").colors.primary);
    expect(themed.colors.primary).not.toBe(base.colors.primary);
    expect(themeFailures(themed)).toEqual([]);
  });

  it("still applies the defined colour and declares the requested level", () => {
    const themed = applyPlatformStyle(
      getTheme("light", "high"),
      mixedStyle("Mixed colours"),
      "default",
    );

    expect(themed.colors.background).toBe("#FAFAFA");
    expect(themed.contrast).toBe("default");
  });

  it("keeps a same-level base's edits for roles the style does not name", () => {
    const brand = extendTheme(getTheme("light"), {
      colors: { secondary: "#123456" },
    });
    const themed = applyPlatformStyle(brand, mixedStyle("Mixed colours"));

    expect(themed.colors.secondary).toBe("#123456");
    expect(themed.colors.primary).toBe(getTheme("light").colors.primary);
  });
});
