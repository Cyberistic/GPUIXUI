/**
 * The `pinned-list-lifecycle` fixture: a window's glass over the shipped
 * `PinnedList`.
 *
 * The component's whole mechanism is arithmetic over a measured offset —
 * `pinned-list/logic.ts` holds the section bands and every header frame — and
 * the offscreen suite reads those frames back off the element tree. What no
 * renderer answers is the question Tier 3's *sticky header* row actually asks:
 * does the header **paint** over the rows it is held above, and does a press on
 * the row beneath it still reach the row? Both are hit-testing and paint
 * questions, not layout ones, so only a window can answer them.
 *
 * The fixture is the smallest composition that asks both: two sections of one
 * 200-point row each under a 32-point header, in a 160-point viewport. The first
 * row is tall on purpose — at the probe's wheel its own **centre** lies under
 * the held header, so a header layer that took the press would swallow it.
 *
 * A second, fixture-owned pair sits beside it: a row with a filled cover
 * painted over it. The cover takes the press aimed at the row under it, which is
 * the control that proves the host's `click` is hit-tested at a point rather
 * than delivered to the element by id — without it the header's pass-through
 * check could pass on a host that never hit-tests at all.
 *
 * Native-free: the ids, the geometry, the wheel and the readout live here, so
 * the view, the steps, the README and the unit test read one source.
 */

/** The `testId`s the view and the steps share. */
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

/** The reserved row each section title paints in. */
export const PINNED_HEADER = 32;

/** One section's row: taller than the whole viewport, so its centre can be held. */
export const PINNED_ROW_HEIGHT = 200;

/** A section is its title's row plus its own row. */
export const PINNED_SECTION_HEIGHT = PINNED_HEADER + PINNED_ROW_HEIGHT;

/** The reader: narrower than two sections, so the list has travel. */
export const PINNED_VIEWPORT = { width: 300, height: 160 } as const;

/** Both sections, in content space. */
export const PINNED_CONTENT = 2 * PINNED_SECTION_HEIGHT;

/** Where the runtime clamps a scroll past the end. */
export const PINNED_MAX = PINNED_VIEWPORT.height - PINNED_CONTENT;

/** One wheel's delta: negative scrolls down, the runtime's sign. */
export const PINNED_WHEEL = -120;

/** A wheel past the first section's end: the runtime clamps it itself. */
export const PINNED_END_WHEEL = -1000;

/** A wheel back to the start. */
export const PINNED_RETURN_WHEEL = 1000;

/**
 * The fill the rows paint, and the surface the caller hands the list.
 *
 * Both are read as pixels. The rows are a literal so the page role cannot be
 * mistaken for a row, and the list's surface is the palette's `card` role, so a
 * held header that painted the page instead would be visible as the wrong role.
 */
export const PINNED_ROW_FILL = "#FF3B30";

/**
 * The first section's row begins after its title's reserved row.
 *
 * The centre is the point the host's `click` presses, so the probe reads it
 * before the press: a centre outside the held header would make the
 * pass-through check measure nothing.
 */
export const ROW_TODAY_TOP = PINNED_HEADER;

/** The centre of a row that starts at `top` in content space, at `offset`. */
export const rowCentre = (top: number, height: number, offset: number): number =>
  top + height / 2 + offset;

/** The readout the probe paints after every wheel and press. */
export const pinnedReadout = (state: {
  readonly offsetY: number;
  readonly today: number;
  readonly yesterday: number;
  readonly covered: number;
  readonly cover: number;
}): string =>
  `y=${state.offsetY} presses=${state.today},${state.yesterday} control=${state.covered},${state.cover}`;
