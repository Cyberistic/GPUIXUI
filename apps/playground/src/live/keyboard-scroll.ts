/**
 * The `keyboard-scroll-lifecycle` fixture: a window's keys against the shipped
 * `ScrollArea`.
 *
 * `ScrollAreaViewport` is a tab stop that answers arrows, PageUp/PageDown,
 * Home and End, and it moves the renderer's own offset — but the offscreen
 * suite reaches it through `runtime.keyDown(elementId, …)`, which names the
 * element the key is aimed at. A window has no such verb: a key is delivered to
 * the **focused** element and bubbles from there, and the viewport's handler
 * stands down unless the focus is its own (`getFocusedElementId`), so a real
 * traversal has to reach the stop before a key can move anything. That is the
 * half a `TestRenderer` cannot prove (README §`keyboard-scroll-lifecycle`).
 *
 * The geometry is a premise the checks rest on: a vertical region with two
 * pages of content (a third PageDown has to clamp), a horizontal region with
 * more travel than its own page, and a non-focusable region beside controls
 * that bracket the tab order. `keyboard-scroll.test.ts` holds the arithmetic
 * before a window opens.
 */
import type { Theme } from "@gpuixui/tokens";

/** The fixture's elements, by test id. */
export const KEYBOARD_SCROLL_IDS = {
  before: "kscroll-before",
  vertical: "kscroll-vertical",
  field: "kscroll-field",
  horizontal: "kscroll-horizontal",
  inert: "kscroll-inert",
  after: "kscroll-after",
  readout: "kscroll-readout",
  value: "kscroll-value",
} as const;

/** The vertical region: a field slot and 11 rows of 40 in a 160px viewport. */
export const VERTICAL_VIEWPORT = { width: 200, height: 160 } as const;
export const VERTICAL_ROWS = 11;
export const VERTICAL_ROW_HEIGHT = 40;
/** The slot the field inside the region occupies, so the content stays round. */
export const FIELD_SLOT = 40;
export const VERTICAL_CONTENT =
  VERTICAL_ROWS * VERTICAL_ROW_HEIGHT + FIELD_SLOT;
/** Where the runtime clamps a move past the end (0 is the start). */
export const VERTICAL_MAX = VERTICAL_VIEWPORT.height - VERTICAL_CONTENT;

/** The horizontal region: 18 columns of 80 in a 320px-wide viewport. */
export const HORIZONTAL_VIEWPORT = { width: 320, height: 120 } as const;
export const HORIZONTAL_COLUMNS = 18;
export const HORIZONTAL_COLUMN_WIDTH = 80;
export const HORIZONTAL_CONTENT = HORIZONTAL_COLUMNS * HORIZONTAL_COLUMN_WIDTH;
export const HORIZONTAL_MAX = HORIZONTAL_VIEWPORT.width - HORIZONTAL_CONTENT;

/** A key the viewport's own contract answers on some axis. */
export type ScrollAction =
  | "up"
  | "down"
  | "pageup"
  | "pagedown"
  | "left"
  | "right"
  | "home"
  | "end";

/**
 * Which way a key moves one axis, and by how much.
 *
 * `line` mirrors `core/scroll.ts`: one density row. `page` is the viewport's own
 * side — its height vertically, its width sideways — so a horizontal region
 * pages by the screenful it shows rather than by a height it never displays.
 */
const MOVE: Readonly<
  Record<
    ScrollAction,
    { readonly direction: number; readonly size: "line" | "page" | "edge" }
  >
> = {
  up: { direction: 1, size: "line" },
  down: { direction: -1, size: "line" },
  pageup: { direction: 1, size: "page" },
  pagedown: { direction: -1, size: "page" },
  left: { direction: 1, size: "line" },
  right: { direction: -1, size: "line" },
  home: { direction: 0, size: "edge" },
  end: { direction: 0, size: "edge" },
};

/** One line of content, as the density preset the probe paints sets it. */
export const lineStep = (theme: Theme): number => theme.density.rowHeight;

/**
 * Where one key leaves an axis, in the runtime's space (0 at the start,
 * negative after).
 *
 * This is the prediction the probe asserts, not a second implementation: the
 * runtime does the movement and holds the offset, so a wrong prediction fails
 * on the value the window reports. `max` is the axis's clamped end.
 *
 * Only a key the region's axis answers reaches here: `ScrollAreaViewport` leaves
 * a `down`/`up` alone on a sideways region (`scrollTarget` answers `None`), so
 * the probe asserts that offset is unchanged instead of predicting a move.
 */
export const predictedOffset = (
  from: number,
  action: ScrollAction,
  line: number,
  page: number,
  max: number,
): number => {
  const move = MOVE[action];
  if (action === "home") return 0;
  if (action === "end") return max;
  const step = move.size === "page" ? page : line;
  return Math.max(max, Math.min(0, from + move.direction * step));
};

/** The readout line the probe paints from `onScrollChange`. */
export const offsetText = (offset: {
  readonly x: number;
  readonly y: number;
}): string => `x=${offset.x} y=${offset.y}`;
