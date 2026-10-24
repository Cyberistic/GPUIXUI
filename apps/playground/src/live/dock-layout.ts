/**
 * The `dock-layout-lifecycle` fixture: the shipped `DockLayout` in a window.
 *
 * `docking-nested` composes the playground's own `SplitPane` and calls the
 * result a dock, and `panel-group-lifecycle` paints the shipped `PanelGroup` —
 * but the shipped **`DockLayout`**, the tree a workspace restores and hands a
 * pane to, had never been mounted in a window. The rows that cite it
 * (`Tabbed panels`, `Nested panel arrangements`) were therefore reading a
 * composition the package was not part of.
 *
 * Two questions only the glass answers: does a split's fraction paint each tab
 * group in the share it owns, and does a tab press inside a group repaint that
 * pane without moving it? The second one is also where the component's contract
 * is measured rather than assumed: `onLayoutChange` is documented as "the next
 * tree", and a group reports the **node it changed** (see `dock-layout.tsx`),
 * so a caller that follows `onLayoutChange={setLayout}` replaces the whole tree
 * with one group. This fixture names the two group ids and the fraction the
 * probe derives its geometry from, so the check and the component cannot
 * disagree about what a press reports.
 *
 * Native-free, so every premise is testable on a host with no binding.
 */
import * as Arr from "effect/Array";
import type { DockNode } from "@gpuixui/dock";

/** The stage the layout fills, as the probe mounts it. */
export const DOCK_WIDTH = 640;

/** The stage's height. */
export const DOCK_HEIGHT = 320;

/** The divider thickness the package paints between two panes (`DIVIDER_WIDTH`). */
export const DOCK_DIVIDER = 6;

/** The root split's first-child share, as the fixture builds it. */
export const DOCK_SPLIT_SIZE = 0.35;

/** The addresses the probe's own parts carry. */
export const DOCK_IDS = {
  before: "dock-layout-before",
  layout: "dock-layout",
  readout: "dock-layout-readout",
  reset: "dock-layout-reset",
  stage: "dock-layout-stage",
} as const;

/** One tab id's content address: the only part of a group the probe can own. */
export const dockBodyId = (tab: string): string => `dock-layout-body-${tab}`;

/** The line one tab's content paints. */
export const dockBody = (tab: string): string => `document=${tab}`;

/**
 * Each tab's zone, so a body paints a fill that names the pane it sits in.
 *
 * A literal, not a theme role: the body is the **caller's** content, so a
 * sample that matched a role could pass against the layout's own surface. The
 * two zones differ, so a capture proves each pane painted its own content
 * rather than one content covering the stage.
 */
export const DOCK_TAB_ZONE: Readonly<Record<string, "explorer" | "editor">> = {
  files: "explorer",
  logs: "editor",
  notes: "editor",
  outline: "explorer",
};

/** The fill each zone paints. */
export const DOCK_ZONE_FILLS = {
  editor: "#34C759",
  explorer: "#FF3B30",
} as const;

/** The words each tab trigger paints — the only address the component gives it. */
export const DOCK_TAB_LABELS: Readonly<Record<string, string>> = {
  files: "Files",
  logs: "Logs",
  notes: "Notes",
  outline: "Outline",
};

/** The two tab groups, as the fixture builds the tree. */
export const DOCK_GROUPS = ["explorer", "editor"] as const;

/** One group's tabs, in strip order, and the tab it opens on. */
export const DOCK_GROUP_TABS: Readonly<
  Record<
    (typeof DOCK_GROUPS)[number],
    { readonly active: string; readonly ids: ReadonlyArray<string> }
  >
> = {
  editor: { active: "notes", ids: ["notes", "logs"] },
  explorer: { active: "files", ids: ["files", "outline"] },
};

/** The id a group's node carries, which is what a press reports. */
export const groupNodeId = (group: (typeof DOCK_GROUPS)[number]): string =>
  group;

/** The tree the probe mounts: two tab groups in one split. */
export const dockLayoutTree = (): DockNode => ({
  kind: "split",
  id: "root",
  orientation: "horizontal",
  size: DOCK_SPLIT_SIZE,
  first: {
    kind: "tabs",
    id: "explorer",
    activeTab: DOCK_GROUP_TABS.explorer.active,
    tabs: Arr.map(DOCK_GROUP_TABS.explorer.ids, (id) => ({
      id,
      label: DOCK_TAB_LABELS[id] ?? id,
    })),
  },
  second: {
    kind: "tabs",
    id: "editor",
    activeTab: DOCK_GROUP_TABS.editor.active,
    tabs: Arr.map(DOCK_GROUP_TABS.editor.ids, (id) => ({
      id,
      label: DOCK_TAB_LABELS[id] ?? id,
    })),
  },
});

/**
 * Each pane's painted width, derived from the split's own arithmetic: the
 * fractions share the row **minus** the divider (`available = total - 6`), and
 * `flexGrow` apportions that space by `size` and `1 - size`.
 */
export const splitWidths = (
  width: number,
  size: number,
): readonly [number, number] => {
  const available = width - DOCK_DIVIDER;
  return [size * available, (1 - size) * available];
};

/** The root's painted box, so the probe's checks read one derivation. */
export const DOCK_PANES = splitWidths(DOCK_WIDTH, DOCK_SPLIT_SIZE);

/** Where the second pane starts, from the stage's left edge. */
export const DOCK_SECOND_X = (DOCK_PANES[0] ?? Number.NaN) + DOCK_DIVIDER;

/** The node a press reports, as `kind:id` — the reading the probe asserts. */
export const nodeName = (node: DockNode): string => `${node.kind}:${node.id}`;

/** The readout's one line from a `kind:id` name. */
export const dockReadoutLine = (
  name: string,
  report: string,
  changes: number,
): string => `layout=${name} reports=${report} changes=${changes}`;

/** The readout's one line: the tree it holds, the node a press reported, and the presses. */
export const dockLayoutReadout = (
  layout: DockNode,
  report: string,
  changes: number,
): string => dockReadoutLine(nodeName(layout), report, changes);
