import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  auditTheme,
  contrastRatio,
  controlSizes,
  extendTheme,
  invalidSwitchColors,
  lightTheme,
  platformNames,
  platformStyles,
  platformTheme,
  switchFailures,
  switchMetricFailures,
  switchMetricSlots,
  switchMetricsAt,
  switchPaintRoles,
  switchPlacements,
  switchSurfaces,
  themes,
  type ControlSize,
  type SwitchAuditSource,
  type SwitchBoxSource,
  type SwitchMetrics,
  type Theme,
} from "./index.js";
import { resolveSwitchTheme } from "./platforms.example.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const catalogue = read("../../../docs/tokens.md");
const designSystem = read("../../../docs/design-system.md");
const readme = read("../README.md");
const inventory = read("../../../.agents/slop/COMPONENTS.md");
const primitivePaint = read(
  "../../../packages/primitives/src/core/selection.ts",
);
const primitiveSuite = read(
  "../../../packages/primitives/src/core/selection.test.ts",
);

const prose = (text: string): string =>
  text
    .replace(/(^|\n)\s*\/\/\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

const painter = (name: string): string => {
  const start = primitivePaint.indexOf(`export const ${name}`);
  return start === -1
    ? ""
    : primitivePaint.slice(start, primitivePaint.indexOf("\n};", start));
};

const inventoryRow = (name: string): string => {
  const start = inventory.indexOf(`| ${name} |`);
  return start === -1
    ? ""
    : inventory.slice(start, inventory.indexOf("\n", start));
};

const styled: ReadonlyArray<Theme> = platformNames.flatMap((platform) =>
  Object.values(themes).map((theme) => platformTheme(theme, platform)),
);

const declared = styled.filter((theme) => theme.switch !== undefined);

const stored = (
  switchPaint: Readonly<Record<string, unknown>>,
): SwitchAuditSource =>
  ({
    colors: lightTheme.colors,
    switch: switchPaint,
  }) as SwitchAuditSource;

describe("the paint a declared switch carries", () => {
  it("names the three values in the order a theme writes them", () => {
    expect(switchPaintRoles).toEqual(["on", "off", "knob"]);
  });

  it("measures the knob on both tracks and each track on four strips", () => {
    expect(switchSurfaces).toEqual(["background", "card", "popover", "muted"]);
    expect(switchPlacements).toHaveLength(2 + switchSurfaces.length * 2);
    expect(switchPlacements.filter(({ slot }) => slot === "knob")).toEqual([
      { slot: "knob", over: "on" },
      { slot: "knob", over: "off" },
    ]);
    expect(
      switchSurfaces.every(
        (surface) =>
          switchPlacements.some(
            (placement) =>
              placement.slot === "on" && placement.over === surface,
          ) &&
          switchPlacements.some(
            (placement) =>
              placement.slot === "off" && placement.over === surface,
          ),
      ),
    ).toBe(true);
  });
});

const measured = (theme: Theme) =>
  switchPlacements.map((placement) => ({
    ...placement,
    ratio:
      placement.slot === "knob"
        ? contrastRatio(
            theme.switch?.knob,
            placement.over === "off"
              ? (theme.switch?.edge ?? theme.switch?.off)
              : theme.switch?.[placement.over],
          )
        : contrastRatio(
            placement.slot === "off"
              ? (theme.switch?.edge ?? theme.switch?.off)
              : theme.switch?.[placement.slot],
            theme.colors[placement.over],
          ),
  }));

describe("the switch a platform style declares", () => {
  it("clears every placement in every mode", () => {
    expect(declared).toHaveLength(6);
    expect(
      declared
        .filter((theme) => switchFailures(theme).placements.length > 0)
        .map((theme) => theme.name),
    ).toEqual([]);
  });

  it("has a tightest placement, so the sweep measures something", () => {
    const tightest = declared
      .flatMap((theme) =>
        measured(theme).map((placement) => ({
          theme: theme.name,
          ...placement,
        })),
      )
      .reduce((low, placement) =>
        (placement.ratio ?? 0) < (low.ratio ?? 0) ? placement : low,
      );

    expect(tightest.ratio).toBeGreaterThanOrEqual(1.05);
    expect(declared.map((theme) => theme.name)).toContain(tightest.theme);
  });

  it("names the off track a sidebar swallowed", () => {
    const apple = platformTheme(lightTheme, "darwin");
    const swallowed = switchFailures({
      colors: apple.colors,
      switch: { on: "#34C759", off: "#E9E9EA", knob: "#FFFFFF" },
    });

    expect(swallowed.paint).toEqual([]);
    expect(swallowed.placements).toEqual([
      { slot: "off", over: "muted", ratio: expect.any(Number), floor: 1.05 },
    ]);
    expect(swallowed.placements[0]?.ratio).toBeCloseTo(1.003, 3);
    expect(apple.switch?.edge).toBe("#C7C7CC");
    expect(apple.colors.muted).toBe("#E9E9EF");
  });
});

describe("a value the renderer cannot paint", () => {
  it("is reported by slot, and an absent slot reads as absent", () => {
    expect(
      invalidSwitchColors({
        switch: { on: "#34C75G", off: "#E3E3E8", knob: "#FFF" },
      }),
    ).toEqual([{ slot: "on", value: "#34C75G" }]);

    expect(invalidSwitchColors(stored({ on: null, knob: undefined }))).toEqual([
      { slot: "on", value: undefined },
      { slot: "off", value: undefined },
      { slot: "knob", value: undefined },
    ]);
  });

  it("reports the value it cannot paint and measures the rest", () => {
    const report = switchFailures({
      colors: lightTheme.colors,
      switch: { on: "#34C75G", off: "#E3E3E8", knob: "#FFFFFF" },
    });

    expect(report.paint).toEqual([{ slot: "on", value: "#34C75G" }]);

    expect(
      report.placements.map(({ slot, over, ratio }) => ({ slot, over, ratio })),
    ).toEqual([
      { slot: "knob", over: "on", ratio: undefined },
      { slot: "on", over: "background", ratio: undefined },
      { slot: "on", over: "card", ratio: undefined },
      { slot: "on", over: "popover", ratio: undefined },
      { slot: "on", over: "muted", ratio: undefined },
    ]);
  });
});

describe("a paint that cannot be found", () => {
  it("reports a knob painted in its own track", () => {
    const report = switchFailures({
      colors: lightTheme.colors,
      switch: { on: "#34C759", off: "#E3E3E8", knob: "#E3E3E8" },
    });

    expect(
      report.placements.map(({ slot, over, ratio }) => ({ slot, over, ratio })),
    ).toEqual([{ slot: "knob", over: "off", ratio: 1 }]);
  });

  it("reads an off knob on the strip behind a transparent track", () => {
    const paint = {
      on: "#0078D4",
      off: "transparent",
      knob: "#FFFFFF",
      edge: "#8A8A8A",
    };
    const report = switchFailures({ colors: lightTheme.colors, switch: paint });

    expect(
      report.placements.map(({ slot, over, ratio }) => ({ slot, over, ratio })),
    ).toEqual([{ slot: "knob", over: "off", ratio: 1 }]);

    expect(
      switchFailures({
        colors: lightTheme.colors,
        switch: { ...paint, knobOff: "#616161" },
      }).placements,
    ).toEqual([]);
  });

  it("reports a track painted in the strip it stands on", () => {
    const report = switchFailures({
      colors: lightTheme.colors,
      switch: {
        on: "#34C759",
        off: lightTheme.colors.background,
        knob: "#FFFFFF",
      },
    });

    expect(report.placements).toEqual([
      {
        slot: "off",
        over: "background",
        ratio: 1,
        floor: 1.05,
      },
    ]);
  });

  it("reports a value it cannot measure rather than skipping it", () => {
    const report = switchFailures({
      colors: lightTheme.colors,
      switch: { on: "oklch(0.62 0.26 29.2)", off: "#E3E3E8", knob: "#FFFFFF" },
    });

    expect(report.paint).toEqual([]);

    expect(report.placements.map(({ slot }) => slot)).toEqual([
      "knob",
      "on",
      "on",
      "on",
      "on",
    ]);
    expect(report.placements.every(({ ratio }) => ratio === undefined)).toBe(
      true,
    );
  });
});

describe("the accent switch", () => {
  it("answers with nothing to report, because its roles are measured", () => {
    const accents = styled.filter((theme) => theme.switch === undefined);
    expect(accents.length).toBeGreaterThan(0);
    accents.forEach((theme) => {
      expect(switchFailures(theme), theme.name).toEqual({
        paint: [],
        placements: [],
        metrics: [],
      });
    });
  });
});

describe("the box a declared switch is drawn in", () => {
  const apple = {
    width: 38,
    height: 22,
    knob: 20,
    inset: 1,
    border: 0,
  } satisfies SwitchMetrics;

  it("names the five numbers in the order a box writes them", () => {
    expect(switchMetricSlots).toEqual([
      "width",
      "height",
      "knob",
      "inset",
      "border",
    ]);
  });

  it("reports a number the renderer cannot draw, by slot", () => {
    const broken: Partial<SwitchMetrics> = {
      width: Number.NaN,
      height: 0,
      knob: -2,
      inset: Number.NEGATIVE_INFINITY,
      border: -1,
    };

    expect(switchMetricFailures({ switchMetrics: broken })).toEqual([
      { slot: "width", value: Number.NaN, rule: "positive" },
      { slot: "height", value: 0, rule: "positive" },
      { slot: "knob", value: -2, rule: "positive" },
      { slot: "inset", value: Number.NEGATIVE_INFINITY, rule: "nonNegative" },
      { slot: "border", value: -1, rule: "nonNegative" },
    ]);

    expect(
      switchMetricFailures({ switchMetrics: { ...apple, width: "38" } }),
    ).toEqual([{ slot: "width", value: "38", rule: "finite" }]);
  });

  it("fits the knob inside the track it slides in", () => {
    expect(
      switchMetricFailures({ switchMetrics: { ...apple, knob: 30 } }),
    ).toEqual([{ slot: "height", value: 22, rule: "fits", needs: 32 }]);
    expect(
      switchMetricFailures({ switchMetrics: { ...apple, width: 22 } }),
    ).toEqual([{ slot: "width", value: 22, rule: "fits", needs: 23 }]);

    expect(
      switchMetricFailures({
        switchMetrics: { ...apple, height: Number.NaN, knob: 30 },
      }),
    ).toEqual([{ slot: "height", value: Number.NaN, rule: "positive" }]);
  });

  it("answers with nothing for a theme that carries no box", () => {
    expect(switchMetricFailures(lightTheme)).toEqual([]);
    expect(switchMetricFailures({})).toEqual([]);
  });

  it("clears every shipped box at every size the scale draws", () => {
    const boxes = platformNames.flatMap((platform) => {
      const metrics = platformStyles[platform].switchMetrics;
      return metrics === undefined ? [] : [{ platform, metrics }];
    });

    expect(boxes.map(({ platform }) => platform)).toEqual([
      "darwin",
      "linux",
      "win32",
    ]);
    expect(
      boxes.flatMap(({ platform, metrics }) =>
        controlSizes.flatMap((size) =>
          switchMetricFailures({
            switchMetrics: switchMetricsAt(metrics, size),
          }).map((failure) => `${platform} ${size}: ${failure.slot}`),
        ),
      ),
    ).toEqual([]);
  });

  it("fitted the large Adwaita knob to its inner track", () => {
    const adwaita =
      platformTheme(lightTheme, "linux").switchMetrics ??
      expect.fail("linux declares no box");

    expect(switchMetricsAt(adwaita, "lg")).toEqual({
      width: 53,
      height: 29,
      knob: 21,
      inset: 4,
      border: 0,
    });

    const preFix: SwitchMetrics = {
      width: 53,
      height: 29,
      knob: 22,
      inset: 4,
      border: 0,
    };
    expect(switchMetricFailures({ switchMetrics: preFix })).toEqual([
      { slot: "height", value: 29, rule: "fits", needs: 30 },
    ]);
    expect(
      switchMetricFailures({ switchMetrics: switchMetricsAt(adwaita, "lg") }),
    ).toEqual([]);
  });

  it("fails the gate for a brand whose box cannot draw", () => {
    const brand = extendTheme(lightTheme, {
      switchMetrics: { ...apple, knob: 30 },
    });

    expect(auditTheme(brand).switch.metrics).toEqual(
      switchMetricFailures(brand),
    );
    expect(auditTheme(brand).passed).toBe(false);
  });

  it("reads a size the scale does not carry as the default box", () => {
    const stored = JSON.parse('"xs"') as ControlSize;

    expect(switchMetricsAt(apple, stored)).toEqual(
      switchMetricsAt(apple, "md"),
    );
    expect(switchMetricsAt(apple, stored).width).toBeGreaterThan(0);
  });

  it("reads the box a store hands back, and answers nothing for one that lost a slot", () => {
    const storedBox: SwitchBoxSource = {
      width: 38,
      height: 22,
      knob: 20,
      inset: 1,
      border: 0,
    };

    expect(switchMetricsAt(storedBox, "md")).toEqual(apple);
    expect(switchMetricsAt(storedBox, "sm")).toEqual(
      switchMetricsAt(apple, "sm"),
    );

    expect(
      switchMetricsAt({ ...storedBox, height: null }, "md"),
    ).toBeUndefined();
    expect(
      switchMetricsAt({ ...storedBox, width: "38" }, "sm"),
    ).toBeUndefined();
    expect(switchMetricsAt({ ...storedBox, border: -1 }, "md")).toBeUndefined();
    expect(switchMetricsAt(null, "md")).toBeUndefined();
    expect(switchMetricsAt(undefined, "sm")).toBeUndefined();

    const restored: SwitchAuditSource = {
      colors: lightTheme.colors,
      switchMetrics: { ...storedBox, knob: null },
    };
    expect(switchMetricsAt(restored.switchMetrics, "lg")).toBeUndefined();
    expect(switchMetricFailures(restored)).toEqual([
      { slot: "knob", value: null, rule: "finite" },
    ]);
  });

  it("names a slot once, even when it fails both its rule and the fit", () => {
    expect(
      switchMetricFailures({ switchMetrics: { ...apple, height: 0 } }),
    ).toEqual([{ slot: "height", value: 0, rule: "positive" }]);
    expect(
      switchMetricFailures({ switchMetrics: { ...apple, inset: -1 } }),
    ).toEqual([{ slot: "inset", value: -1, rule: "nonNegative" }]);
  });
});

describe("the pages that teach the declared paint", () => {
  it("names the contract, its floor and the measured deviation", () => {
    switchPaintRoles.forEach((slot) => {
      expect(catalogue, `catalogue ${slot}`).toContain(slot);
    });
    expect(catalogue).toContain("switchFailures");
    expect(catalogue).toContain("invalidSwitchColors");
    expect(catalogue).toContain("switchPlacements");
    expect(catalogue).toContain("switchSurfaces");

    expect(catalogue).toContain("1.05:1");
    expect(catalogue).toContain("1.98:1");
    expect(catalogue).toContain("1.24:1");

    expect(catalogue).toContain("#C7C7CC");
    expect(catalogue).toContain("1.003:1");

    expect(designSystem).toContain("switchFailures");
    expect(designSystem).toContain("#C7C7CC");

    expect(readme).toContain("switchFailures");

    expect(inventoryRow("Platform styles")).toContain("switchFailures");
  });

  it("teaches the box the paint is drawn in", () => {
    [
      [catalogue, "catalogue"],
      [designSystem, "design system"],
      [readme, "readme"],
    ].forEach(([page, name]) => {
      expect(page, name).toContain("switchMetricSlots");
      expect(page, name).toContain("switchMetricFailures");
      expect(page, name).toContain("inner height");

      expect(page, name).toMatch(/height[\s\S]{0,120}insets/);
      expect(page, name).toMatch(/width[\s\S]{0,120}travel/);
    });

    [catalogue, designSystem].forEach((page) => {
      expect(page).toContain("22px knob");
    });
    expect(catalogue).toContain("53×29");
    expect(designSystem).toContain("29px track");
    expect(catalogue).toContain("21px");

    [
      [catalogue, "catalogue"],
      [designSystem, "design system"],
      [readme, "readme"],
    ].forEach(([page, name]) => {
      expect(page, name).toContain("SwitchBoxSource");
      expect(page, name).toContain("answers nothing");
      expect(page, name).toContain("NaN");
    });

    const row = inventoryRow("Platform styles");
    expect(row).toContain("switchMetricFailures");
    expect(row).toContain("switchMetricSlots");
    expect(row).toContain("21px");
    expect(row).toContain("SwitchBoxSource");
  });

  it("teaches the extension route a brand owns the paint through", () => {
    expect(catalogue).toContain("switch: { on:");
    expect(catalogue).toContain("resolveSwitchTheme");
    expect(designSystem).toContain(
      "platform's `switch` paint is replaced whole",
    );
    expect(readme).toContain("platform's `switch` paint replaces whole");
    expect(resolveSwitchTheme("light").switch?.on).toBe("#16A34A");
    expect(resolveSwitchTheme("dark").switch?.off).toBe("#3B3B40");
  });

  it("teaches the toggle a slot the painter cannot read falls back to", () => {
    expect(catalogue).toContain("keeps that toggle");
    expect(catalogue).toContain("half-declared switch is not a declaration");
    expect(designSystem).toContain("half-declared switch is no declaration");
    [catalogue, designSystem].forEach((page) => {
      expect(page).not.toContain("slots it lost");

      expect(prose(page)).not.toContain("slots it lost");
    });
  });

  it("teaches the platform style's switch fallback where it edits one", () => {
    const from = catalogue.indexOf("#### Editing a platform style");
    const to = catalogue.indexOf("#### A style a store hands back");
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const section = prose(catalogue.slice(from, to));
    expect(section).toContain("half-declared switch is not a declaration");
    expect(section).toContain("keeps its accent toggle");
    expect(section).not.toContain("slots it lost");
  });

  it("holds the paint half to the seam the primitives read", () => {
    expect(primitivePaint).toContain(
      "const declaredPaint = (source: SwitchPaintTheme): Option.Option<SwitchColors>",
    );
    expect(primitivePaint).toContain("Option.fromNullishOr(source.switch)");
    expect(primitivePaint).toContain(
      "switch: Option.getOrUndefined(declaredPaint(source))",
    );

    ["switchBox", "switchTrackPaint", "switchThumbPaint"].forEach((name) => {
      expect(painter(name), name).toContain("switchTheme(source)");
    });
    [
      "paints the accent toggle for the null a store writes",
      "paints the accent toggle for a table that lost a slot",
      "keeps the paint a theme actually declares",
      "paints the same table the theme carries, slot for slot",
    ].forEach((name) => {
      expect(primitiveSuite, name).toContain(name);
    });
    [
      [catalogue, "catalogue"],
      [designSystem, "design system"],
      [readme, "readme"],
    ].forEach(([page, name]) => {
      expect(page, name).toContain("declaredPaint");
      expect(page, name).toContain("a stored switch paint");
      expect(page, name).not.toContain("the paint path does not yet");
      expect(page, name).not.toContain("still needs that read moved");
    });
    expect(catalogue).toContain("packages/primitives/src/core/selection.ts");
  });
});
