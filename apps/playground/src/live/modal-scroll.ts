/**
 * Whether an open modal contains the wheel.
 *
 * Two measured rules meet here. `nested-scroll-lifecycle` showed that one wheel
 * moves **every scrollable ancestor** on the hit path, so a list inside a page
 * cannot keep a wheel from that page. A modal is not an ancestor of the page: it
 * is an `<anchored occlude>` layer painted over it, and `@gpuixui/primitives`'
 * `decorative` documents that `occlude()` "stops the wheel too" — a claim no
 * window had measured. This fixture owns the ids, the page and dialog-body
 * arithmetic and the readouts, so the probe's checks and its guard test agree on
 * one spelling.
 *
 * The page is the reader's scroller and the dialog body is the shipped
 * `DialogContent`'s own `overflow: "scroll"`; the readouts live on the page
 * header (a tree read, so the veil does not hide them). The surface's close
 * control lives in the wrapper the scroller sits in, so the body's travel
 * leaves it where it rests — the point this fixture also owns.
 */

/** The page's rows: 40 × 40px against a ~480px viewport, so it has travel. */
export const MODAL_PAGE_ROWS = 40;

/** The page's row height, and the dialog body's. */
export const MODAL_ROW_HEIGHT = 40;

/** The dialog body's rows: 30 × 40px against the surface's 456px box. */
export const BODY_ROWS = 30;

/** The page's painted viewport, measured on 0.11.0 in the 900×520 window. */
export const PAGE_VIEWPORT = 472;

/** The dialog surface's painted height, in the same window. */
export const DIALOG_VIEWPORT = 456;

/**
 * The dialog's own header and padding, above and below the rows it scrolls.
 *
 * Measured: the body clamps at `456 - 1420`, so the surface's content is the 30
 * rows plus these 220 points. It is 12 fewer than the `232` this fixture first
 * carried: that reading included the close control's absolute box, which sat
 * inside the scroller and left a phantom band below the rows. The control now
 * lives in the wrapper around the scroller, so it contributes no content and the
 * probe compares the clamp exactly rather than accepting the old transcript.
 */
export const DIALOG_CHROME_HEIGHT = 220;

/**
 * The dialog's close control, measured where it paints at rest.
 *
 * The control is `position: "absolute"` in the wrapper the scroller sits in, so
 * this is the one box it paints in: a scrolled body leaves it here rather than
 * carrying it away (`44 + the body's clamp` was the measured carry this fixture
 * used to own).
 */
export const DIALOG_CLOSE_TOP = 44;

/**
 * The page rows' width: narrow, so a wheel aimed at a row's centre lands left
 * of the centred dialog surface and measures the veil rather than the modal.
 */
export const PAGE_ROW_WIDTH = 120;

/** One wheel's vertical delta: negative scrolls down, the runtime's sign. */
export const MODAL_WHEEL = -100;

/**
 * The ids the probe drives.
 *
 * `dialog` is the shipped surface itself: it is the scroller its long body
 * scrolls, so its own handle is the reading a modal-body wheel moves.
 */
export const MODAL_SCROLL_IDS = {
  probe: "modal-scroll-probe",
  opener: "modal-scroll-open",
  page: "modal-scroll-page",
  pageReadout: "modal-scroll-page-readout",
  dialog: "modal-scroll-dialog",
  dialogReadout: "modal-scroll-dialog-readout",
} as const;

/** One scroller as the probe records it. */
export interface ScrollReading {
  readonly x: number;
  readonly y: number;
  readonly events: number;
}

/** The state before the reader has wheeled anything. */
export const initialScrollReading: ScrollReading = { x: 0, y: 0, events: 0 };

/** The page's readout: the offset, the wheels it heard, and its own viewport. */
export const pageReadout = (
  reading: ScrollReading,
  viewportHeight = 0,
): string =>
  `page=x${reading.x} y${reading.y} events=${reading.events} viewport=${viewportHeight}`;

/** The dialog body's readout: the offset and how many wheels it heard. */
export const dialogReadout = (reading: ScrollReading): string =>
  `dialog=x${reading.x} y${reading.y} events=${reading.events}`;

/** The page's content height, from its own rows. */
export const pageContentHeight = MODAL_PAGE_ROWS * MODAL_ROW_HEIGHT;

/** The dialog body's content height: its rows and the surface's own chrome. */
export const dialogContentHeight =
  BODY_ROWS * MODAL_ROW_HEIGHT + DIALOG_CHROME_HEIGHT;

/**
 * The furthest a scroller of `contentHeight` moves in a `viewportHeight` box.
 *
 * The runtime clamps against the scroller's own content, so a wheel past the end
 * lands on this offset and no further — the arithmetic both the page's and the
 * dialog body's huge-wheel checks compare against.
 */
export const maxOffset = (
  contentHeight: number,
  viewportHeight: number,
): number => Math.min(0, viewportHeight - contentHeight);
