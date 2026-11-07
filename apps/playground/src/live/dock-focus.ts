import * as Arr from "effect/Array";
import * as Option from "effect/Option";

export const DOCK_TABS = ["explorer", "output", "problems"] as const;

export type DockTab = (typeof DOCK_TABS)[number];

export const DOCK_SIDEBAR_ACTIONS = ["new", "settings"] as const;

export type DockSidebarAction = (typeof DOCK_SIDEBAR_ACTIONS)[number];

export const DOCK_SIDEBAR_WIDTH = 140;

export const DOCK_GUARDED_ACTION: DockSidebarAction = "settings";

export const DOCK_TOGGLE = "dock-sidebar-toggle";

export const DOCK_STATUS = "dock-status";

export const dockRailId = (tab: DockTab): string => `dock-rail-${tab}`;

export const dockPaneId = (tab: DockTab): string => `dock-pane-${tab}`;

export const dockFieldId = (tab: DockTab): string => `dock-field-${tab}`;

export const dockActionId = (action: DockSidebarAction): string =>
  `dock-sidebar-${action}`;

export const stepTab = (tab: DockTab, delta: -1 | 1): DockTab => {
  const index = Option.getOrElse(
    Arr.findFirstIndex(DOCK_TABS, (value) => value === tab),
    () => 0,
  );
  const count = Arr.length(DOCK_TABS);
  const next = (((index + delta) % count) + count) % count;
  return Option.getOrElse(Arr.get(DOCK_TABS, next), () => tab);
};

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
