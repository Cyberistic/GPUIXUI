/**
 * What a collapsing sidebar's **outer clipping box** really does, and the
 * arithmetic the `sidebar-clip-lifecycle` probe reads a window with.
 *
 * Tier 4's *Collapsible sidebars* row names the mechanism — `motion` width, an
 * outer clipping container, not an inner reflow — and every measurement behind
 * it is a **layout** read: `motion-geometry` sampled the animated box's height
 * and `docking-nested` collapsed a caller-owned width to 0. Neither says what
 * the glass shows, and that is the question a sidebar lives or dies on: a
 * clipped child still **reports** its full box (`dock-focus-lifecycle` measured
 * a control keeping its 12px box inside a zero-width parent), so a layout read
 * cannot tell a hidden panel from one painting over the document beside it. If
 * the content is not clipped in the paint, a 120-point sidebar paints its
 * 240-point content across the pane it is collapsing next to.
 *
 * The fixture is the smallest composition that asks it: a fixed 240-point
 * content (a 200-point spacer then a 40-point **marker**) inside a width-tweened
 * box with `overflow: hidden`, beside a document pane that takes the rest of the
 * row. The marker is the whole test: while the clip is narrower than 200 the
 * marker can paint **only** if the clip leaks, because every point of it lies
 * over the document.
 *
 * Three channels, because one is not enough:
 *
 * - **layout**: the pane's left edge minus the row's is the clip's width, and
 *   the content's own reported width says whether the inner box reflowed;
 * - **paint**: the marker's colour inside the band the clip hides, and the
 *   content's fill just inside the clip's edge;
 * - **input**: a press aimed at the marker's centre, and which of the two
 *   `onClick`s it runs.
 *
 * Native-free: the ids, the geometry, the derived band, the readout and the
 * check count live here so the view, the steps, the README and the unit test
 * read one source.
 */
/** The `testId`s the view and the steps share. */
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

/** The two widths the outer box tweens between. */
export const SIDEBAR_WIDTHS = { open: 240, closed: 0 } as const;

/** The row both panes are laid out in. */
export const SIDEBAR_ROW_HEIGHT = 160;

/**
 * The content's own fixed width, and the marker's place in it.
 *
 * The marker sits at the trailing end: its centre is 220 points from the row's
 * left edge, so any clip narrower than that has its centre over the document.
 */
export const SIDEBAR_CONTENT_WIDTH = 240;
export const SIDEBAR_MARKER_X = 200;
export const SIDEBAR_MARKER_WIDTH = 40;

/**
 * The three fills, each a colour rather than an id.
 *
 * The content and the document are different roles of one palette; the marker
 * is a literal so a stray antialiased edge cannot be mistaken for a role.
 */
export const SIDEBAR_FILLS = {
  content: "#AF52DE",
  marker: "#FF3B30",
  main: "#0A84FF",
} as const;

/**
 * The tween the collapse runs under: the library's `slow` level, in the
 * runtime's unit (seconds).
 *
 * The probe still **finds** a travelling frame by stepping the motion clock
 * rather than naming an offset: `motion-geometry` recorded a declared duration
 * that did not match the wall time its samples saw, so a probe that assumed
 * "half the duration" would be reading a frame the runtime never promised.
 */
export const SIDEBAR_TWEEN = { duration: 0.32, ease: "easeInOut" } as const;

/** How far the clock is stepped while looking for a travelling frame, in ms. */
export const SIDEBAR_STEP_MS = 10;

/** The most steps the search spends: ten times the slowest shipped level. */
export const SIDEBAR_STEPS = 60;

/**
 * How close to an end a width may be and still count as travelling.
 *
 * A frame within 24 points of either end is the ease's tail, not the middle: a
 * probe that accepted it could pass without ever seeing the clip hide anything.
 */
export const SIDEBAR_TRAVEL_MARGIN = 24;

/**
 * The widest travelling frame the probe samples the paint at.
 *
 * Below the marker's own start, so the frame it captures is one where the clip
 * hides the **whole** band: the hidden-band crop is then the full 40×160 band
 * and the content's own fill is what the visible strip shows.
 */
export const SIDEBAR_MID_MAX = SIDEBAR_MARKER_X - SIDEBAR_TRAVEL_MARGIN;

/** Whether a clip width is a frame between the two ends. */
export const isTravelling = (width: number): boolean =>
  width > SIDEBAR_WIDTHS.closed + SIDEBAR_TRAVEL_MARGIN &&
  width < SIDEBAR_WIDTHS.open - SIDEBAR_TRAVEL_MARGIN;

/** A painted box, as the runtime's layout report gives it. */
export interface SidebarBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The part of the marker's band the clip **hides**.
 *
 * From the clip's right edge to the band's end: the region where a clipped
 * child's paint would land on the document if the runtime did not clip. It is
 * empty at the open width, because the clip then covers the whole band — which
 * is what makes the open capture the positive control for the same crop.
 */
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

/** The marker's whole band: the positive control beside {@link hiddenMarkerBand}. */
export const markerBand = (row: SidebarBox): SidebarBox => ({
  x: row.x + SIDEBAR_MARKER_X,
  y: row.y,
  width: SIDEBAR_MARKER_WIDTH,
  height: SIDEBAR_ROW_HEIGHT,
});

/** The point just inside the clip's edge, where the content's fill is owed. */
export const insideClipPoint = (
  clipRight: number,
  margin: number,
  rowY: number,
): { readonly x: number; readonly y: number } => ({
  x: clipRight - margin,
  y: rowY + SIDEBAR_ROW_HEIGHT / 2,
});

/** The point just outside it, where the document's fill is owed. */
export const outsideClipPoint = (
  clipRight: number,
  margin: number,
  rowY: number,
): { readonly x: number; readonly y: number } => ({
  x: clipRight + margin,
  y: rowY + SIDEBAR_ROW_HEIGHT / 2,
});

/** What the probe's own state reads: the mode and the two press counters. */
export interface SidebarReadout {
  readonly open: boolean;
  readonly markerPresses: number;
  readonly mainPresses: number;
}

/** The readout's one spelling, so the probe and its record print the same line. */
export const sidebarReadout = (state: SidebarReadout): string =>
  `open=${state.open} marker=${state.markerPresses} main=${state.mainPresses}`;

/** The state before any press. */
export const SIDEBAR_REST: SidebarReadout = {
  open: true,
  markerPresses: 0,
  mainPresses: 0,
} as const;

/**
 * The checks the probe asserts, as the run reports them.
 *
 * The count is the **executed** number, so it is larger than the source's
 * assertion sites: five closure reads (`box`, `expectState`, `captureFrame`,
 * `sample`, `markerPaint`) assert once per call, and the probe makes 22 direct
 * assertions plus six boxes, six states, four captures, six samples and three
 * marker crops. The steps' own `ctx.expect*` sites are the floor the suite
 * holds this to.
 */
export const SIDEBAR_CHECKS = 47;
