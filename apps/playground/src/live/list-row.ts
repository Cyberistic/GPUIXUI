/**
 * The `list-row-press` fixture: what a press on a selectable row's `trailing`
 * slot selects.
 *
 * `ListItem` documents `trailing` as "a badge, a shortcut", and `Badge` is
 * "non-interactive by design — a badge is never a button and nothing inside one
 * is clickable". The pressure here is the rule `press-routing-lifecycle`
 * measured: a child that **paints a fill** is the boundary GPUI's hit test
 * stops counting hovered elements at, so a filled badge in a row's slot can
 * take the press the row never hears — a dead zone over the row's own status
 * text.
 *
 * The fixture mounts the shipped `List` with the three shapes a reader composes
 * (the shipped badge, the same badge opting out of the pointer, a plain text
 * slot) and records the row a press selects. The expectation is the measured
 * route; `formatSelection` is its one spelling.
 *
 * Kept native-free so the table is testable on a host with no binding.
 */
import * as Arr from "effect/Array";

/** One row: the shape its trailing slot paints. */
export type TrailingShape = "badge" | "badge-inert" | "text";

/** The rows the frame mounts, each reporting its own name as the value. */
export const LIST_ROW_ROWS: ReadonlyArray<TrailingShape> = [
  "badge",
  "badge-inert",
  "text",
];

/** The presses the probe makes, in the order the frame names them. */
export const LIST_ROW_PRESS_IDS = [
  "badge",
  "badge-inert",
  "text",
  "badge-body",
] as const;
/** One press. */
export type ListRowPressId = (typeof LIST_ROW_PRESS_IDS)[number];

/** A press the probe makes: what it targets and the row it should select. */
export interface ListRowPress {
  readonly id: ListRowPressId;
  /** What the press lands on, for the probe's label and the README table. */
  readonly caption: string;
  /** The `testId` the press targets. */
  readonly target: string;
  /** The row value the press should leave selected, or `""` for none. */
  readonly selects: string;
}

/** The list's own `testId`. */
export const LIST_ROW_LIST = "list-row-press";
/** The readout's `testId`. */
export const LIST_ROW_READOUT = "list-row-readout";
/** The control that empties the selection between presses. */
export const LIST_ROW_CLEAR = "list-row-clear";
/** The caption the frame carries. */
export const LIST_ROW_CAPTION = "list-row-caption";
/** A row's `testId`. */
export const listRowId = (row: TrailingShape): string => `list-row-${row}`;
/** A row's trailing slot's `testId`. */
export const listRowTrailingId = (row: TrailingShape): string =>
  `list-row-trailing-${row}`;

/**
 * The presses, measured on `@gpuix/native@0.11.0` by `--only list-row-press`.
 *
 * A press on the shipped badge selects nothing because the badge paints a fill
 * and the row's press never runs; the same badge declaring `pointerEvents:
 * "none"` lets the press reach the row, which is the workaround a caller has
 * today. The row's own body and a plain text slot select as the component
 * documents.
 */
const byId: Record<ListRowPressId, ListRowPress> = {
  badge: {
    id: "badge",
    caption: "a press on the shipped badge in the trailing slot",
    target: listRowTrailingId("badge"),
    selects: "",
  },
  "badge-inert": {
    id: "badge-inert",
    caption: "a press on the same badge declaring `pointerEvents: none`",
    target: listRowTrailingId("badge-inert"),
    selects: "badge-inert",
  },
  text: {
    id: "text",
    caption: "a press on a plain text slot",
    target: listRowTrailingId("text"),
    selects: "text",
  },
  "badge-body": {
    id: "badge-body",
    caption: "a press on the badge row's own body",
    target: listRowId("badge"),
    selects: "badge",
  },
};

/** Every press, in the order the frame names them. */
export const LIST_ROW_PRESSES: ReadonlyArray<ListRowPress> = Arr.map(
  LIST_ROW_PRESS_IDS,
  (id) => byId[id],
);

/** One press by id; total, because the id is the press. */
export const listRowPress = (id: ListRowPressId): ListRowPress => byId[id];

/** The selection a readout prints; `none` is an empty value. */
export const formatSelection = (selected: string): string =>
  selected === "" ? "selected=none" : `selected=${selected}`;
