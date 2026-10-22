/**
 * `@gpuixui/dock` — the Tier 4 panel workspace.
 *
 * Three components over one resize control:
 *
 * - `SplitPane` — two panes and a draggable, keyboard-operable divider;
 * - `PanelGroup` — N panes in a row or column, sizes as fractions, a collapse
 *   toggle per pane, persisted as `PanelLayout`;
 * - `DockLayout` — a named tree of splits and tabbed groups rendered from
 *   `DockNode`, with `activeTab` per group and `onLayoutChange`.
 *
 * The geometry and the persisted shapes are pure data in `logic.js` — the same
 * reducers an Effect-driven or store-driven workspace reads — and the divider
 * honours the runtime rules the window probes measured (pointer capture on the
 * `onMouseDown`/`onMouseMove` pair, no `transform`, the `role="separator"`
 * keyboard control).
 */

export { SplitPane } from "./split-pane.js";
export type { SplitPaneProps } from "./split-pane.js";

export { PanelGroup } from "./panel-group.js";
export type { PanelGroupProps } from "./panel-group.js";

export { DockLayout } from "./dock-layout.js";
export type { DockLayoutProps } from "./dock-layout.js";

export {
  DIVIDER_STEP,
  DIVIDER_WIDTH,
  DockNode,
  DockNodeJson,
  DockSplit,
  DockTab,
  DockTabs,
  Panel,
  PanelLayout,
  PanelLayoutJson,
  clampSize,
  dragSize,
  isDividerKey,
  normalizePanels,
  resizeByKey,
  resizePanels,
  resizePanelsByKey,
  resizeSplit,
  resizeSplitByKey,
  setActiveTab,
  sizeBounds,
  togglePanelCollapsed,
} from "./logic.js";
export type { DividerKey, SizeBounds } from "./logic.js";
