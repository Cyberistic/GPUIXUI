/**
 * Guards the defect plan 301 fixed: `applyPlatformStyle(highBase, style,
 * "default")` applied the platform's default palette but kept the base's
 * `contrast: "high"` declaration, so the theme claimed floors it could not meet
 * and the library's own checker reported 46 failures for a call made on purpose.
 * The returned declaration now follows the palette the theme actually carries.
 */
import { describe, expect, it } from "vitest";
import { themeContrastFailures } from "./contrast.js";
import { platformStyles, type PlatformStyle } from "./platforms.js";
import {
  applyPlatformStyle,
  getTheme,
  highContrastLightTheme,
  lightTheme,
} from "./theme.js";

describe("applied platform style contrast", () => {
  it("declares default when the platform palette replaces an AAA one", () => {
    const dropped = applyPlatformStyle(
      getTheme("light", "high"),
      platformStyles.linux,
      "default",
    );

    expect(dropped.contrast).toBe("default");
    // The mixed palette keeps the AAA roles the style does not override, so the
    // checker still reports the one divider they no longer satisfy; what the fix
    // removes is the AAA judgement of a default palette.
    const declared = themeContrastFailures(dropped);
    const aaa = themeContrastFailures(dropped, "high");
    expect(declared.length).toBeLessThan(aaa.length);
    expect(declared.every(({ floor }) => floor < 7)).toBe(true);
  });

  it("cannot claim high when only shape was applied", () => {
    const raised = applyPlatformStyle(lightTheme, platformStyles.linux, "high");

    expect(raised.contrast).toBe("default");
    expect(raised.colors).toEqual(lightTheme.colors);
    expect(themeContrastFailures(raised)).toEqual([]);
  });

  it("keeps the base's declaration on the default call", () => {
    const themed = applyPlatformStyle(
      highContrastLightTheme,
      platformStyles.linux,
    );

    expect(themed.contrast).toBe("high");
    expect(themed.colors).toEqual(highContrastLightTheme.colors);
    expect(themeContrastFailures(themed)).toEqual([]);
  });

  it("keeps the base's declaration for a shape-only style", () => {
    const shapeOnly: PlatformStyle = {
      ...platformStyles.default,
      types: { ...platformStyles.default.types, label: "Shape" },
      colors: { light: {}, dark: {} },
    };

    const themed = applyPlatformStyle(
      highContrastLightTheme,
      shapeOnly,
      "default",
    );

    expect(themed.contrast).toBe("high");
    expect(themed.colors).toEqual(highContrastLightTheme.colors);
  });
});
