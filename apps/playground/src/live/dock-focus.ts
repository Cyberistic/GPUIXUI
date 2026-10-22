/**
 * The dock `dock-focus-lifecycle` drives, and the stop rule a dock owes.
 *
 * Tier 4's **keyboard navigation** row is the one capability no probe had
 * measured: a dock is panes inside panes, so the questions are which controls a
 * Tab traversal reaches, in what order, and what happens to the controls a
 * collapsed pane keeps in the tree. The fixture is composed by hand rather than
 * from the shipped components on purpose — the shipped `Tabs` already owns
 * roving focus (`tabs-lifecycle`), and what is unmeasured is the layer above it.
 *
 * Kept native-free so the rule the probe measures is testable on a host with no
 * binding, as `table.ts` is.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The dock's three documents, in rail order. */
export const DOCK_TABS = ["explorer", "output", "problems"] as const;
/** One of the dock's documents. */
export type DockTab = (typeof DOCK_TABS)[number];

/** The sidebar actions, in tree order. */
export const DOCK_SIDEBAR_ACTIONS = ["new", "settings"] as const;
/** One of the sidebar's actions. */
export type DockSidebarAction = (typeof DOCK_SIDEBAR_ACTIONS)[number];

/** The width the sidebar paints while it is open; a closed one paints zero. */
export const DOCK_SIDEBAR_WIDTH = 140;

/**
 * The action the dock removes the tab stop from while its sidebar is closed.
 *
 * A sidebar collapses by painting zero width, not by unmounting (the motion
 * probe measured that a clipped box is how a width animates), so its controls
 * stay in the tree. `settings` is the guarded sample; `new` keeps its stop so
 * the same traversal measures what the runtime does with an unguarded one.
 */
export const DOCK_GUARDED_ACTION: DockSidebarAction = "settings";

/** The control that opens and closes the sidebar. */
export const DOCK_TOGGLE = "dock-sidebar-toggle";
/** The dock's status-bar action, the last stop in the traversal. */
export const DOCK_STATUS = "dock-status";

/** The rail trigger's `testId` for a tab. */
export const dockRailId = (tab: DockTab): string => `dock-rail-${tab}`;
/** The pane's `testId` for a tab. */
export const dockPaneId = (tab: DockTab): string => `dock-pane-${tab}`;
/** The pane's first field's `testId` for a tab. */
export const dockFieldId = (tab: DockTab): string => `dock-field-${tab}`;
/** A sidebar action's `testId`. */
export const dockActionId = (action: DockSidebarAction): string =>
  `dock-sidebar-${action}`;

/**
 * The tab one rail step from `tab`, wrapping at both ends.
 *
 * Three documents rather than two: with a pair, "left" and "right" both reach
 * the neighbour, so a rail that ignored the direction would still pass. The
 * probe steps right off the rail's end and left off its start.
 */
export const stepTab = (tab: DockTab, delta: -1 | 1): DockTab => {
  const index = Option.getOrElse(
    Arr.findFirstIndex(DOCK_TABS, (value) => value === tab),
    () => 0,
  );
  const count = Arr.length(DOCK_TABS);
  const next = (((index + delta) % count) + count) % count;
  return Option.getOrElse(Arr.get(DOCK_TABS, next), () => tab);
};

/**
 * The stops a Tab traversal reaches, in tree order.
 *
 * Only the selected tab's trigger and its mounted pane are stops: a dock keeps
 * one stop per rail, not one per tab, and the inactive pane is not in the tree
 * at all. A closed sidebar keeps its unguarded action (`new`) and loses the
 * guarded one (`settings`).
 */
export const dockStops = (
  sidebarOpen: boolean,
  tab: DockTab,
): ReadonlyArray<string> => [
  DOCK_TOGGLE,
  ...Arr.map(
    Arr.filter(
      DOCK_SIDEBAR_ACTIONS,
      (action) => sidebarOpen || action !== DOCK_GUARDED_ACTION,
    ),
    dockActionId,
  ),
  dockRailId(tab),
  dockFieldId(tab),
  DOCK_STATUS,
];
