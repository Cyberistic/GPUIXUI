/**
 * The composite-row **hover** routing the `hover-routing-lifecycle` probe
 * measures.
 *
 * A Tier 3 table puts a status badge, a metric or a control inside a row it also
 * tints under the pointer, and a Tier 4 tree row nests the same shapes. The
 * `press-routing-lifecycle` probe measured that a **painted** child is the
 * boundary a press stops at; the hover half was never measured, and every row
 * in the library paints its feedback through the runtime's native
 * `style.hover` refinement, whose hovered set comes from the same hit test —
 * so a fill between the pointer and the row may take the row's feedback away
 * without taking its press.
 *
 * Each case mounts one row whose resting fill is the card role and whose
 * `hover` fill is the accent role, with one child shape at its centre. The
 * expectation table below is what the window measured on 0.11.0, so the probe,
 * the README table and a future component plan read the same rule.
 *
 * Kept native-free so the table is testable on a host with no binding, as
 * `press-routing.ts` is.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import * as Schema from "effect/Schema";

/** The child shapes a row can hold. */
export const HOVER_NESTINGS = [
  "text-unfilled",
  "text-filled",
  "div-filled",
  "inert-div",
] as const;
/** One child shape. */
export type HoverNesting = (typeof HOVER_NESTINGS)[number];

/** One case: the child nested in the row, and what the window measured. */
export interface HoverCase {
  readonly id: HoverNesting;
  /** What the case is, for the probe's check label and the README table. */
  readonly caption: string;
  /** Whether the row's `onMouseEnter` hears the pointer over the child. */
  readonly rowEnter: boolean;
  /** Whether the child's own `onMouseEnter` hears it. */
  readonly childEnter: boolean;
  /** Whether the row paints its `hover` fill while the pointer is on the child. */
  readonly painted: boolean;
}

/**
 * The rule each child shape follows, measured on `@gpuix/native@0.11.0` by
 * `--only hover-routing-lifecycle`.
 */
const byNesting: Record<HoverNesting, HoverCase> = {
  "text-unfilled": {
    id: "text-unfilled",
    caption: "the pointer on an unfilled `<text>` label",
    rowEnter: true,
    childEnter: true,
    painted: true,
  },
  "text-filled": {
    id: "text-filled",
    caption: "the pointer on a `<text>` label that paints a fill",
    rowEnter: false,
    childEnter: true,
    painted: false,
  },
  "div-filled": {
    id: "div-filled",
    caption: "the pointer on a `<div>` child that paints a fill",
    rowEnter: false,
    childEnter: true,
    painted: false,
  },
  "inert-div": {
    id: "inert-div",
    caption: "the pointer on a filled `<div>` that declares pointerEvents none",
    rowEnter: true,
    // Measured: opting out of the pointer removes the fill's hitbox — so the
    // row hears the hover and paints — but it does not drop the child's own
    // registered hover listener, which still runs.
    childEnter: true,
    painted: true,
  },
};

/** Every case, in the order the frame paints them. */
export const HOVER_CASES: ReadonlyArray<HoverCase> = Arr.map(
  HOVER_NESTINGS,
  (id) => byNesting[id],
);

/** One case by nesting; total, because the nesting is the case. */
export const hoverCase = (id: HoverNesting): HoverCase => byNesting[id];

/** The caption the probe's frame carries. */
export const HOVER_CAPTION = "hover-routing-caption";
/** The unfilled label a pointer moves to when it should leave a row. */
export const HOVER_AWAY = "hover-routing-away";
/** A case's row's test id. */
export const hoverRowId = (id: HoverNesting): string => `hover-row-${id}`;
/** A case's inner element's test id. */
export const hoverChildId = (id: HoverNesting): string => `hover-child-${id}`;
/** A case's readout's test id. */
export const hoverReadoutId = (id: HoverNesting): string =>
  `hover-readout-${id}`;

/** What one row has heard, read from its own readout line. */
export class HoverCounts extends Schema.Class<HoverCounts>("HoverCounts")({
  /** How many times the row's `onMouseEnter` ran. */
  row: Schema.Number,
  /** How many times the child's `onMouseEnter` ran. */
  child: Schema.Number,
  /** How many times the row's `onMouseLeave` ran. */
  leave: Schema.Number,
}) {}

/** The line a case's readout prints. */
export const formatHoverCounts = (counts: HoverCounts): string =>
  `row=${counts.row} child=${counts.child} leave=${counts.leave}`;

/** The counts a painted line names, decoded rather than compared. */
export const decodeHoverCounts = (text: string): Option.Option<HoverCounts> =>
  Option.flatMap(
    Option.all(
      Arr.map(text.trim().split(/\s+/), (token) => {
        const at = token.indexOf("=");
        return at <= 0
          ? Option.none<readonly [string, number]>()
          : Option.map(
              Schema.decodeUnknownOption(Schema.FiniteFromString)(
                token.slice(at + 1),
              ),
              (value) => [token.slice(0, at), value] as const,
            );
      }),
    ),
    (pairs) => Schema.decodeUnknownOption(HoverCounts)(R.fromEntries(pairs)),
  );

/** A logical box, as the runtime's layout report gives it. */
export interface HoverBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The region `box` covers in a frame captured at `scale`. */
export const pixelRegion = (
  box: HoverBox,
  scale: number,
): { x: number; y: number; width: number; height: number } => ({
  x: Math.round(box.x * scale),
  y: Math.round(box.y * scale),
  width: Math.round(box.width * scale),
  height: Math.round(box.height * scale),
});
