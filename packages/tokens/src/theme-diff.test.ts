/**
 * Guards the gap plan 685 closes: `extendTheme` derives a theme but nothing
 * expressed an edited theme back as the overrides that produced it, so a
 * runtime editor could only persist a whole theme object — the boundary the
 * catalogue deliberately leaves to the application's `Schema`. `themeOverrides`
 * is the inverse, and these cases hold it to the promise a copy-and-own editor
 * relies on: applying the returned set to its base reproduces the edited theme,
 * and nothing unchanged is emitted.
 */
import { describe, expect, it } from "vitest";
import {
  applyPlatformStyle,
  extendTheme,
  getPlatformTheme,
  getTheme,
  lightTheme,
  platformStyles,
  shippedThemes,
  themeOverrides,
  type Theme,
  type ThemeOverrides,
} from "./index.js";
import {
  exportedBase,
  exportedBezierOverrides,
  exportedBezierTheme,
  exportedOverrides,
  exportedTheme,
} from "./theme-diff.example.js";

/** The overrides for a same-mode pair, failing the test on an unexpected absence. */
const overridesOf = (base: Theme, theme: Theme): ThemeOverrides => {
  const overrides = themeOverrides(base, theme);
  if (overrides === undefined) {
    throw new Error("themeOverrides returned undefined for a same-mode pair");
  }
  return overrides;
};

/** `theme` rebuilt from `base` through the diff. */
const roundTrip = (base: Theme, theme: Theme): Theme =>
  extendTheme(base, overridesOf(base, theme));

describe("every shipped theme round-trips over the identity of its mode", () => {
  it("reproduces all shipped sets", () => {
    shippedThemes.forEach(({ theme }) => {
      const base = getTheme(theme.mode);
      expect(roundTrip(base, theme), `${theme.name}`).toEqual(theme);
    });
  });

  it("reproduces a platform style over another platform's theme", () => {
    (["dark", "light"] as const).forEach((mode) => {
      const darwin = getPlatformTheme("darwin", mode);
      const win32 = getPlatformTheme("win32", mode);

      expect(roundTrip(darwin, win32)).toEqual(win32);
      expect(roundTrip(win32, darwin)).toEqual(darwin);
    });
  });

  it("reproduces an explicit default target over a high-contrast base", () => {
    const base = getTheme("dark", "high");
    const target = applyPlatformStyle(base, platformStyles.win32, "default");
    const overrides = overridesOf(base, target);

    // The claim travels with the palette it names, or the round trip would
    // declare high while carrying default colours.
    expect(overrides.contrast).toBe("default");
    expect(extendTheme(base, overrides)).toEqual(target);
  });

  it("reproduces an edit that touches every expressible group", () => {
    const base = getTheme("light");
    const target = extendTheme(base, {
      name: "Everything",
      contrast: "high",
      colors: { primary: "#101820", primaryText: "#C9BDFF" },
      typography: { sans: "Helvetica Neue", body: { lineHeight: 22 } },
      spacing: { md: 9 },
      radius: { md: 7 },
      density: {
        preset: "compact",
        controlHeight: { md: 30 },
        rowHeight: 30,
      },
      dimensions: { toastWidth: 400 },
      elevation: {
        md: [
          {
            offsetX: 0,
            offsetY: 6,
            blurRadius: 16,
            spreadRadius: 0,
            alpha: 0.18,
          },
        ],
      },
      motion: {
        fast: 150,
        ease: { enter: "linear", standard: [0.4, 0, 0.2, 1] },
      },
      borderWidth: { thin: 1.5 },
      iconSize: { md: 18 },
      avatarSize: { md: 34 },
    });

    expect(roundTrip(base, target)).toEqual(target);
  });
});

describe("the diff is minimal", () => {
  it("returns nothing for a theme against itself", () => {
    expect(themeOverrides(lightTheme, lightTheme)).toEqual({});
  });

  it("names a preset whose metrics are untouched", () => {
    const target = extendTheme(lightTheme, { density: "compact" });

    expect(themeOverrides(lightTheme, target)).toEqual({ density: "compact" });
  });

  it("expresses a tuned preset against the preset, size by size", () => {
    const target = extendTheme(lightTheme, {
      density: { preset: "compact", controlHeight: { md: 30 }, rowHeight: 30 },
    });

    expect(themeOverrides(lightTheme, target)).toEqual({
      density: { preset: "compact", controlHeight: { md: 30 }, rowHeight: 30 },
    });
  });

  it("emits one spacing step when one changes", () => {
    const target = extendTheme(lightTheme, { spacing: { md: 9 } });

    expect(themeOverrides(lightTheme, target)).toEqual({ spacing: { md: 9 } });
  });

  it("emits one type field when one changes", () => {
    const target = extendTheme(lightTheme, {
      typography: { body: { lineHeight: 22 } },
    });

    expect(themeOverrides(lightTheme, target)).toEqual({
      typography: { body: { lineHeight: 22 } },
    });
  });
});

describe("a value is not a member set", () => {
  it("carries a cubic-bezier easing, whose shipped value is a name", () => {
    // The base's phase is `"easeOut"` and the edit's is a tuple: one member
    // whose value kind changed. Refusing it made a documented edit unstorable.
    expect(exportedBase.motion.ease.enter).toBe("easeOut");
    expect(exportedBezierOverrides).toEqual({
      motion: { ease: { enter: [0.4, 0, 0.2, 1] } },
    });
    expect(extendTheme(exportedBase, exportedBezierOverrides ?? {})).toEqual(
      exportedBezierTheme,
    );
  });

  it("still carries a named easing", () => {
    const named = extendTheme(exportedBase, {
      motion: { ease: { enter: "linear" } },
    });

    expect(overridesOf(exportedBase, named)).toEqual({
      motion: { ease: { enter: "linear" } },
    });
  });
});

describe("a mode mismatch is not a diff", () => {
  it("returns undefined instead of a theme that cannot be rebuilt", () => {
    expect(themeOverrides(lightTheme, getTheme("dark"))).toBeUndefined();
    expect(themeOverrides(getTheme("dark"), lightTheme)).toBeUndefined();
  });
});

describe("the executed example", () => {
  it("carries exactly the overrides it was built from", () => {
    expect(exportedOverrides).toEqual({
      name: "Exported",
      density: "compact",
      radius: { md: 8 },
      typography: { body: { lineHeight: 22 } },
    });
  });

  it("rebuilds the exported theme", () => {
    expect(
      extendTheme(exportedBase, overridesOf(exportedBase, exportedTheme)),
    ).toEqual(exportedTheme);
  });
});
