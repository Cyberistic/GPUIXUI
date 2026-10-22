/**
 * Guards the dim the runtime paints on every other focusable while one control
 * has keyboard focus.
 *
 * The bug this holds: `keyboardFocusDim` is on by default in `@gpuix/native`,
 * so pressing Tab fades every other control — fill and text — and no contract
 * measured it, because `contrastRatio` refuses a translucent result. The
 * composite is the disabled fade's with a different share, and the factor is
 * measured rather than assumed: the `keyboard-focus-dim` window capture measured
 * the share, and that the text lands on the control's **own dimmed fill** rather
 * than on the page — the two models read apart in the captured pixel, which is
 * how the composite was identified. The colours the capture read belong to the
 * palette the probe painted at the time; the pair the shipped palette composites
 * is `blend`'s arithmetic on today's roles.
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
import { blend, darkColors, lightColors } from "./color.js";
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

    // The components' action delegates to the primitives' (plan 160), so the
    // declaration may live in either half of the chain; the claim is that the
    // chain paints a filled action that opts out of the dim.
    const chain = [
      "../../components/src/internal/button.tsx",
      "../../primitives/src/core/focus.ts",
      "../../primitives/src/core/variants.ts",
      "../../primitives/src/components/Button.tsx",
    ]
      .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
      .join("\n");
    expect(chain).toContain("keyboardFocusDim: false");

    Object.entries(dimSurfaces()).forEach(([name, text]) => {
      expect(text, `${name} no longer names the gate report`).toContain(
        "`audit.keyboardDim`",
      );
      expect(text, `${name} no longer names the opt-out`).toContain(
        "keyboardFocusDim: false",
      );
    });
  });

  it("states the opt-out as landed in both packages, not as an owed interlock", () => {
    // The page closed the paragraph with "That adoption is an interlock row in
    // `TODO.md`" after both packages had declared the opt-out. The claim is read
    // against the sources: the primitives export the rule, merge it for a
    // variant that paints a fill, and every field host declares it — and the
    // components package re-states the same rule for its own parts.
    const source = (path: string): string =>
      readFileSync(new URL(path, import.meta.url), "utf8");
    expect(source("../../primitives/src/core/focus.ts")).toContain(
      "export const keepContent",
    );
    expect(source("../../primitives/src/components/Button.tsx")).toContain(
      "paintsFilledSurface(variant) ? mergeStyle(base, keepContent) : base",
    );
    expect(source("../../primitives/src/components/Input.tsx")).toContain(
      "keepContent",
    );
    expect(source("../../components/src/internal/theme.ts")).toContain(
      "export const keepContent",
    );

    Object.entries(dimSurfaces()).forEach(([name, text]) => {
      expect(text, `${name}: the retracted interlock`).not.toContain(
        "That adoption is an interlock row",
      );
    });
    expect(
      dimSurfaces()["docs/tokens.md"],
      "the page never says the opt-out has landed",
    ).toContain("Both packages have adopted it");
  });
});

describe("keyboardFocusDimOpacity", () => {
  it("is the runtime's measured share, not a theme group", () => {
    expect(keyboardFocusDimOpacity).toBe(0.4);
    expect(Object.keys(lightTheme)).not.toContain("keyboardFocusDimOpacity");
  });

  it("composites the pair the shipped palette paints at the captured share", () => {
    // The `keyboard-focus-dim` probe measured two facts on 0.11.0: the share is
    // 0.4, and a dimmed control's text lands on its **own dimmed fill** rather
    // than on the page — the flatten-the-subtree model read a different pixel,
    // which is how the composite was identified. The colours a reader sees are
    // the shipped palette's, so a palette move follows them.
    const dim = fadedPair(
      darkColors,
      { fill: "muted", label: "foreground", over: "background" },
      keyboardFocusDimOpacity,
    );

    expect(dim.fill).toBe(
      blend(
        darkColors.muted,
        darkColors.background,
        1 - keyboardFocusDimOpacity,
      ),
    );
    expect(dim.label).toBe(
      blend(darkColors.foreground, dim.fill ?? "", 1 - keyboardFocusDimOpacity),
    );
    // The label does not fade against the page a second time: the two models
    // read apart, which is the captured fact.
    expect(dim.label).not.toBe(
      blend(
        darkColors.foreground,
        darkColors.background,
        1 - keyboardFocusDimOpacity,
      ),
    );
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
        "background/inputForeground",
        "background/placeholder",
        `${over}/foreground`,
        `${over}/mutedForeground`,
        "selected/selectedForeground",
        "hover/foreground",
        "accent/foreground",
        "accent/selectedForeground",
        "active/foreground",
        "active/selectedForeground",
      ]);
    });
    expect(keyboardDimPairs).toHaveLength(60);
  });

  it("names the surface as the fill for a row that has none", () => {
    // A menu row, tab or checkbox label has no fill of its own, so the text
    // fades over the page while the page stays: the surface is its own fill.
    // A composite field's fill is the page role too, but it *has* a fill, so
    // the row pairs are the two text roles a row carries, not every pair whose
    // fill and strip happen to be the same role. A row under the pointer has a
    // fill too — the wash it tints — so it is not one of these.
    const rows = keyboardDimPairs.filter(
      ({ label, fill, over }) =>
        ["foreground", "mutedForeground"].includes(label) && fill === over,
    );
    expect(rows).toHaveLength(8);
    expect(rows.every((pair) => pair.fill === pair.over)).toBe(true);
  });

  it("measures the wash a row wears as the fill the dim composites over", () => {
    // A hovered row is dimmed as a whole: the wash it tints and the label it
    // carries fade together, so the label lands on the *dimmed wash*, not on the
    // strip the row sits on. The table measured a row on the strip only, so the
    // composite a reader sees while Tab is elsewhere was measured nowhere.
    const washed = keyboardDimPairs.filter(({ fill }) =>
      ["hover", "accent", "active"].includes(fill),
    );
    expect(washed).toHaveLength(20);
    (["background", "card", "popover", "muted"] as const).forEach((over) => {
      expect(
        washed
          .filter((pair) => pair.over === over)
          .map((pair) => `${pair.fill}/${pair.label}`),
      ).toEqual([
        "hover/foreground",
        "accent/foreground",
        "accent/selectedForeground",
        "active/foreground",
        "active/selectedForeground",
      ]);
    });

    // The painters: a ghost action or a menu row tints `hover`, and the list row
    // tints `accent` under the pointer and `active` while it is pressed. The
    // press may be painted as the role or through the derived wash that keeps
    // the step visible (`pressWash`), which names the wash it replaces; the
    // contract is the role the row's press plays.
    const list = readFileSync(
      new URL("../../components/src/list.tsx", import.meta.url),
      "utf8",
    );
    const recipe = readFileSync(
      new URL("../../primitives/src/recipe/index.ts", import.meta.url),
      "utf8",
    );
    expect(list).toContain("backgroundColor: theme.colors.accent");
    expect(
      [
        "{ backgroundColor: theme.colors.active }",
        'backgroundColor: pressWash(theme, "accent")',
      ].some((form) => list.includes(form)),
      "the list row paints no press",
    ).toBe(true);
    expect(list).toContain("color: theme.colors.selectedForeground");
    expect(recipe).toContain("hover:bg-hover active:bg-active");
  });

  it("keeps the dimmed label visible on the wash it wears", () => {
    const measured = allThemes.flatMap((theme) =>
      keyboardDimPairs
        .filter(({ fill }) => ["hover", "accent", "active"].includes(fill))
        .map((pair) => {
          const dimmed = fadedPair(theme.colors, pair, keyboardFocusDimOpacity);
          return {
            theme: theme.name,
            pair,
            ratio: contrastRatio(dimmed.label, dimmed.fill) ?? 0,
          };
        }),
    );
    const tightest = measured.reduce((low, next) =>
      next.ratio < low.ratio ? next : low,
    );

    // The tightest wash placement is the Linux look's accent under a chosen
    // row's title, on a muted strip — the dim moves the label and the wash
    // toward the strip together, so the pair stays well above the floor.
    expect(tightest.theme).toBe("Light · Linux");
    expect(tightest.pair).toEqual({
      fill: "accent",
      label: "selectedForeground",
      over: "muted",
    });
    expect(tightest.ratio.toFixed(2)).toBe("2.07");
    expect(tightest.ratio).toBeGreaterThan(decorativeFloor);
    allThemes.forEach((theme) => {
      expect(keyboardDimFailures(theme), theme.name).toEqual([]);
    });

    // The number the catalogue prints, so the page cannot teach a placement the
    // table dropped or a value the table no longer holds.
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(page).toContain("accent under a chosen row's title at **2.07:1**");
  });

  it("reports a wash the dim erases, not only a strip it erases", () => {
    // A brand with a dark toolbar, a mid-grey body text and a light hover
    // wash. The dim keeps 40% of the wash over the toolbar, and `#A4A4A4` at
    // 40% over `#181818` is `#505050` — the label's own colour — so the dimmed
    // label lands exactly on the dimmed wash and the row reads as one block.
    // The same label on the strip still reads (the strip placement is a
    // different composite), so only the wash placement is reported.
    const brand = extendTheme(lightTheme, {
      colors: {
        muted: "#181818",
        foreground: "#505050",
        hover: "#A4A4A4",
      },
    });
    const failures = keyboardDimFailures(brand);

    expect(
      failures.map(({ fill, label, over }) => ({ fill, label, over })),
    ).toEqual([{ fill: "hover", label: "foreground", over: "muted" }]);
    expect(failures[0]?.ratio).toBe(1);
    // The same label on the strip is measured and passes: the wash is the
    // row's own fill, and the report names the wash.
    expect(
      failures.filter(({ fill, over }) => fill === over && over === "muted"),
    ).toEqual([]);
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

  it("measures a field's two fills and its two labels, and the tightest", () => {
    // A field is two fills — a plain field's `input`, a composite field's page
    // role — and two labels: its value and its hint. The table carried one fill
    // and one label, so a composite field (a toolbar's search, a mention field)
    // dimmed into its own page with nothing measuring the hint it loses first.
    const field = keyboardDimPairs.filter(
      ({ fill, label }) =>
        (fill === "input" || fill === "background") &&
        (label === "inputForeground" || label === "placeholder"),
    );
    expect(field).toHaveLength(16);

    const tightest = allThemes
      .flatMap((theme) =>
        field.map((pair) => {
          const dimmed = fadedPair(theme.colors, pair, keyboardFocusDimOpacity);
          return {
            theme: theme.name,
            pair,
            ratio: contrastRatio(dimmed.label, dimmed.fill) ?? 0,
          };
        }),
      )
      .reduce((low, next) => (next.ratio < low.ratio ? next : low));

    expect(tightest.theme).toBe("Light · macOS");
    expect(tightest.pair).toEqual({
      fill: "background",
      label: "placeholder",
      over: "muted",
    });
    expect(tightest.ratio).toBeCloseTo(1.68, 2);

    // The number the catalogue prints, and the field coverage it names, so the
    // page cannot teach a placement the table dropped.
    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(page).toContain("composite hint on a muted strip at **1.68:1**");
    expect(page).toContain("in both of its fills");
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
