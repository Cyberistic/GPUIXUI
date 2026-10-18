/**
 * The pure order/visibility model behind `column-config` (plan `384`).
 *
 * A data grid's column settings are app state: which ids paint, in what order,
 * and — from plan `349` — how wide each one is. Widths stay in
 * `column-resize-model.ts`; this module owns the two axes a settings surface
 * adds and derives the geometry a header and a virtual row place from them.
 *
 * Keeping the arithmetic here makes it testable without a renderer, and the
 * view and the scenario's expectations read the **same** functions, so a check
 * cannot drift from what is painted.
 */
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import { COLUMNS, widthOf } from "./column-resize-model.js";
import type { Widths } from "./column-resize-model.js";

/** Paint order plus the hidden ids; widths live in `Widths`. */
export interface ColumnConfig {
  readonly order: ReadonlyArray<string>;
  readonly hidden: ReadonlyArray<string>;
}

const ids: ReadonlyArray<string> = Arr.map(COLUMNS, (spec) => spec.id);

/** The probe's default: every column in declaration order. */
export const initialConfig: ColumnConfig = { order: ids, hidden: [] };

/** The ids in paint order, hidden ones included. */
export const orderOf = (config: ColumnConfig): ReadonlyArray<string> =>
  config.order;

/**
 * `true` when `id` is a known column that is shown.
 *
 * A hidden column keeps its order slot and its width; only the paint and the
 * derived offsets skip it, so showing it again restores both.
 */
export const isVisible = (config: ColumnConfig, id: string): boolean =>
  Arr.contains(config.order, id) && !Arr.contains(config.hidden, id);

/** The ids that paint, in order. */
export const visibleIds = (config: ColumnConfig): ReadonlyArray<string> =>
  Arr.filter(config.order, (id) => !Arr.contains(config.hidden, id));

/**
 * Hides or shows `id`.
 *
 * Hiding the last visible column returns `config`: a grid with no columns has
 * no row to show. An unknown id and a no-op likewise return the same object, so
 * a click that changes nothing cannot re-render the grid.
 */
export const toggle = (config: ColumnConfig, id: string): ColumnConfig =>
  !Arr.contains(config.order, id)
    ? config
    : Arr.contains(config.hidden, id)
      ? {
          ...config,
          hidden: Arr.filter(config.hidden, (entry) => entry !== id),
        }
      : Arr.length(visibleIds(config)) > 1
        ? { ...config, hidden: Arr.append(config.hidden, id) }
        : config;

/**
 * Moves `id` by `delta` positions in the full order (`-1` up, `+1` down).
 *
 * The full order, not the visible one: a settings list names every column, so a
 * hidden neighbour still owns its slot. An unknown id, `delta === 0` and an end
 * clamp return the same object.
 */
export const moveBy = (
  config: ColumnConfig,
  id: string,
  delta: number,
): ColumnConfig =>
  Option.match(
    Arr.findFirstIndex(config.order, (entry) => entry === id),
    {
      onNone: () => config,
      onSome: (index) => {
        const next = Number.clamp({
          minimum: 0,
          maximum: Arr.length(config.order) - 1,
        })(index + delta);
        return next === index
          ? config
          : Option.match(Arr.get(config.order, next), {
              onNone: () => config,
              onSome: (moved) => ({
                ...config,
                order: Arr.map(config.order, (entry, at) =>
                  at === next ? id : at === index ? moved : entry,
                ),
              }),
            });
      },
    },
  );

/** The default order with nothing hidden. */
export const resetConfig = (): ColumnConfig => ({
  order: Arr.copy(ids),
  hidden: [],
});

/** The sum of the visible widths before `id`: its left edge in the row. */
export const offsetIn = (
  config: ColumnConfig,
  widths: Widths,
  id: string,
): number =>
  isVisible(config, id)
    ? Arr.reduce(
        Arr.takeWhile(config.order, (entry) => entry !== id),
        0,
        (total, entry) =>
          isVisible(config, entry) ? total + widthOf(widths, entry) : total,
      )
    : 0;

/** The row width: the sum of the visible columns' widths. */
export const contentWidthOf = (config: ColumnConfig, widths: Widths): number =>
  Arr.reduce(visibleIds(config), 0, (total, id) => total + widthOf(widths, id));

/** The smallest legal horizontal offset for `viewport`, never positive. */
export const maxPanOf = (
  config: ColumnConfig,
  widths: Widths,
  viewport: number,
): number => Number.min(0, viewport - contentWidthOf(config, widths));

/** `order=name,status,size,notes hidden=none visible=4` */
export const describeConfig = (config: ColumnConfig): string => {
  const hidden = Arr.match(config.hidden, {
    onEmpty: () => "none",
    onNonEmpty: (values) => Arr.join(values, ","),
  });
  return `order=${Arr.join(config.order, ",")} hidden=${hidden} visible=${Arr.length(visibleIds(config))}`;
};
