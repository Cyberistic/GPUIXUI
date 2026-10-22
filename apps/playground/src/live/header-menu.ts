/**
 * The table header `header-menu-lifecycle` anchors a menu in, and its widths.
 *
 * Tier 3's **column configuration** row is `?`, and the half no probe had
 * measured is the one that decides whether it is buildable: a menu whose
 * trigger sits **inside a horizontally scrolled header**. The header's offset is
 * a paint-level value, so an overlay placed from the anchor's box can be stale
 * the moment the reader wheels the header. The fixture's widths make each
 * position arithmetic the probe asserts, rather than a number read back from the
 * same paint.
 *
 * Kept native-free so the widths are testable on a host with no binding.
 */
import * as Arr from "effect/Array";
import * as Option from "effect/Option";

/** The header's trigger cell, which opens the column menu. */
export const HEADER_TRIGGER_WIDTH = 100;
/** The frame the header scrolls inside. */
export const HEADER_FRAME_WIDTH = 420;

/** One configurable column, in header order. */
export interface HeaderColumn {
  readonly id: "name" | "size" | "status";
  readonly label: string;
  readonly width: number;
}

/** The columns the header paints, in order. */
export const HEADER_COLUMNS: ReadonlyArray<HeaderColumn> = [
  { id: "name", label: "name", width: 200 },
  { id: "size", label: "size", width: 120 },
  { id: "status", label: "status", width: 120 },
];

/** The trigger cell sits between this column and the next one. */
export const HEADER_TRIGGER_AFTER: HeaderColumn["id"] = "name";

/** A column's `testId`. */
export const headerCellId = (id: HeaderColumn["id"]): string =>
  `header-cell-${id}`;

/** The menu's trigger, the anchor the overlay is placed from. */
export const HEADER_TRIGGER = "header-menu-trigger";
/** The trigger's own cell; its x is the fixture's arithmetic, the trigger's is not. */
export const HEADER_TRIGGER_CELL = "header-cell-trigger";
/** The frame the header scrolls inside. */
export const HEADER_FRAME = "header-frame";
/** The first item the menu paints; it hides the last column. */
export const HEADER_FIRST_ITEM = "header-menu-item-status";

/** Header order, so a readout spells the columns the way the header paints. */
const byHeader: (
  left: HeaderColumn["id"],
  right: HeaderColumn["id"],
) => -1 | 0 | 1 = (left, right) => {
  const indexOf = (id: HeaderColumn["id"]): number =>
    Option.getOrElse(
      Arr.findFirstIndex(HEADER_COLUMNS, (column) => column.id === id),
      () => 0,
    );
  const difference = indexOf(left) - indexOf(right);
  return difference === 0 ? 0 : difference < 0 ? -1 : 1;
};

/** The columns the trigger follows, which move it when they are hidden. */
const beforeTrigger = (): ReadonlyArray<HeaderColumn> => {
  const index = Option.getOrElse(
    Arr.findFirstIndex(
      HEADER_COLUMNS,
      (column) => column.id === HEADER_TRIGGER_AFTER,
    ),
    () => -1,
  );
  return Arr.take(HEADER_COLUMNS, index + 1);
};

/** The header's painted width with `hidden` columns removed. */
export const headerContentWidth = (
  hidden: ReadonlyArray<HeaderColumn["id"]>,
): number =>
  HEADER_TRIGGER_WIDTH +
  Arr.reduce(
    Arr.filter(HEADER_COLUMNS, (column) => !Arr.contains(hidden, column.id)),
    0,
    (sum, column) => sum + column.width,
  );

/** The horizontal travel the frame has at that width. */
export const headerTravel = (
  hidden: ReadonlyArray<HeaderColumn["id"]>,
): number => Math.max(0, headerContentWidth(hidden) - HEADER_FRAME_WIDTH);

/** The trigger cell's x when the frame is scrolled to `offset` (negative). */
export const headerTriggerCellX = (
  hidden: ReadonlyArray<HeaderColumn["id"]>,
  offset: number,
): number =>
  offset +
  Arr.reduce(
    Arr.filter(beforeTrigger(), (column) => !Arr.contains(hidden, column.id)),
    0,
    (sum, column) => sum + column.width,
  );

/** The hidden columns after a menu item toggles `id`, in header order. */
export const toggleHidden = (
  hidden: ReadonlyArray<HeaderColumn["id"]>,
  id: HeaderColumn["id"],
): ReadonlyArray<HeaderColumn["id"]> =>
  Arr.contains(hidden, id)
    ? Arr.filter(hidden, (value) => value !== id)
    : Arr.sort(Arr.append(hidden, id), byHeader);
