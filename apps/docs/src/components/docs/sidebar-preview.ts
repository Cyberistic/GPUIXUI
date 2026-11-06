export const SIDEBAR_MODES = ["offcanvas", "icon", "none"] as const;

export type SidebarMode = (typeof SIDEBAR_MODES)[number];

export const SIDEBAR_WIDTH = 256;

export const SIDEBAR_ICON_WIDTH = 48;

export const panelWidth = (mode: SidebarMode, open: boolean): number =>
  mode === "icon" && !open ? SIDEBAR_ICON_WIDTH : SIDEBAR_WIDTH;

export const panelOffset = (mode: SidebarMode, open: boolean): number =>
  mode === "offcanvas" && !open ? -SIDEBAR_WIDTH : 0;

export const panelGap = (mode: SidebarMode, open: boolean): number =>
  mode === "none" || open
    ? SIDEBAR_WIDTH
    : mode === "icon"
      ? SIDEBAR_ICON_WIDTH
      : 0;

export const collapseLabel = (open: boolean): string =>
  open ? "Collapse sidebar" : "Expand sidebar";
