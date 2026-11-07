export const SIDEBAR_IDS = {
  probe: "sidebar-probe",
  row: "sidebar-row",
  clip: "sidebar-clip",
  content: "sidebar-content",
  marker: "sidebar-marker",
  main: "sidebar-main",
  toggle: "sidebar-toggle",
  readout: "sidebar-readout",
} as const;

export const SIDEBAR_WIDTHS = { open: 240, closed: 0 } as const;

export const SIDEBAR_ROW_HEIGHT = 160;

export const SIDEBAR_CONTENT_WIDTH = 240;
export const SIDEBAR_MARKER_X = 200;
export const SIDEBAR_MARKER_WIDTH = 40;

export const SIDEBAR_FILLS = {
  content: "#AF52DE",
  marker: "#FF3B30",
  main: "#0A84FF",
} as const;

export const SIDEBAR_TWEEN = { duration: 0.32, ease: "easeInOut" } as const;

export const SIDEBAR_STEP_MS = 10;

export const SIDEBAR_STEPS = 60;

export const SIDEBAR_TRAVEL_MARGIN = 24;

export const SIDEBAR_MID_MAX = SIDEBAR_MARKER_X - SIDEBAR_TRAVEL_MARGIN;

export const isTravelling = (width: number): boolean =>
  width > SIDEBAR_WIDTHS.closed + SIDEBAR_TRAVEL_MARGIN &&
  width < SIDEBAR_WIDTHS.open - SIDEBAR_TRAVEL_MARGIN;

export interface SidebarBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const hiddenMarkerBand = (
  row: SidebarBox,
  clipRight: number,
): SidebarBox => {
  const bandStart = row.x + SIDEBAR_MARKER_X;
  const bandEnd = bandStart + SIDEBAR_MARKER_WIDTH;
  const hiddenFrom = Math.max(clipRight, bandStart);
  return {
    x: hiddenFrom,
    y: row.y,
    width: Math.max(0, bandEnd - hiddenFrom),
    height: SIDEBAR_ROW_HEIGHT,
  };
};

export const markerBand = (row: SidebarBox): SidebarBox => ({
  x: row.x + SIDEBAR_MARKER_X,
  y: row.y,
  width: SIDEBAR_MARKER_WIDTH,
  height: SIDEBAR_ROW_HEIGHT,
});

export const insideClipPoint = (
  clipRight: number,
  margin: number,
  rowY: number,
): { readonly x: number; readonly y: number } => ({
  x: clipRight - margin,
  y: rowY + SIDEBAR_ROW_HEIGHT / 2,
});

export const outsideClipPoint = (
  clipRight: number,
  margin: number,
  rowY: number,
): { readonly x: number; readonly y: number } => ({
  x: clipRight + margin,
  y: rowY + SIDEBAR_ROW_HEIGHT / 2,
});

export interface SidebarReadout {
  readonly open: boolean;
  readonly markerPresses: number;
  readonly mainPresses: number;
}

export const sidebarReadout = (state: SidebarReadout): string =>
  `open=${state.open} marker=${state.markerPresses} main=${state.mainPresses}`;

export const SIDEBAR_REST: SidebarReadout = {
  open: true,
  markerPresses: 0,
  mainPresses: 0,
} as const;

export const SIDEBAR_CHECKS = 47;
