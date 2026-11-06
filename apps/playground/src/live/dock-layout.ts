import * as Arr from "effect/Array";
import type { DockNode } from "@gpuixui/dock";

export const DOCK_WIDTH = 640;

export const DOCK_HEIGHT = 320;

export const DOCK_DIVIDER = 6;

export const DOCK_SPLIT_SIZE = 0.35;

export const DOCK_IDS = {
  before: "dock-layout-before",
  layout: "dock-layout",
  readout: "dock-layout-readout",
  reset: "dock-layout-reset",
  stage: "dock-layout-stage",
} as const;

export const dockBodyId = (tab: string): string => `dock-layout-body-${tab}`;

export const dockBody = (tab: string): string => `document=${tab}`;

export const DOCK_TAB_ZONE: Readonly<Record<string, "explorer" | "editor">> = {
  files: "explorer",
  logs: "editor",
  notes: "editor",
  outline: "explorer",
};

export const DOCK_ZONE_FILLS = {
  editor: "#34C759",
  explorer: "#FF3B30",
} as const;

export const DOCK_TAB_LABELS: Readonly<Record<string, string>> = {
  files: "Files",
  logs: "Logs",
  notes: "Notes",
  outline: "Outline",
};

export const DOCK_GROUPS = ["explorer", "editor"] as const;

export const DOCK_GROUP_TABS: Readonly<
  Record<
    (typeof DOCK_GROUPS)[number],
    { readonly active: string; readonly ids: ReadonlyArray<string> }
  >
> = {
  editor: { active: "notes", ids: ["notes", "logs"] },
  explorer: { active: "files", ids: ["files", "outline"] },
};

export const groupNodeId = (group: (typeof DOCK_GROUPS)[number]): string =>
  group;

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

export const splitWidths = (
  width: number,
  size: number,
): readonly [number, number] => {
  const available = width - DOCK_DIVIDER;
  return [size * available, (1 - size) * available];
};

export const DOCK_PANES = splitWidths(DOCK_WIDTH, DOCK_SPLIT_SIZE);

export const DOCK_SECOND_X = (DOCK_PANES[0] ?? Number.NaN) + DOCK_DIVIDER;

export const nodeName = (node: DockNode): string => `${node.kind}:${node.id}`;

export const dockReadoutLine = (
  name: string,
  report: string,
  changes: number,
): string => `layout=${name} reports=${report} changes=${changes}`;

export const dockLayoutReadout = (
  layout: DockNode,
  report: string,
  changes: number,
): string => dockReadoutLine(nodeName(layout), report, changes);
