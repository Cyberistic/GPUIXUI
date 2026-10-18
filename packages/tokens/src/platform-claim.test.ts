/**
 * Guards the defect plan 301 fixed: `applyPlatformStyle(highBase, style,
 * "default")` applied the platform's default palette but kept the base's
 * `contrast: "high"` declaration, so the theme claimed floors it could not meet
 * and the library's own checker reported 46 failures for a call made on purpose.
 * The returned declaration now follows the palette the theme actually carries,
 * and plan 373 made that palette whole — the roles the style does not name come
 * from the default-level identity, not from the AAA base being replaced.
 *
 * Plan 323 closes the same claim one input shape over: a colour key set to
 * `undefined` is not a colour override, so it must not downgrade an AAA theme's
 * declaration while the palette still inherits the AAA roles.
 *
 * Plan 541 makes the requested level total. Before it, a `"high"` request on a
 * default base applied only shape and returned a `default` theme: the caller
 * asked for the accessibility level and the result declared the other one, with
 * no diagnostic. A request now supplies the palette it names — `"high"` builds
 * the AAA set, whose tint keeps the opacity designed against it — so the
 * declaration is still true for the palette the theme carries, and the case
 * below proves the AAA floors hold rather than that high was refused.
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
    // The palette is replaced as a set (plan 373), so the default-level floors
    // hold; the AAA judgement still has failures to report, which proves the
    // theme no longer carries the AAA colours.
    expect(themeContrastFailures(dropped)).toEqual([]);
    expect(themeContrastFailures(dropped, "high").length).toBeGreaterThan(0);
  });

  it("builds the AAA palette for a high request instead of refusing it", () => {
    const raised = applyPlatformStyle(lightTheme, platformStyles.linux, "high");

    // Plan 541: the request supplies the palette, so the theme carries the
    // level it declares instead of silently returning the base's palette.
    expect(raised.contrast).toBe("high");
    expect(raised.colors).toEqual(getTheme("light", "high").colors);
    expect(themeContrastFailures(raised)).toEqual([]);
    expect(themeContrastFailures(raised, "high")).toEqual([]);
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

  it("does not count an undefined colour as an override", () => {
    const style: PlatformStyle = {
      ...platformStyles.default,
      types: { ...platformStyles.default.types, label: "Undefined colour" },
      colors: { light: { primary: undefined }, dark: {} },
    };

    const themed = applyPlatformStyle(highContrastLightTheme, style, "default");

    expect(themed.contrast).toBe("high");
    expect(themed.colors).toEqual(highContrastLightTheme.colors);
    expect(themeContrastFailures(themed)).toEqual([]);
  });

  it("declares default when one colour beside an undefined one applies", () => {
    const style: PlatformStyle = {
      ...platformStyles.default,
      types: { ...platformStyles.default.types, label: "One colour" },
      colors: {
        light: {
          primary: undefined,
          background: "#FAFAFA",
        },
        dark: {},
      },
    };

    const themed = applyPlatformStyle(highContrastLightTheme, style, "default");

    expect(themed.contrast).toBe("default");
    expect(themed.colors.background).toBe("#FAFAFA");
  });
});
