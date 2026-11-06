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

const dimSurfaces = (): Record<string, string> => {
  const read = (path: string): string =>
    readFileSync(new URL(path, import.meta.url), "utf8");
  const flatten = (text: string): string => text.replace(/\s+/g, " ");
  const inventory = read("../../../.agents/slop/COMPONENTS.md")
    .split("\n")
    .find((line) => line.startsWith("| Keyboard focus dim |"));
  return {
    "docs/tokens.md": flatten(read("../../../docs/tokens.md")),
    "docs/design-system.md": flatten(read("../../../docs/design-system.md")),
    "README.md": flatten(read("../README.md")),
    ".agents/slop/COMPONENTS.md": flatten(inventory ?? ""),
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
    const audit = auditTheme(lightTheme);
    expect(Object.keys(audit)).toContain("keyboardDim");
    expect(audit.keyboardDim).toEqual([]);

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
    const rows = keyboardDimPairs.filter(
      ({ label, fill, over }) =>
        ["foreground", "mutedForeground"].includes(label) && fill === over,
    );
    expect(rows).toHaveLength(8);
    expect(rows.every((pair) => pair.fill === pair.over)).toBe(true);
  });

  it("measures the wash a row wears as the fill the dim composites over", () => {
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

    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(page).toContain("accent under a chosen row's title at **2.07:1**");
  });

  it("reports a wash the dim erases, not only a strip it erases", () => {
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

    expect(tightest.theme).toBe("Light · Windows");
    expect(tightest.pair).toEqual({
      fill: "primary",
      label: "primaryForeground",
      over: "card",
    });
    expect(tightest.painted).toBe("#C2DFF5 on #99C9EE");
    expect(tightest.ratio).toBeCloseTo(1.27, 2);
    expect(tightest.ratio).toBeGreaterThan(decorativeFloor);
  });

  it("measures a field's two fills and its two labels, and the tightest", () => {
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

    const page = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(page).toContain("composite hint on a muted strip at **1.68:1**");
    expect(page).toContain("in both of its fills");
  });

  it("reports a dimmed label that lands on its own fill", () => {
    const dimmedFill = "#BAB3EE";
    const flat = extendTheme(lightTheme, {
      colors: {
        primary: lightColors.primary,
        primaryForeground: dimmedFill,
      },
    });
    const failures = keyboardDimFailures(flat);

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
