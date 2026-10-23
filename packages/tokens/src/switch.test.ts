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
  contrastRatio,
  invalidSwitchColors,
  lightTheme,
  platformNames,
  platformTheme,
  switchFailures,
  switchPaintRoles,
  switchPlacements,
  switchSurfaces,
  themes,
  type SwitchAuditSource,
  type Theme,
} from "./index.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const catalogue = read("../../../docs/tokens.md");
const designSystem = read("../../../docs/design-system.md");
const readme = read("../README.md");
const inventory = read("../../../COMPONENTS.md");

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

/** The themes that declare a paint: the Apple style, in both modes. */
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
        ? contrastRatio(theme.switch?.knob, theme.switch?.[placement.over])
        : contrastRatio(
            theme.switch?.[placement.slot],
            theme.colors[placement.over],
          ),
  }));

describe("the switch a platform style declares", () => {
  it("clears every placement in both modes", () => {
    expect(declared).toHaveLength(2);
    expect(
      declared
        .filter((theme) => switchFailures(theme).placements.length > 0)
        .map((theme) => theme.name),
    ).toEqual([]);
  });

  it("has a tightest placement, so the sweep measures something", () => {
    // The off track in its own sidebar is the tightest cell: 1.058:1 over the
    // 1.05:1 floor. It was 1.003:1 before the track moved, and that is the
    // reason the track no longer ships as Apple's `#E9E9EA`.
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

    expect(tightest.theme).toBe("Light · macOS");
    expect(tightest.slot).toBe("off");
    expect(tightest.over).toBe("muted");
    expect(tightest.ratio).toBeCloseTo(1.058, 3);
  });

  it("names the off track a sidebar swallowed", () => {
    // The measured defect, by value and by ratio: Apple's off grey is the same
    // grey as the macOS style's own sidebar, which the shipped paint moved one
    // step off (`#E3E3E8`). The direction the guard exists for is this case
    // failing the moment the track comes back.
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
    expect(apple.switch?.off).not.toBe("#E9E9EA");
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
      });
    });
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
    // The value the contract moved, and the reason it moved.
    expect(catalogue).toContain("#E3E3E8");
    expect(catalogue).toContain("1.003:1");
    // The design system states the same rule in its state table and §9.
    expect(designSystem).toContain("switchFailures");
    expect(designSystem).toContain("#E3E3E8");
    // The package README names the report beside the style that carries it.
    expect(readme).toContain("switchFailures");
    // The inventory row records that the declared paint is measured.
    expect(inventoryRow("Platform styles")).toContain("switchFailures");
  });
});
