/**
 * Holds `panel-group-lifecycle` to the component and the arithmetic it claims.
 *
 * The gap this guards: the shipped `@gpuixui/dock` `PanelGroup` had only an
 * offscreen measurement, while the Tier 4 row's window evidence was a
 * hand-composed split. If this probe is rewritten around a local pane, the name
 * and the README would claim the library's group while measuring the fixture.
 *
 * The derivation is the headless fixture's, so the two lanes cannot disagree
 * about a fraction or a step. The printed check count is derived from the probe's
 * own assertion sites, so a check added without the README sentence fails here.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own component, probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  PANE_BODIES,
  PANE_FILLS,
  PANEL_IDS,
  collapsedShares,
  dividerId,
  dividerStart,
  paneContent,
  paneId,
} from "./panel-group.js";
import {
  PANEL_GROUP_HEIGHT,
  PANEL_GROUP_PANELS,
  PANEL_GROUP_STEP,
  PANEL_GROUP_WIDTH,
  panelGroupReadout,
  panelWidths,
  stepSizes,
} from "../scenarios/panel-group-fixture.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./panel-group-probe.tsx");
const component = read("../../../../packages/dock/src/panel-group.tsx");
const readme = read("../../README.md");

/** The probe's README section, so a value printed elsewhere cannot pass. */
const section = (() => {
  const heading = "### `panel-group-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + heading.length);
  return readme.slice(start, end === -1 ? undefined : end);
})();

describe("the shipped panel group", () => {
  it("names the panes and dividers the component paints", () => {
    expect(component).toContain("`${testId}-pane-${panel.id}`");
    expect(component).toContain("`${testId}-divider-${index}`");
    expect(paneId("sidebar")).toBe("panel-group-pane-sidebar");
    expect(dividerId(1)).toBe("panel-group-divider-1");
  });

  it("derives each divider's edge from the panes and the gap between them", () => {
    const widths = panelWidths(PANEL_GROUP_WIDTH);
    expect(dividerStart(PANEL_GROUP_WIDTH, 0)).toBeCloseTo(widths[0] ?? -1, 6);
    expect(dividerStart(PANEL_GROUP_WIDTH, 1)).toBeCloseTo(
      (widths[0] ?? 0) + 6 + (widths[1] ?? 0),
      6,
    );
    expect(dividerStart(PANEL_GROUP_WIDTH, 0)).toBeCloseTo(125.6, 6);
    expect(dividerStart(PANEL_GROUP_WIDTH, 1)).toBeCloseTo(477, 6);
  });

  it("derives the blank share a collapse leaves from the box it measured", () => {
    // The headless run measured a 62-point header; the live probe derives the
    // strip from whatever the window paints, so this case holds the rule.
    const shares = collapsedShares(PANEL_GROUP_WIDTH, "sidebar", 62);
    expect(shares.freed).toBeCloseTo(566, 6);
    expect(shares.expanded).toBeCloseTo(0.8 * 566, 6);
    expect(shares.gap).toBeCloseTo(0.2 * 566, 6);
    expect(shares.expanded + shares.gap).toBeCloseTo(shares.freed, 6);
  });

  it("gives every pane a distinct fill, a distinct line and a default", () => {
    const fills = [PANE_FILLS.sidebar, PANE_FILLS.editor, PANE_FILLS.inspector];
    const bodies = [
      PANE_BODIES.sidebar,
      PANE_BODIES.editor,
      PANE_BODIES.inspector,
    ];
    expect(Arr.dedupe(fills)).toHaveLength(3);
    expect(Arr.dedupe(bodies)).toHaveLength(3);
    expect(paneContent("sidebar", { fill: "page", body: "page" })).toEqual({
      fill: PANE_FILLS.sidebar,
      body: PANE_BODIES.sidebar,
    });
    expect(paneContent("unknown", { fill: "page", body: "page" })).toEqual({
      fill: "page",
      body: "page",
    });
  });
});

describe("the probe that paints it", () => {
  it("is registered once, over the panel capability", () => {
    const entries = liveRegistry.filter(
      (entry) => entry.id === "panel-group-lifecycle",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.capability).toBe("panel");
  });

  it("mounts the package's PanelGroup, not a probe-local pane", () => {
    expect(probe).toContain('from "@gpuixui/dock"');
    expect(probe).toContain("<PanelGroup");
    expect(probe).toContain("layout={layout}");
    expect(probe).toContain("onLayoutChange={setLayout}");
    expect(probe).toContain("testId={PANEL_IDS.group}");
    expect(probe).not.toContain("onMouseDown");
  });

  it("prints the step the fixture derives, not a number of its own", () => {
    const stepped = stepSizes();
    const printed = `panes=sidebar:${Math.round(
      (stepped[0] ?? Number.NaN) * 100,
    )},editor:${Math.round((stepped[1] ?? Number.NaN) * 100)},inspector:25 collapsed=none`;
    expect(printed).toBe(
      "panes=sidebar:23,editor:52,inspector:25 collapsed=none",
    );
    expect(probe).toContain(printed);
    expect(PANEL_GROUP_STEP).toBe(16);
    expect(PANEL_GROUP_HEIGHT).toBe(320);
  });

  it("prints the initial readout the fixture builds", () => {
    expect(
      panelGroupReadout({
        panels: PANEL_GROUP_PANELS.map((panel) => ({
          ...panel,
          collapsed: false,
        })),
      }),
    ).toBe("panes=sidebar:20,editor:55,inspector:25 collapsed=none");
    expect(PANEL_IDS.group).toBe("panel-group");
  });

  it("prints the checks the probe actually asserts", () => {
    const asserted = probe.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(40);
    const printed = Number(
      /(\d+) checks, `--only panel-group-lifecycle`/.exec(section)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(asserted);
  });

  it("records the gap and the half this probe does not measure", () => {
    expect(section).toContain("dock-split-lifecycle");
    expect(section).toContain("freed share");
    expect(section).toContain("blank");
    expect(section).toContain("panel-group-rest");
    expect(section).toContain("panel-group-collapsed");
  });
});
