/**
 * The arithmetic and the readout the `panel-group-core` scenario drives.
 *
 * `panel-resize` measures a divider the playground writes itself, and
 * `dock-split-lifecycle` proves the shipped `SplitPane` in a window. The shipped
 * **`PanelGroup`** — the Tier 4 surface a workspace actually composes — had no
 * renderer coverage: its fractions, its collapse toggle and its keyboard step
 * were only read through `logic.ts`'s unit tests, so a group that ignored its
 * layout, wired a toggle to nothing or applied a key to the wrong neighbour
 * would leave every suite green.
 *
 * A group's fraction is the share of the space **between** its dividers, so the
 * expected pane width is derived here from the group's own width and the
 * package's divider thickness. The readout prints whole percentages and the
 * collapsed ids, because those are the numbers the steps assert and a rounded
 * value a test retypes is a value that drifts.
 */
import * as Arr from "effect/Array";

/** The group's painted box, as the scenario view mounts it. */
export const PANEL_GROUP_WIDTH = 640;

/** The group's painted height, as the scenario view mounts it. */
export const PANEL_GROUP_HEIGHT = 320;

/** The divider thickness the package paints between two panes. */
export const PANEL_GROUP_DIVIDER = 6;

/** The pixels one arrow key moves a focused divider (`DIVIDER_STEP`). */
export const PANEL_GROUP_STEP = 16;

/** One initial panel: the fractions the workspace example ships. */
export interface PanelGroupPanel {
  readonly id: string;
  readonly size: number;
  readonly collapsible: boolean;
}

/** The group the scenario mounts: three panes, the sides collapsible. */
export const PANEL_GROUP_PANELS: ReadonlyArray<PanelGroupPanel> = [
  { id: "sidebar", size: 0.2, collapsible: true },
  { id: "editor", size: 0.55, collapsible: false },
  { id: "inspector", size: 0.25, collapsible: true },
];

/** The space the fractions share: the row minus every divider it holds. */
export const availableWidth = (width: number, count: number): number =>
  width - Math.max(0, count - 1) * PANEL_GROUP_DIVIDER;

/** Each pane's painted width, in order, for a group `width` wide. */
export const panelWidths = (width: number): ReadonlyArray<number> =>
  Arr.map(
    PANEL_GROUP_PANELS,
    (panel) =>
      (panel.size / totalSize(PANEL_GROUP_PANELS)) *
      availableWidth(width, PANEL_GROUP_PANELS.length),
  );

/** The fractions rescaled the way `normalizePanels` paints them. */
const totalSize = (panels: ReadonlyArray<PanelGroupPanel>): number =>
  Arr.reduce(panels, 0, (sum, panel) => sum + Math.max(0, panel.size));

/** The layout shape the readout reads; structural so the test needs no React. */
export interface PanelGroupView {
  readonly panels: ReadonlyArray<{
    readonly id: string;
    readonly size: number;
    readonly collapsed: boolean;
  }>;
}

/** `panes=sidebar:20,editor:55,inspector:25 collapsed=none`, one line. */
export const panelGroupReadout = (layout: PanelGroupView): string => {
  const panes = Arr.map(
    layout.panels,
    (panel) => `${panel.id}:${Math.round(panel.size * 100)}`,
  ).join(",");
  const collapsed = Arr.map(
    Arr.filter(layout.panels, (panel) => panel.collapsed),
    (panel) => panel.id,
  ).join(",");
  return `panes=${panes} collapsed=${collapsed === "" ? "none" : collapsed}`;
};

/** The sizes a `right` step produces, so the printed percentages are derived. */
export const stepSizes = (): ReadonlyArray<number> => {
  const move =
    PANEL_GROUP_STEP /
    availableWidth(PANEL_GROUP_WIDTH, PANEL_GROUP_PANELS.length);
  return [
    (PANEL_GROUP_PANELS[0]?.size ?? 0) + move,
    (PANEL_GROUP_PANELS[1]?.size ?? 0) - move,
    PANEL_GROUP_PANELS[2]?.size ?? 0,
  ];
};
