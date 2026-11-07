import * as Arr from "effect/Array";

export const PANEL_GROUP_WIDTH = 640;

export const PANEL_GROUP_HEIGHT = 320;

export const PANEL_GROUP_DIVIDER = 6;

export const PANEL_GROUP_STEP = 16;

export interface PanelGroupPanel {
  readonly id: string;
  readonly size: number;
  readonly collapsible: boolean;
}

export const PANEL_GROUP_PANELS: ReadonlyArray<PanelGroupPanel> = [
  { id: "sidebar", size: 0.2, collapsible: true },
  { id: "editor", size: 0.55, collapsible: false },
  { id: "inspector", size: 0.25, collapsible: true },
];

export const availableWidth = (width: number, count: number): number =>
  width - Math.max(0, count - 1) * PANEL_GROUP_DIVIDER;

export const panelWidths = (width: number): ReadonlyArray<number> =>
  Arr.map(
    PANEL_GROUP_PANELS,
    (panel) =>
      (panel.size / totalSize(PANEL_GROUP_PANELS)) *
      availableWidth(width, PANEL_GROUP_PANELS.length),
  );

const totalSize = (panels: ReadonlyArray<PanelGroupPanel>): number =>
  Arr.reduce(panels, 0, (sum, panel) => sum + Math.max(0, panel.size));

export interface PanelGroupView {
  readonly panels: ReadonlyArray<{
    readonly id: string;
    readonly size: number;
    readonly collapsed: boolean;
  }>;
}

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
