/**
 * The pure width model behind `data-grid-columns` (plan `349`).
 *
 * A data grid's column widths are app state: a header cell is placed at the sum
 * of the widths before it, a row's width is the sum of all of them, and the
 * horizontal scroller's legal range is derived from that width. Keeping the
 * arithmetic here makes it testable without a renderer, and the view and the
 * scenario's expectations read the **same** functions so a check cannot drift
 * from what is painted.
 */
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import * as R from "effect/Record";

/** One column: its id, header label, default width and resize bounds. */
export interface ColumnSpec {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly min: number;
  readonly max: number;
}

/** The probe's four columns, in paint order. */
export const COLUMNS: ReadonlyArray<ColumnSpec> = [
  { id: "name", label: "name", width: 200, min: 96, max: 320 },
  { id: "status", label: "status", width: 120, min: 80, max: 240 },
  { id: "size", label: "size", width: 90, min: 64, max: 180 },
  { id: "notes", label: "notes", width: 150, min: 80, max: 300 },
];

/** Column widths by id. */
export type Widths = Readonly<Record<string, number>>;

const specOf = (id: string): Option.Option<ColumnSpec> =>
  Arr.findFirst(COLUMNS, (spec) => spec.id === id);

const widthsFrom = (specs: ReadonlyArray<ColumnSpec>): Widths =>
  R.fromEntries(Arr.map(specs, (spec) => [spec.id, spec.width] as const));

/** Every column at its default width. */
export const initialWidths: Widths = widthsFrom(COLUMNS);

/** The width for `id`; an unknown id has none. */
export const widthOf = (widths: Widths, id: string): number =>
  Option.getOrElse(
    Option.flatMap(specOf(id), (spec) => R.get(widths, spec.id)),
    () => 0,
  );

/** The sum of every column before `id`: the cell's left edge. */
export const offsetOf = (widths: Widths, id: string): number =>
  Option.isNone(specOf(id))
    ? 0
    : Arr.reduce(
        Arr.takeWhile(COLUMNS, (spec) => spec.id !== id),
        0,
        (total, spec) => total + widthOf(widths, spec.id),
      );

/** The row width: every column's width. */
export const contentWidth = (widths: Widths): number =>
  Arr.reduce(COLUMNS, 0, (total, spec) => total + widthOf(widths, spec.id));

/**
 * The smallest legal horizontal offset for `viewport`.
 *
 * Zero when the content fits, so a scroller never reports a positive offset; a
 * negative number is how far left the content may pan.
 */
export const maxPan = (widths: Widths, viewport: number): number =>
  Number.min(0, viewport - contentWidth(widths));

/** A column's inclusive resize bounds, or `None` for an unknown id. */
export const boundsOf = (
  id: string,
): Option.Option<{ readonly min: number; readonly max: number }> =>
  Option.map(specOf(id), (spec) => ({ min: spec.min, max: spec.max }));

/**
 * `next` clamped to the column's bounds.
 *
 * An unknown id, or a width that does not move, returns `widths` unchanged so a
 * no-op drag step cannot re-render the grid.
 */
export const setWidth = (widths: Widths, id: string, next: number): Widths =>
  Option.match(specOf(id), {
    onNone: () => widths,
    onSome: (spec) => {
      const clamped = Number.clamp({ minimum: spec.min, maximum: spec.max })(
        next,
      );
      return clamped === widthOf(widths, id)
        ? widths
        : R.set(widths, id, clamped);
    },
  });

/** Every column back to its default width. */
export const resetWidths = (): Widths => widthsFrom(COLUMNS);

/** `name=200 status=120 size=90 notes=150`, in column order. */
export const describeWidths = (widths: Widths): string =>
  Arr.join(
    Arr.map(COLUMNS, (spec) => `${spec.id}=${widthOf(widths, spec.id)}`),
    " ",
  );
