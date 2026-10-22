/**
 * The composite-row press and key routing the `press-routing-lifecycle` probe
 * measures.
 *
 * A Tier 3 table puts a control inside a row it also selects: a checkbox cell, a
 * sort arrow, an expander, a trailing menu. A Tier 4 dock puts a pressable row
 * inside a pressable group. Until this probe, nothing had measured which
 * handlers a press on the **inner** element runs: the capability record names a
 * pointer press and a drag but not the nesting rule, and the only mention in the
 * repo was a comment in `carousel.tsx` claiming the runtime runs the innermost
 * handler alone.
 *
 * The measured rule is about **painted surfaces**, not depth. GPUI dispatches a
 * mouse event to every hitbox at the point from the topmost down to the first
 * element that paints a background (a `BlockMouseExceptScroll` hitbox), and
 * nothing above it: `hit_test` records that boundary in `hover_hitbox_count` and
 * an element's listener only runs when its own hitbox is inside it. So a press
 * on an unpainted `<text>` label reaches the row that paints under it, while the
 * same press on a cell that fills itself runs nothing (the fill is the boundary)
 * — and a control that fills itself stops the walk at its own handler.
 *
 * The key half is different: a key is dispatched along the **focus path**, so a
 * row's `onKeyDown` hears a key typed in a field inside it. A component that
 * owns arrows must read the event's `elementId` before acting on it.
 *
 * `PRESS_CASES` is the expectation the probe holds the runtime to and
 * `formatHits` is the one spelling of a route, so a readout and an expectation
 * cannot drift. Kept native-free so the table is testable on a host with no
 * binding, as `dock-focus.ts` is.
 */
import * as Arr from "effect/Array";

/** The handler a case's press or key can run. */
export const PRESS_HANDLERS = [
  "row-click",
  "cell-click",
  "row-down",
  "row-key",
  "row-aux",
] as const;
/** One measured handler. */
export type PressHandler = (typeof PRESS_HANDLERS)[number];

/**
 * The nestings a case can measure.
 *
 * Each names the pair a component chooses: what kind of child sits at the point
 * and which handlers the row owns. `filled` and `unfilled` are separate cases
 * because the fill is the rule: it is the boundary a click stops at.
 */
export const NESTINGS = [
  "text-unfilled",
  "text-filled",
  "div-filled",
  "control-filled",
  "control-unfilled",
  "inert-control",
  "drag-row",
  "aux-row",
  "field-cell",
  "field-in-row",
] as const;
/** One nesting. */
export type Nesting = (typeof NESTINGS)[number];

/** One case: what is nested, and the route the window measures. */
export interface PressCase {
  readonly id: Nesting;
  /** What the case is, for the probe's check label and the README table. */
  readonly caption: string;
  /** The handlers a press on the case's inner element runs, in order. */
  readonly hits: ReadonlyArray<PressHandler>;
}

/**
 * The route each nesting takes, measured on `@gpuix/native@0.11.0` by
 * `--only press-routing-lifecycle`.
 */
const byNesting: Record<Nesting, PressCase> = {
  "text-unfilled": {
    id: "text-unfilled",
    caption: "a press on an unfilled `<text>` label",
    hits: ["row-click"],
  },
  "text-filled": {
    id: "text-filled",
    caption: "a press on a `<text>` label that paints a fill",
    hits: [],
  },
  "div-filled": {
    id: "div-filled",
    caption: "a press on a `<div>` child that paints a fill",
    hits: [],
  },
  "control-filled": {
    id: "control-filled",
    caption: "a press on a control child that paints a fill",
    hits: ["cell-click"],
  },
  "control-unfilled": {
    id: "control-unfilled",
    caption: "a press on a control child that paints no fill",
    hits: ["cell-click", "row-click"],
  },
  "inert-control": {
    id: "inert-control",
    caption: "a press on a filled control that declares pointerEvents none",
    hits: ["cell-click", "row-click"],
  },
  "drag-row": {
    id: "drag-row",
    caption: "a press on a filled control inside a row that owns mouseDown",
    hits: ["cell-click"],
  },
  "aux-row": {
    id: "aux-row",
    caption: "a right press on a filled child of a row with onAuxClick",
    hits: [],
  },
  "field-cell": {
    id: "field-cell",
    caption: "a key typed in a field inside a row with onKeyDown",
    hits: ["row-key"],
  },
  "field-in-row": {
    id: "field-in-row",
    caption: "a press on a field inside a row that also selects",
    hits: ["row-click"],
  },
};

/** Every case, in the order the frame paints them. */
export const PRESS_CASES: ReadonlyArray<PressCase> = Arr.map(
  NESTINGS,
  (id) => byNesting[id],
);

/** One case by nesting; total, because the nesting is the case. */
export const pressCase = (id: Nesting): PressCase => byNesting[id];

/** The field's value, read from React because a host paints no text of its own. */
export const PRESS_DRAFT = "press-routing-draft";
/** The readout's test id, one row under the cases. */
export const PRESS_READOUT = "press-routing-readout";
/** The control that empties the log between presses. */
export const PRESS_CLEAR = "press-routing-clear";
/** The caption the probe's frame carries. */
export const PRESS_CAPTION = "press-routing-caption";
/** A case's row's test id. */
export const pressRowId = (id: Nesting): string => `press-row-${id}`;
/** A case's inner element's test id. */
export const pressCellId = (id: Nesting): string => `press-cell-${id}`;

/**
 * The route a log prints.
 *
 * A handler name is what the readout carries, so a press that ran nothing is
 * `none` rather than an empty string a reader has to interpret.
 */
export const formatHits = (hits: ReadonlyArray<string>): string =>
  Arr.match(hits, {
    onEmpty: () => "hits=none",
    onNonEmpty: (ran) => `hits=${Arr.join(ran, ",")}`,
  });
