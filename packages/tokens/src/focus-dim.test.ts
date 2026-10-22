/**
 * Guards the dim the runtime paints on every other focusable while one control
 * has keyboard focus.
 *
 * The bug this holds: `keyboardFocusDim` is on by default in `@gpuix/native`,
 * so pressing Tab fades every other control — fill and text — and no contract
 * measured it, because `contrastRatio` refuses a translucent result. The
 * composite is the disabled fade's with a different share, and the factor is
 * measured rather than assumed: the `keyboard-focus-dim` window capture paints
 * the dark theme's `muted` fill `#222730` as `#181C23` over the page and its
 * `foreground` text `#EEF1F5` as `#6E7177` over that fill, which is
 * `blend(colour, behind, 1 - 0.4)`.
 *
 * It also holds the runtime's one exclusion: `renderer.rs`'s
 * `keyboard_focus_path` returns no path when the focused element is an
 * `input`/`textarea` ("typing is keyboard input too, and dimming the window
 * while someone types is noise"), so a field dims nothing. The token pages
 * claimed every other focusable fades, full stop; the `filled-action-dim` probe
 * measured the opposite — tabbing into a shipped `Input` left a ghost action's
 * 611 label pixels untouched.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { auditTheme } from "./audit.js";
import { darkColors, lightColors } from "./color.js";
import { contrastRatio } from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import { fadedPair } from "./fade.js";
import {
  keyboardDimFailures,
  keyboardDimPairs,
  keyboardFocusDimOpacity,
} from "./focus-dim.js";
import { platformNames } from "./platforms.js";
import { retroNames, retroTheme } from "./retro.js";
import {
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  platformTheme,
  themes,
} from "./theme.js";

/** Every shipped theme, then every style in both modes and both editions. */
const allThemes = [
  lightTheme,
  darkTheme,
  highContrastLightTheme,
  highContrastDarkTheme,
  ...platformNames.flatMap((platform) => [
    platformTheme(themes.light, platform),
    platformTheme(themes.dark, platform),
  ]),
  ...retroNames.flatMap((look) => [
    retroTheme(lightTheme, look),
    retroTheme(darkTheme, look),
  ]),
] as const;

/**
 * Every surface that describes the dim. `node:fs` is deliberate, as in
 * `fonts.test.ts` and `docs.test.ts`: this checks the repository's own prose,
 * and the package keeps zero runtime dependencies. Whitespace is flattened so a
 * Markdown line wrap cannot hide a missing clause.
 */
const dimSurfaces = (): Record<string, string> => {
  const read = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8");
  const flatten = (text: string): string => text.replace(/\s+/g, " ");
  const inventory = read("../../../COMPONENTS.md")
    .split("\n")
    .find((line) => line.startsWith("| Keyboard focus dim |"));
  return {
    "docs/tokens.md": flatten(read("../../../docs/tokens.md")),
    "docs/design-system.md": flatten(read("../../../docs/design-system.md")),
    "README.md": flatten(read("../README.md")),
    "COMPONENTS.md": flatten(inventory ?? ""),
  };
};

describe("the dim a focused field casts", () => {
  it("states the exclusion and the runtime's reason on every surface", () => {
    Object.entries(dimSurfaces()).forEach(([name, text]) => {
      expect(text, `${name} no longer states the field exemption`).toContain(
        "a focused `input`/`textarea` dims nothing",
      );
      expect(text, `${name} no longer gives the runtime's reason`).toContain(
        "typing is keyboard input too",
      );
    });
  });
});

describe("the dim the gate and the actions have adopted", () => {
  it("says the report is in the gate and the filled actions opt out", () => {
    // The inventory row claimed both were still interlock rows after the fold
    // and the two adoptions landed. The report is read from the gate's own
    // keys, and each package's opt-out from the constant it declares.
    const audit = auditTheme(lightTheme);
    expect(Object.keys(audit)).toContain("keyboardDim");
    expect(audit.keyboardDim).toEqual([]);

    const sources = {
      primitives: readFileSync(
        new URL("../../primitives/src/core/focus.ts", import.meta.url),
        "utf8",
      ),
      components: readFileSync(
        new URL("../../components/src/internal/button.tsx", import.meta.url),
        "utf8",
      ),
    };
    expect(sources.primitives).toContain("keyboardFocusDim: false");
    expect(sources.components).toContain("keyboardFocusDim: false");

    Object.entries(dimSurfaces()).forEach(([name, text]) => {
      expect(text, `${name} no longer names the gate report`).toContain(
        "`audit.keyboardDim`",
      );
      expect(text, `${name} no longer names the opt-out`).toContain(
        "keyboardFocusDim: false",
      );
    });
  });
});

describe("keyboardFocusDimOpacity", () => {
  it("is the runtime's measured share, not a theme group", () => {
    expect(keyboardFocusDimOpacity).toBe(0.4);
    expect(Object.keys(lightTheme)).not.toContain("keyboardFocusDimOpacity");
  });

  it("paints the values the window capture measured", () => {
    // The `keyboard-focus-dim` probe's capture on 0.11.0: a dimmed sample over
    // the dark page. Both values are what `blend` produces at this share, and
    // the text lands on the *dimmed* fill rather than on the page — a flatten-
    // the-subtree model would paint `#696C72`.
    expect(
      fadedPair(
        darkColors,
        { fill: "muted", label: "foreground", over: "background" },
        keyboardFocusDimOpacity,
      ),
    ).toEqual({ fill: "#181C23", label: "#6E7177" });
  });
});

describe("keyboardDimPairs", () => {
  it("measures each filled action, a field and a row on every strip", () => {
    (["background", "card", "popover", "muted"] as const).forEach((over) => {
      const onStrip = keyboardDimPairs.filter((pair) => pair.over === over);
      expect(onStrip.map((pair) => `${pair.fill}/${pair.label}`)).toEqual([
        "primary/primaryForeground",
        "secondary/secondaryForeground",
        "destructive/destructiveForeground",
        "input/inputForeground",
        "input/placeholder",
        `${over}/foreground`,
        `${over}/mutedForeground`,
        "selected/selectedForeground",
      ]);
    });
    expect(keyboardDimPairs).toHaveLength(32);
  });

  it("names the surface as the fill for a row that has none", () => {
    // A menu row, tab or checkbox label has no fill of its own, so the text
    // fades over the page while the page stays: the surface is its own fill.
    for (const pair of keyboardDimPairs.filter(
      (pair) => pair.fill === pair.over,
    )) {
      expect(
        pair.label === "foreground" || pair.label === "mutedForeground",
      ).toBe(true);
    }
  });
});

describe("keyboardDimFailures", () => {
  it("passes every shipped, high-contrast, platform and authored theme", () => {
    for (const theme of allThemes) {
      expect({
        name: theme.name,
        failures: keyboardDimFailures(theme),
      }).toEqual({
        name: theme.name,
        failures: [],
      });
    }
  });

  it("names the tightest placement the shipped styles paint", () => {
    const measured = allThemes.flatMap((theme) =>
      keyboardDimPairs.map((pair) => {
        const dimmed = fadedPair(theme.colors, pair, keyboardFocusDimOpacity);
        return {
          theme: theme.name,
          pair,
          ratio: contrastRatio(dimmed.label, dimmed.fill) ?? 0,
          painted: `${dimmed.label} on ${dimmed.fill}`,
        };
      }),
    );
    const tightest = measured.reduce((low, next) =>
      next.ratio < low.ratio ? next : low,
    );

    // A saturated brand fill dims toward a light page and closes on its white
    // label: the label is still visible, but it is no longer readable, which is
    // why a control that must keep its text opts out of the dim.
    expect(tightest.theme).toBe("Light · Linux");
    expect(tightest.pair).toEqual({
      fill: "primary",
      label: "primaryForeground",
      over: "card",
    });
    expect(tightest.painted).toBe("#C8DDF5 on #A4C6EF");
    expect(tightest.ratio).toBeCloseTo(1.27, 2);
    expect(tightest.ratio).toBeGreaterThan(decorativeFloor);
  });

  it("reports a dimmed label that lands on its own fill", () => {
    // The label a reader sees on a dimmed control is the label faded over the
    // *dimmed* fill, so a brand whose label is that value paints one block.
    const dimmedFill = "#BAB3EE"; // blend(light primary, background, 0.6)
    const flat = extendTheme(lightTheme, {
      colors: {
        primary: lightColors.primary,
        primaryForeground: dimmedFill,
      },
    });
    const failures = keyboardDimFailures(flat);

    // Over the page the label lands exactly on the fill; over a lighter strip
    // the two composites separate by a hair and the floor still reports it.
    expect(
      failures.map(({ fill, label, over }) => ({ fill, label, over })),
    ).toEqual(
      ["background", "card", "popover", "muted"].map((over) => ({
        fill: "primary",
        label: "primaryForeground",
        over,
      })),
    );
    expect(
      failures.every((failure) => (failure.ratio ?? 1) < decorativeFloor),
    ).toBe(true);
    expect(failures[0]?.ratio).toBe(1);
  });

  it("reports a role it cannot composite rather than skipping it", () => {
    const translucent = extendTheme(lightTheme, {
      colors: { input: "#FFFFFF80" },
    });
    const failures = keyboardDimFailures(translucent);

    expect(failures).toHaveLength(
      keyboardDimPairs.filter((pair) => pair.fill === "input").length,
    );
    expect(failures.every((failure) => failure.ratio === undefined)).toBe(true);
    expect(failures[0]).toMatchObject({
      fill: "input",
      label: "inputForeground",
      over: "background",
      ratio: undefined,
    });
  });

  it("honours a caller's stricter floor", () => {
    const failures = keyboardDimFailures(lightTheme, 3);

    expect(failures.length).toBeGreaterThan(0);
    expect(failures.every((failure) => (failure.ratio ?? 0) < 3)).toBe(true);
    expect(failures.map((failure) => failure.floor)).toEqual(
      failures.map(() => 3),
    );
  });
});
