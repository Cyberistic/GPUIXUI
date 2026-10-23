/**
 * Holds the `breadcrumb-navigation-lifecycle` fixture, the probe that paints it
 * and the section a reader plans from.
 *
 * The gap this guards: Tier 4's **Breadcrumb navigation** row was `?`. A trail
 * looks like composition, but the shipped list is `flex-wrap` — so an
 * unbudgeted trail **wraps** in a narrow pane rather than clipping — and the
 * component's own collapsed middle is a decorative ellipsis, not a control. The
 * probe measures both answers in a window (a trail budgeted from the pane's own
 * report stays one row; a menu trigger the app composes reaches the hidden
 * levels), and this suite keeps the fixture, the probe and the prose that
 * publishes them pointing at one another.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";
import { getTheme, targetSize } from "@gpuixui/tokens";
import {
  BREADCRUMB_CHECKS,
  BREADCRUMB_ENTRY_WIDTH,
  BREADCRUMB_FRAMES,
  BREADCRUMB_IDS,
  BREADCRUMB_LEVELS,
  BREADCRUMB_START,
  BREADCRUMB_TARGET,
  BREADCRUMB_WIDTHS,
  breadcrumbReadout,
  budgetFor,
  ellipsisPaint,
  levelAt,
  pagePaint,
  panePaint,
  trailView,
} from "./breadcrumb-navigation.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./breadcrumb-navigation-probe.tsx");
const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

const theme = getTheme("dark");

/** This probe's own README section, so a value printed elsewhere cannot pass. */
const sectionOf = (): string => {
  const heading =
    "### `breadcrumb-navigation-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + 1);
  return readme.slice(start, end === -1 ? undefined : end);
};

describe("the budget a trail derives", () => {
  it("is a count over the pane's width, floored so a trail keeps its three parts", () => {
    expect(budgetFor(BREADCRUMB_WIDTHS.wide)).toBe(BREADCRUMB_LEVELS.length);
    expect(budgetFor(BREADCRUMB_WIDTHS.narrow)).toBe(3);
    // Three entries are the floor: the root, the gap and the current page.
    expect(budgetFor(0)).toBe(3);
    expect(budgetFor(BREADCRUMB_ENTRY_WIDTH)).toBe(3);
    // A measurement that never arrived is the minimum; no limit is every level.
    expect(budgetFor(Number.NaN)).toBe(3);
    expect(budgetFor(Number.POSITIVE_INFINITY)).toBe(BREADCRUMB_LEVELS.length);
  });

  it("never returns a budget the trail has no entries for", () => {
    Arr.forEach([0, 1, 111, 112, 559, 560, 5_000], (width) => {
      const budget = budgetFor(width);
      expect(budget).toBeGreaterThanOrEqual(3);
      expect(budget).toBeLessThanOrEqual(BREADCRUMB_LEVELS.length);
    });
  });
});

describe("the trail the budget leaves", () => {
  it("paints every level when the path fits", () => {
    expect(trailView(BREADCRUMB_START, BREADCRUMB_LEVELS.length)).toEqual({
      visible: [0, 1, 2, 3, 4],
      hidden: [],
    });
    expect(trailView(2, 3)).toEqual({ visible: [0, 1, 2], hidden: [] });
  });

  it("keeps the root and the tail and names the middle it hides", () => {
    expect(trailView(BREADCRUMB_START, 3)).toEqual({
      visible: [0, BREADCRUMB_START],
      hidden: [1, 2, 3],
    });
    expect(trailView(3, 3)).toEqual({ visible: [0, 3], hidden: [1, 2] });
    expect(trailView(BREADCRUMB_START, 4)).toEqual({
      visible: [0, 3, 4],
      hidden: [1, 2],
    });
  });

  it("always paints the current page, and hides only levels before its tail", () => {
    Arr.forEach(Arr.range(0, BREADCRUMB_START), (page) =>
      Arr.forEach(Arr.range(3, BREADCRUMB_LEVELS.length), (budget) => {
        const trail = trailView(page, budget);
        expect(trail.visible).toContain(page);
        // The two sets partition the path to the current page.
        expect(
          Arr.sort(Arr.appendAll(trail.visible, trail.hidden), Order.Number),
        ).toEqual(Arr.range(0, page));
      }),
    );
  });

  it("leaves a chosen deep level with levels still hidden, and a shallow one without", () => {
    // The probe chooses Overlays then Components: the first keeps the trigger,
    // the second fits the budget and unpaints it.
    expect(trailView(3, 3).hidden.length).toBeGreaterThan(0);
    expect(trailView(2, 3).hidden).toEqual([]);
  });
});

describe("the fixture the view and the steps share", () => {
  it("addresses every painted part with a distinct id", () => {
    const ids = [
      BREADCRUMB_IDS.probe,
      BREADCRUMB_IDS.pane,
      BREADCRUMB_IDS.readout,
      BREADCRUMB_IDS.wide,
      BREADCRUMB_IDS.narrow,
      BREADCRUMB_IDS.after,
      BREADCRUMB_IDS.referenceList,
      BREADCRUMB_IDS.appList,
      BREADCRUMB_IDS.more,
      BREADCRUMB_IDS.menu,
      ...Arr.map(Arr.range(0, BREADCRUMB_START), BREADCRUMB_IDS.appCrumb),
      ...Arr.map(Arr.range(0, BREADCRUMB_START), BREADCRUMB_IDS.referenceCrumb),
      ...Arr.map(Arr.range(1, 3), BREADCRUMB_IDS.hiddenRow),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("breadcrumb-more");
    expect(ids).toContain("breadcrumb-hidden-3");
  });

  it("prints the width, the derived budget, the page and the selection", () => {
    expect(
      breadcrumbReadout(BREADCRUMB_WIDTHS.wide, BREADCRUMB_START, "none"),
    ).toBe(
      `w=${BREADCRUMB_WIDTHS.wide} budget=${BREADCRUMB_LEVELS.length} page=Dialog selected=none`,
    );
    expect(breadcrumbReadout(BREADCRUMB_WIDTHS.narrow, 3, levelAt(3))).toBe(
      `w=${BREADCRUMB_WIDTHS.narrow} budget=3 page=Overlays selected=Overlays`,
    );
    // A width nobody measured reads as the minimum, so the readout cannot
    // advertise a budget the trail never had.
    expect(breadcrumbReadout(Number.NaN, 4, "none")).toContain("budget=3");
  });

  it("clamps a level read to the trail it has", () => {
    expect(levelAt(0)).toBe(BREADCRUMB_LEVELS[0]);
    expect(levelAt(BREADCRUMB_START)).toBe(BREADCRUMB_LEVELS[BREADCRUMB_START]);
    expect(levelAt(-1)).toBe(BREADCRUMB_LEVELS[0]);
    expect(levelAt(99)).toBe(BREADCRUMB_LEVELS[0]);
  });

  it("derives every paint from the palette and the target floor from the tokens", () => {
    expect(ellipsisPaint(theme)).toBe(theme.colors.mutedForeground);
    expect(panePaint(theme)).toBe(theme.colors.card);
    expect(pagePaint(theme)).toBe(theme.colors.background);
    expect(BREADCRUMB_TARGET).toBe(targetSize.minimum);
    // The three surfaces are different paints, so a sample cannot pass by
    // matching the one behind it.
    expect(
      new Set([ellipsisPaint(theme), panePaint(theme), pagePaint(theme)]).size,
    ).toBe(3);
  });
});

describe("the probe", () => {
  it("mounts the shipped trail and the shipped menu, and budgets from the pane", () => {
    expect(probe).toContain('from "@gpuixui/components"');
    expect(probe).toContain("<Breadcrumb");
    expect(probe).toContain("<DropdownMenu");
    expect(probe).toContain("<DropdownMenuTrigger");
    expect(probe).toContain("onLayout={(payload) => setMeasured(");
    // The budget is the report's, never the state that asked for a width.
    expect(probe).toContain("const budget = budgetFor(measured);");
    expect(probe).toContain("width: BREADCRUMB_WIDTHS[pane],");
  });

  it("drives both widths and both inputs on the collapsed middle", () => {
    expect(probe).toContain("ctx.host.click(BREADCRUMB_IDS.narrow)");
    expect(probe).toContain(
      "ctx.host.focusElement(BREADCRUMB_IDS.appCrumb(0))",
    );
    expect(probe).toContain("ctx.host.focusNext()");
    expect(probe).toContain('ctx.host.key("enter")');
    expect(probe).toContain('ctx.host.key("down")');
    expect(probe).toContain("ctx.host.click(BREADCRUMB_IDS.hiddenRow(3))");
    // The three states a reader can look at.
    expect(probe).toContain("capture(ctx, BREADCRUMB_FRAMES.wide)");
    expect(probe).toContain("capture(ctx, BREADCRUMB_FRAMES.narrow)");
    expect(probe).toContain("ctx.host.capture(BREADCRUMB_FRAMES.menu)");
    expect(BREADCRUMB_FRAMES.menu).toBe("breadcrumb-narrow-menu");
  });

  it("asserts the wrap, the one row, the floor and both ways into the middle", () => {
    expect(probe).toContain(
      "the unbudgeted trail wraps to a second row at the same width",
    );
    expect(probe).toContain(
      "the budgeted trail paints one row, the height of its trigger",
    );
    expect(probe).toContain(
      "the collapsed middle's trigger reaches the press floor",
    );
    expect(probe).toContain(
      "the next tab stop is the collapsed middle's trigger",
    );
    expect(probe).toContain("a press reaches the level the budget hid");
    expect(probe).toContain("Enter chooses the focused hidden level");
    expect(probe).toContain("a path that fits paints no collapsed middle");
    expect(probe).toContain(
      "the keyboard continues past the trail into the next control",
    );
    // The count in the fixture is the floor the check sites can add to; an
    // assertion planted without a matching count fails here.
    const sites = Arr.length(
      Arr.fromIterable(probe.matchAll(/ctx\.expect\w+\(/g)),
    );
    expect(sites).toBeGreaterThan(0);
    expect(BREADCRUMB_CHECKS).toBeGreaterThanOrEqual(sites);
  });

  it("paints no colour literal", () => {
    expect(/backgroundColor: "#[0-9a-fA-F]{3,8}"/.test(probe)).toBe(false);
    expect(/color: "#[0-9a-fA-F]{3,8}"/.test(probe)).toBe(false);
    expect(probe).toContain("ellipsisPaint(theme)");
    expect(probe).toContain("panePaint(theme)");
  });
});

describe("the registry and the README", () => {
  it("registers the probe once, in the layout capability", () => {
    const declared = Arr.filter(
      liveRegistry,
      (entry) => entry.id === "breadcrumb-navigation-lifecycle",
    );
    expect(declared).toHaveLength(1);
    expect(declared[0]?.capability).toBe("layout");
    expect(declared[0]?.title).toContain("budget");
    expect(scenarios).toContain("BreadcrumbNavigationProbe");
    expect(scenarios).toContain("breadcrumbNavigationSteps");
    expect(scenarios).toContain('"breadcrumb-navigation-lifecycle"');
  });

  it("documents the measurement under the version it was made on", () => {
    const section = sectionOf();
    expect(section).not.toBe("");
    expect(section).toContain(`${BREADCRUMB_CHECKS} checks`);
    expect(section).toContain("`src/live/breadcrumb-navigation.ts`");
    expect(section).toContain("breadcrumb-navigation.test.ts");
    expect(section).toContain("--only breadcrumb-navigation-lifecycle");
  });

  it("prints the widths, heights and readouts the probe measured", () => {
    const flat = sectionOf().replace(/\s+/g, " ");
    // The pane reports 280 and the budget follows it; the unbudgeted trail is
    // two 16px rows (36) and the budgeted one is its 28px trigger's row.
    Arr.forEach(["280", "w=280 budget=3", "**36**", "**28**"], (measured) => {
      expect(flat).toContain(measured);
    });
    expect(flat).toContain("flex-wrap");
    expect(flat).toContain("A trail never clips; it wraps");
    expect(flat).toContain("decorative by design");
    // The three rules are stated, not implied.
    expect(flat).toContain("A selection can remove its own trigger");
  });

  it("names the probe in the intro and the measured-alone clause", () => {
    const flat = readme.replace(/\s+/g, " ");
    const alone = flat.slice(flat.indexOf("Measured alone since then:"));
    expect(alone).toContain("breadcrumb-navigation-lifecycle");
    expect(flat).toContain(
      `the ${liveRegistry.length} probes a real window can prove`,
    );
  });
});
