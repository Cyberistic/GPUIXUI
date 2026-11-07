export const PINNED_IDS = {
  probe: "pinned-probe",
  list: "pinned-list",
  headerToday: "pinned-header-0",
  headerYesterday: "pinned-header-1",
  rowToday: "pinned-row-today",
  rowYesterday: "pinned-row-yesterday",
  controlRow: "pinned-control-row",
  controlCover: "pinned-control-cover",
  readout: "pinned-readout",
} as const;

export const PINNED_HEADER = 32;

export const PINNED_ROW_HEIGHT = 200;

export const PINNED_SECTION_HEIGHT = PINNED_HEADER + PINNED_ROW_HEIGHT;

export const PINNED_VIEWPORT = { width: 300, height: 160 } as const;

export const PINNED_CONTENT = 2 * PINNED_SECTION_HEIGHT;

export const PINNED_MAX = PINNED_VIEWPORT.height - PINNED_CONTENT;

export const PINNED_WHEEL = -120;

export const PINNED_END_WHEEL = -1000;

export const PINNED_RETURN_WHEEL = 1000;

export const PINNED_ROW_FILL = "#FF3B30";

export const ROW_TODAY_TOP = PINNED_HEADER;

export const rowCentre = (
  top: number,
  height: number,
  offset: number,
): number => top + height / 2 + offset;

export const pinnedReadout = (state: {
  readonly offsetY: number;
  readonly today: number;
  readonly yesterday: number;
  readonly covered: number;
  readonly cover: number;
}): string =>
  `y=${state.offsetY} presses=${state.today},${state.yesterday} control=${state.covered},${state.cover}`;
