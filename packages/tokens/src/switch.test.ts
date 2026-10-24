/**
 * Guards the contract for a **declared switch paint** — the three colours a
 * platform style hands a switch when its own toggle is not the accent family's.
 *
 * The bug this guards: `PlatformStyle.switch` entered a theme through no role,
 * so neither the paint grammar nor any placement measured it. The first run
 * found the macOS light off track at **1.003:1** on the style's own `muted`
 * sidebar — a switch whose track is the panel it sits in, with no edge to carry
 * it (`switchBox` draws a declared switch with `borderWidth: 0`), and every
 * report empty. A typo'd value is the same silence: the runtime ignores a colour
 * it cannot parse, so the switch paints black or keeps the previous paint.
 *
 * `node:fs` is deliberate, as in `docs.test.ts`: this checks the repository's
 * own Markdown, and the package keeps zero runtime dependencies by design.
 */
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
  type SwitchAuditSource,
  type SwitchMetrics,
  type Theme,
} from "./index.js";
import { resolveSwitchTheme } from "./platforms.example.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const catalogue = read("../../../docs/tokens.md");
const designSystem = read("../../../docs/design-system.md");
const readme = read("../README.md");
const inventory = read("../../../COMPONENTS.md");
const primitivePaint = read(
  "../../../packages/primitives/src/core/selection.ts",
);
const primitiveSuite = read(
  "../../../packages/primitives/src/core/selection.test.ts",
);

/** One exported seam of the primitive painter, from its name to its closing brace. */
const painter = (name: string): string => {
  const start = primitivePaint.indexOf(`export const ${name}`);
  return start === -1
    ? ""
    : primitivePaint.slice(start, primitivePaint.indexOf("\n};", start));
};

/** A `COMPONENTS.md` row, by its first cell. */
const inventoryRow = (name: string): string => {
  const start = inventory.indexOf(`| ${name} |`);
  return start === -1
    ? ""
    : inventory.slice(start, inventory.indexOf("\n", start));
};

/** Every theme a style resolves to, in both modes. */
const styled: ReadonlyArray<Theme> = platformNames.flatMap((platform) =>
  Object.values(themes).map((theme) => platformTheme(theme, platform)),
);

/** The themes that declare a paint: the three styles that own a toggle. */
const declared = styled.filter((theme) => theme.switch !== undefined);

/**
 * A paint as a store hands one back. JSON has no `undefined`, so a key that was
 * dropped on the way in arrives as `null` — the absence rule the other reports
 * follow, which is why the contract reads the three slots as `unknown`.
 */
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
    // A knob is read inside the control; a track is the control's silhouette on
    // the surface it stands in, which is why every strip is a placement.
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

/** Every placement a theme paints, with the ratio it measured. */
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
    // The measured defect, by value and by ratio: Apple's off grey is the same
    // grey as the macOS style's `muted` sidebar. The shipped paint keeps the
    // platform's own off fill and carries a rim, which is the silhouette the
    // report measures on that strip.
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
    // A value a store hands back: JSON has no `undefined`, so a dropped key is
    // `null` and a missing one is missing — neither is a colour.
    expect(invalidSwitchColors(stored({ on: null, knob: undefined }))).toEqual([
      { slot: "on", value: undefined },
      { slot: "off", value: undefined },
      { slot: "knob", value: undefined },
    ]);
  });

  it("reports the value it cannot paint and measures the rest", () => {
    // The two halves are independent: a track with a typo is still placed, so a
    // reader sees every defect in one run rather than one per edit.
    const report = switchFailures({
      colors: lightTheme.colors,
      switch: { on: "#34C75G", off: "#E3E3E8", knob: "#FFFFFF" },
    });

    expect(report.paint).toEqual([{ slot: "on", value: "#34C75G" }]);
    // The same value cannot be measured either, so its five placements report
    // unmeasurable beside the paint line — one run names both halves.
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

    // Only the off track is the knob's own colour; the white-on-green pair is
    // the platform's, and it is measured rather than condemned.
    expect(
      report.placements.map(({ slot, over, ratio }) => ({ slot, over, ratio })),
    ).toEqual([{ slot: "knob", over: "off", ratio: 1 }]);
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
    // A perceptual space paints but cannot be measured; the placement is
    // reported unmeasurable, the rule the other contracts follow.
    const report = switchFailures({
      colors: lightTheme.colors,
      switch: { on: "oklch(0.62 0.26 29.2)", off: "#E3E3E8", knob: "#FFFFFF" },
    });

    expect(report.paint).toEqual([]);
    // The knob rides the same unmeasurable track, and each strip carries the
    // same four unmeasurable placements.
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
    // Every other style paints the library's switch from `primary`, `muted` and
    // `foreground`, which the mark, contrast and decorative tables already hold
    // where a switch stands. The contract neither repeats them nor invents a
    // report for a theme that declares nothing.
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
  /** Apple's published box, the one a box is edited from in these cases. */
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
    // The class of defect every other numeric token is held to: a batch crosses
    // JSON on its way to native, so `NaN` and an infinity are dropped and the
    // property paints as if it were never set, while a zero or a negative size
    // is kept and lays the box out at nothing.
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
    // A value that is not a number at all is reported under `finite`: every
    // other rule describes a number, and the finding here is that it is not one.
    expect(
      switchMetricFailures({ switchMetrics: { ...apple, width: "38" } }),
    ).toEqual([{ slot: "width", value: "38", rule: "finite" }]);
  });

  it("fits the knob inside the track it slides in", () => {
    // A knob through the pill's edge and a track with no room to travel are the
    // two relations the primitive's `switchThumbTravel` relies on: the height
    // holds the knob plus both insets, and the width holds the same plus a pixel.
    expect(
      switchMetricFailures({ switchMetrics: { ...apple, knob: 30 } }),
    ).toEqual([{ slot: "height", value: 22, rule: "fits", needs: 32 }]);
    expect(
      switchMetricFailures({ switchMetrics: { ...apple, width: 22 } }),
    ).toEqual([{ slot: "width", value: 22, rule: "fits", needs: 23 }]);
    // A box the report already named is not compared twice: the slot it has to
    // grow is the one already reported.
    expect(
      switchMetricFailures({
        switchMetrics: { ...apple, height: Number.NaN, knob: 30 },
      }),
    ).toEqual([{ slot: "height", value: Number.NaN, rule: "positive" }]);
  });

  it("answers with nothing for a theme that carries no box", () => {
    // The accent switch derives its box from the icon step, so there is no
    // declaration to measure. A stored `null` is the same absence
    // (`incomplete.test.ts` holds that shape across every shipped style).
    expect(switchMetricFailures(lightTheme)).toEqual([]);
    expect(switchMetricFailures({})).toEqual([]);
  });

  it("clears every shipped box at every size the scale draws", () => {
    // `default` is the library's own identity and declares no box, so the sweep
    // is the styles that own one — named, so an empty sweep cannot pass.
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
    // The defect this guard was written for: the scale rounded the knob and the
    // inset apart, so 44×24 with an 18px knob at a 3px inset became 53×29 with a
    // 22px knob whose two 4px insets needed 30 — one pixel through the edge.
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
    // The pre-fix box, by value: the knob is the number that could not fit.
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
});

describe("the pages that teach the declared paint", () => {
  it("names the contract, its floor and the measured deviation", () => {
    // A page that taught only `PlatformStyle.switch` would send a style author
    // to a table with no check to run.
    switchPaintRoles.forEach((slot) => {
      expect(catalogue, `catalogue ${slot}`).toContain(slot);
    });
    expect(catalogue).toContain("switchFailures");
    expect(catalogue).toContain("invalidSwitchColors");
    expect(catalogue).toContain("switchPlacements");
    expect(catalogue).toContain("switchSurfaces");
    // The floor is stated, and the platform's own values are stated as the
    // measured deviation rather than dressed as conformance.
    expect(catalogue).toContain("1.05:1");
    expect(catalogue).toContain("1.98:1");
    expect(catalogue).toContain("1.24:1");
    // The value the contract added, and the reason it was added.
    expect(catalogue).toContain("#C7C7CC");
    expect(catalogue).toContain("1.003:1");
    // The design system states the same rule in its state table and §9.
    expect(designSystem).toContain("switchFailures");
    expect(designSystem).toContain("#C7C7CC");
    // The package README names the report beside the style that carries it.
    expect(readme).toContain("switchFailures");
    // The inventory row records that the declared paint is measured.
    expect(inventoryRow("Platform styles")).toContain("switchFailures");
  });

  it("teaches the box the paint is drawn in", () => {
    // A page that taught the paint and the scale but not the box would leave a
    // style author with numbers no check runs. The numbers printed are the ones
    // the fix measured, so a page that loses the history fails here.
    [
      [catalogue, "catalogue"],
      [designSystem, "design system"],
      [readme, "readme"],
    ].forEach(([page, name]) => {
      expect(page, name).toContain("switchMetricSlots");
      expect(page, name).toContain("switchMetricFailures");
      expect(page, name).toContain("inner height");
      // The relations, in the words the primitive's travel relies on.
      expect(page, name).toMatch(/height[\s\S]{0,120}insets/);
      expect(page, name).toMatch(/width[\s\S]{0,120}travel/);
    });
    // The measured defect and its fix, by value, on both token pages.
    [catalogue, designSystem].forEach((page) => {
      expect(page).toContain("22px knob");
    });
    expect(catalogue).toContain("53×29");
    expect(designSystem).toContain("29px track");
    expect(catalogue).toContain("21px");
    // The inventory row records the box beside the paint.
    const row = inventoryRow("Platform styles");
    expect(row).toContain("switchMetricFailures");
    expect(row).toContain("switchMetricSlots");
    expect(row).toContain("21px");
  });

  it("teaches the extension route a brand owns the paint through", () => {
    // The paint is a theme value, not a preset: a consumer that starts from a
    // platform style replaces it through `extendTheme`, and a page that taught
    // only the style table would leave the reader with a control they cannot
    // edit. The counts and values the pages print are read from the export.
    expect(catalogue).toContain("switch: { on:");
    expect(catalogue).toContain("resolveSwitchTheme");
    expect(designSystem).toContain(
      "platform's `switch` paint is replaced whole",
    );
    expect(readme).toContain("platform's `switch` paint replaces whole");
    expect(resolveSwitchTheme("light").switch?.on).toBe("#16A34A");
    expect(resolveSwitchTheme("dark").switch?.off).toBe("#3B3B40");
  });

  it("holds the paint half to the seam the primitives read", () => {
    // The bug guarded: the pages said the reports answered a nulled switch
    // "but the paint path does not yet" — `switchBox`/`switchFill`/
    // `switchThumbPaint` compared `theme.switch !== undefined`, so a restored
    // theme threw at its first slot. The primitives decode the table once at
    // the seam now, and the claim is held to both halves: the source that
    // normalises it and the suite that paints through it.
    expect(primitivePaint).toContain(
      "const declaredPaint = (source: SwitchPaintTheme): Option.Option<SwitchColors>",
    );
    expect(primitivePaint).toContain("Option.fromNullishOr(source.switch)");
    expect(primitivePaint).toContain(
      "switch: Option.getOrUndefined(declaredPaint(source))",
    );
    // Each painter reads the normalised theme, so a stored table cannot reach
    // a slot read raw.
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
