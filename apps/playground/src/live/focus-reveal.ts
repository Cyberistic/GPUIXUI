/**
 * The `focus-reveal-lifecycle` fixture: does a control the keyboard reaches
 * inside a scroller get shown to the reader?
 *
 * A window moves focus without moving the glass. `keyboard-scroll-lifecycle`
 * measured that once a scroller has the focus a key moves it, and `tab-overflow`
 * measured that a selected tab stays clipped until the app scrolls it into view
 * — but no probe had asked the question a **form taller than its pane** asks on
 * every `Tab`: the traversal lands on a control the reader cannot see, and the
 * runtime is the only thing that could reveal it.
 *
 * Two panes of the same geometry settle it:
 *
 * 1. **The form** — every row is an ordinary tab stop. A native traversal walks
 *    into the pane and onto the row below the fold, and the offset is read
 *    before and after.
 * 2. **The roving list** — one stop for the whole list, arrows move the cursor,
 *    and each move reveals the row it landed on through the renderer's own
 *    `scrollIntoView`. That is the alternative the library's roving controls
 *    (`Select`, `List`, `Tabs`) already ship, measured rather than inferred.
 *
 * The marked row is what makes the gap a paint claim: it is painted in a colour
 * nothing else on the page uses, so "the reader cannot see it" is a pixel count
 * of zero rather than a box that happens to sit low.
 *
 * Native-free: the ids, the geometry, the prediction and the readout live here
 * so the view, the steps, the README and the unit test read one source.
 */
import * as Option from "effect/Option";

/** The `testId`s the view and the steps share. */
export const FOCUS_REVEAL_IDS = {
  probe: "focus-reveal-probe",
  before: "focus-reveal-before",
  form: "focus-reveal-form",
  roving: "focus-reveal-roving",
  readout: "focus-reveal-readout",
} as const;

/** The pane both scrollers paint: one geometry, measured twice. */
export const FOCUS_REVEAL_PANE = { width: 200, height: 120 } as const;

/** Nine 40px rows, so the content is three panes tall. */
export const FOCUS_REVEAL_ROWS = 9;
export const FOCUS_REVEAL_ROW = 40;
export const FOCUS_REVEAL_CONTENT = FOCUS_REVEAL_ROWS * FOCUS_REVEAL_ROW;

/** The runtime's clamped end: the offset a move past the content stops at. */
export const FOCUS_REVEAL_END = FOCUS_REVEAL_PANE.height - FOCUS_REVEAL_CONTENT;

/**
 * The first row a pane cannot show at its top: rows 0–2 fit exactly in 120px, so
 * row 3 is the first control a reader has to scroll for.
 */
export const FOCUS_REVEAL_BELOW = 3;

/** The last row, which the reveal has to clamp against the content's end. */
export const FOCUS_REVEAL_LAST = FOCUS_REVEAL_ROWS - 1;

/**
 * The fill the last row of each pane paints, so "visible" is countable.
 *
 * The page, the panes and the other rows paint no such colour, so a pixel of it
 * inside a pane's box is that row and nothing else.
 */
export const FOCUS_REVEAL_MARK = "#FF3B30";

/** The row id in either pane, so the view and the steps cannot disagree. */
export const formRowId = (index: number): string =>
  `focus-reveal-form-${index}`;
export const rovingRowId = (index: number): string =>
  `focus-reveal-roving-${index}`;

/** Where one row starts in the content, in logical pixels from its top. */
export const rowTop = (index: number): number => index * FOCUS_REVEAL_ROW;

/** Where one row ends in the content. */
export const rowBottom = (index: number): number =>
  rowTop(index) + FOCUS_REVEAL_ROW;

/** The narrowest and widest offset a scroller of this content can hold. */
const clampOffset = (offset: number): number =>
  Math.max(FOCUS_REVEAL_END, Math.min(0, offset));

/**
 * The offset that shows the whole of row `index` from `current`, or `None` when
 * it is already shown.
 *
 * A minimal reveal, which is what a reader expects from `scrollIntoView`: the row
 * is brought just inside the fold it crossed, not aligned to a convenient edge.
 * The runtime clamps the answer at the content's end, so the last row's reveal
 * lands on the end rather than on its own top.
 */
export const revealOffset = (
  index: number,
  current: number,
): Option.Option<number> => {
  const above = rowTop(index) + current;
  const below = rowBottom(index) + current - FOCUS_REVEAL_PANE.height;
  const shift = above < 0 ? above : below > 0 ? below : 0;
  return shift === 0
    ? Option.none()
    : Option.some(clampOffset(current - shift));
};

/** Whether a row's painted box sits wholly inside its pane's, with `slack` px. */
export const insidePane = (
  row: { readonly y: number; readonly height: number },
  pane: { readonly y: number; readonly height: number },
  slack = 1,
): boolean =>
  row.y >= pane.y - slack && row.y + row.height <= pane.y + pane.height + slack;

/** What the roving pane prints: the cursor and the keys it has answered. */
export const focusRevealReadout = (cursor: number, keys: number): string =>
  `cursor=${cursor} keys=${keys}`;

/**
 * How many checks the probe asserts, in the groups the steps read it in.
 *
 * Pinned by `focus-reveal.test.ts` to the same sum and to the count the README
 * prints, because the steps press keys and traverse in loops: the runtime's
 * total is what a reader compares with, and a planted assertion has to move it.
 * The report of the measured run is the source for the figure — 44.
 */
export const FOCUS_REVEAL_CHECKS =
  1 + // the control before the panes takes the focus
  2 + // the form pane's offset, and that it opens at its first row
  1 + // a native traversal reaches the control below the fold
  2 + // the pane's offset again, and that it did not move
  3 + // both boxes, and that the focused control starts below the pane
  2 + // a code focus on the first row leaves the pane at the top
  2 + // a code focus on the last row does not reveal it either
  6 + // the capture's scale, both panes' boxes and both marks at zero
  1 + // the roving list's cursor row takes the focus
  1 + // the roving list opens on its first row
  2 + // the roving list starts at the origin
  7 + // three arrows: the readout, the focus, the prediction, the offset, its
  // near-check, the row's box and the row's containment
  6 + // the last row: the readout, the focus, the offset, the end, box, inside
  3 + // one arrow past the end: the readout, the offset and the check on it
  5; // the second capture: its scale, both marks and both checks on them
