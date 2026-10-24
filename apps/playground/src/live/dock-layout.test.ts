/**
 * Holds `dock-layout-lifecycle` to the component, its arithmetic and its prose.
 *
 * The gap this guards: Tier 4's *Tabbed panels* and *Nested panel arrangements*
 * rows cited `docking-nested`, which mounts the playground's own `SplitPane`
 * fixture — the shipped `DockLayout` had never been mounted in a window. If
 * this probe is rewritten around a local split, the rows and the README would
 * claim the package while measuring a copy.
 *
 * The second guard is the defect itself. A group reports the node it changed,
 * so `onLayoutChange={setLayout}` replaces the whole tree with one group. The
 * probe pins that reading (`layout=tabs:editor reports=tabs:editor`); this case
 * reads the reporting call out of the component and the same sentence out of
 * the README, so the check and the prose cannot drift apart silently.
 *
 * `node:fs` is deliberate, as in the other live fixtures: this reads the
 * repository's own component, probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  DOCK_DIVIDER,
  DOCK_GROUP_TABS,
  DOCK_GROUPS,
  DOCK_HEIGHT,
  DOCK_IDS,
  DOCK_PANES,
  DOCK_SECOND_X,
  DOCK_SPLIT_SIZE,
  DOCK_TAB_LABELS,
  DOCK_TAB_ZONE,
  DOCK_WIDTH,
  DOCK_ZONE_FILLS,
  dockBody,
  dockBodyId,
  dockLayoutReadout,
  dockLayoutTree,
  dockReadoutLine,
  nodeName,
  splitWidths,
} from "./dock-layout.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./dock-layout-probe.tsx");
const component = read("../../../../packages/dock/src/dock-layout.tsx");
const readiness = read("../../../../packages/dock/README.md");
const inventory = read("../../../../COMPONENTS.md");
const readme = read("../../README.md");

/** The probe's README section, so a value printed elsewhere cannot pass. */
const section = (() => {
  const heading = "### `dock-layout-lifecycle` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n## ", start + heading.length);
  return readme.slice(start, end === -1 ? undefined : end);
})();

/** The COMPONENTS.md row named `title`. */
const row = (title: string): string => {
  const start = inventory.indexOf(`| ${title} |`);
  if (start === -1) return "";
  const end = inventory.indexOf("\n", start);
  return inventory.slice(start, end === -1 ? undefined : end);
};

describe("the dock layout tree", () => {
  it("derives each pane from the split's own share arithmetic", () => {
    expect(DOCK_PANES).toEqual(splitWidths(DOCK_WIDTH, DOCK_SPLIT_SIZE));
    expect(DOCK_PANES[0]).toBeCloseTo(0.35 * (640 - DOCK_DIVIDER), 6);
    expect(DOCK_PANES[1]).toBeCloseTo(0.65 * (640 - DOCK_DIVIDER), 6);
    expect(DOCK_SECOND_X).toBeCloseTo(DOCK_PANES[0] + DOCK_DIVIDER, 6);
    expect(DOCK_WIDTH).toBe(640);
    expect(DOCK_HEIGHT).toBe(320);
    expect(DOCK_DIVIDER).toBe(6);
  });

  it("builds a split whose children are the two tab groups", () => {
    const tree = dockLayoutTree();
    expect(tree.kind).toBe("split");
    if (tree.kind !== "split") return;
    expect(tree.size).toBe(DOCK_SPLIT_SIZE);
    expect([tree.first.id, tree.second.id]).toEqual([...DOCK_GROUPS]);
    expect(
      Arr.map(DOCK_GROUPS, (group) => DOCK_GROUP_TABS[group].active),
    ).toEqual(["files", "notes"]);
  });

  it("gives every tab a label, a zone and a content line of its own", () => {
    const tabs = Arr.flatMap(
      DOCK_GROUPS,
      (group) => DOCK_GROUP_TABS[group].ids,
    );
    expect(Arr.dedupe(tabs)).toHaveLength(tabs.length);
    expect(
      Arr.dedupe(Arr.map(tabs, (tab) => DOCK_TAB_LABELS[tab] ?? "")),
    ).toHaveLength(tabs.length);
    expect(Arr.dedupe(Arr.map(tabs, dockBody))).toHaveLength(tabs.length);
    expect(Arr.dedupe(Arr.map(tabs, dockBodyId))).toHaveLength(tabs.length);
    expect(
      Arr.dedupe(Arr.map(DOCK_GROUPS, (group) => DOCK_ZONE_FILLS[group])),
    ).toHaveLength(DOCK_GROUPS.length);
    // Every tab names a zone the fills record carries, so a body always paints
    // a colour the capture can assert.
    expect(Arr.every(tabs, (tab) => (DOCK_TAB_ZONE[tab] ?? "") !== "")).toBe(
      true,
    );
  });

  it("prints the tree, the reported node and the presses on one line", () => {
    expect(dockLayoutReadout(dockLayoutTree(), "none", 0)).toBe(
      "layout=split:root reports=none changes=0",
    );
    expect(dockReadoutLine("tabs:editor", "tabs:editor", 1)).toBe(
      "layout=tabs:editor reports=tabs:editor changes=1",
    );
    expect(nodeName(dockLayoutTree())).toBe("split:root");
  });
});

describe("the component the probe measures", () => {
  it("reports the node it changed, not the tree the caller passed", () => {
    // The mechanism behind the measured readout: a tab press hands
    // `setActiveTab(node, …)` — the tabs node — to the caller's handler.
    expect(component).toContain(
      "onLayoutChange?.(setActiveTab(node, node.id, tab.id))",
    );
    expect(component).toContain("Reports the next tree after a tab switch");
    // …and the package's README tells a consumer to assign that report as the
    // whole tree, which is what turns the node into the layout.
    expect(readiness).toContain("onLayoutChange={setLayout}");
    // The probe carries the same reading, not a rewritten expectation.
    expect(probe).toContain('dockReadoutLine("tabs:editor", "tabs:editor", 1)');
    expect(probe).toContain(
      'dockReadoutLine("tabs:explorer", "tabs:explorer", 2)',
    );
  });

  it("renders its parts without an address, so the press names the words", () => {
    // `PanelGroup` and `SplitPane` derive child ids and receive their `testId`
    // from the caller; `DockLayout` derives them too but passes no `testId` to
    // the node views it renders, so every trigger and divider it paints is
    // nameless and the probe reaches a trigger by the words it paints.
    const nodeViews = component.match(/<DockNodeView[\s\S]*?\/>/g) ?? [];
    expect(nodeViews).toHaveLength(3);
    expect(nodeViews.filter((view) => view.includes("testId"))).toEqual([]);
    expect(component).toContain("`${testId}-tab-${tab.id}`");
    expect(component).toContain("`${testId}-divider`");
    expect(probe).toContain("clickText(");
    expect(probe).not.toContain("dock-layout-tab-");
    expect(probe).toContain("`testId` to them");
  });

  it("answers a press only, with no keyboard route on the strip", () => {
    expect(component).toContain("onClick={() =>");
    expect(component).not.toContain("onKeyDown");
  });
});

describe("the probe that paints it", () => {
  it("is registered once, over the panel capability", () => {
    const entries = liveRegistry.filter(
      (entry) => entry.id === "dock-layout-lifecycle",
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.capability).toBe("panel");
  });

  it("mounts the package's DockLayout, not a probe-local split", () => {
    expect(probe).toContain('from "@gpuixui/dock"');
    expect(probe).toContain("<DockLayout");
    expect(probe).toContain("layout={layout}");
    expect(probe).toContain("onLayoutChange={(next) =>");
    expect(probe).toContain("renderTab={(id) => <TabBody tab={id} />}");
    expect(probe).toContain("testId={DOCK_IDS.stage}");
    expect(probe).not.toContain("SplitPane");
    expect(DOCK_IDS.layout).toBe("dock-layout");
    expect(DOCK_IDS.stage).toBe("dock-layout-stage");
  });

  it("prints the checks the probe actually asserts", () => {
    const asserted = probe.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(25);
    const printed = Number(
      /(\d+) checks, `--only dock-layout-lifecycle`/.exec(section)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(asserted);
  });

  it("records the gap, the defect and the capture", () => {
    expect(section).toContain("docking-nested");
    expect(section).toContain("never the package's layout");
    expect(section).toContain("reports=tabs:editor");
    expect(section).toContain("replaces the whole tree with that group");
    expect(section).toContain("still reports a node");
    expect(section).toContain("dock-layout-rest");
    expect(section).toContain("clickText");
    expect(section).toContain("TODO.md");
  });

  it("is the evidence the Tier 4 rows cite", () => {
    const tabbed = row("Tabbed panels");
    expect(tabbed).toContain("dock-layout-lifecycle");
    expect(tabbed).toContain("yes (measured)");
    const nested = row("Nested panel arrangements");
    expect(nested).toContain("dock-layout-lifecycle");
    // The rows must keep the honest half: the headless composition measured the
    // playground's split, and the package's layout is what the window measures.
    expect(tabbed).toContain("the node it changed");
    expect(nested).toContain("the node it changed");
  });
});
