export const MODAL_PAGE_ROWS = 40;

export const MODAL_ROW_HEIGHT = 40;

export const BODY_ROWS = 30;

export const PAGE_VIEWPORT = 472;

export const DIALOG_VIEWPORT = 456;

export const DIALOG_CHROME_HEIGHT = 220;

export const DIALOG_CLOSE_TOP = 44;

export const PAGE_ROW_WIDTH = 120;

export const MODAL_WHEEL = -100;

export const MODAL_SCROLL_IDS = {
  probe: "modal-scroll-probe",
  opener: "modal-scroll-open",
  page: "modal-scroll-page",
  pageReadout: "modal-scroll-page-readout",
  dialog: "modal-scroll-dialog",
  dialogReadout: "modal-scroll-dialog-readout",
} as const;

export interface ScrollReading {
  readonly x: number;
  readonly y: number;
  readonly events: number;
}

export const initialScrollReading: ScrollReading = { x: 0, y: 0, events: 0 };

export const pageReadout = (
  reading: ScrollReading,
  viewportHeight = 0,
): string =>
  `page=x${reading.x} y${reading.y} events=${reading.events} viewport=${viewportHeight}`;

export const dialogReadout = (reading: ScrollReading): string =>
  `dialog=x${reading.x} y${reading.y} events=${reading.events}`;

export const pageContentHeight = MODAL_PAGE_ROWS * MODAL_ROW_HEIGHT;

export const dialogContentHeight =
  BODY_ROWS * MODAL_ROW_HEIGHT + DIALOG_CHROME_HEIGHT;

export const maxOffset = (
  contentHeight: number,
  viewportHeight: number,
): number => Math.min(0, viewportHeight - contentHeight);
