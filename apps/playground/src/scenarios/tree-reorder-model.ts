/**
 * The hierarchical reorder rules (plan `392`).
 *
 * A tree is a **pre-order flat list** with an explicit depth — the shape a
 * `<virtual-list>` renders and the shape `virtualized-tree` flattens into. A
 * drop names a row and an edge relative to it: `before` and `after` make the
 * source a sibling, `into` makes it the first child. Moving a directory moves
 * its whole subtree and shifts every moved node's depth, and a move that would
 * place a node inside itself is refused rather than producing a corrupt tree.
 *
 * The pre-order invariant is checked after every move: the first row is depth
 * 0 and no row is more than one level deeper than the row above it. Every
 * target the pointer and keyboard rules build from a valid row is structurally
 * legal, so this is a **boundary guard** for a hand-built target or a persisted
 * drag: an invalid result is refused as `illegal-depth` instead of rendered.
 */
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Option from "effect/Option";

/** One node in a pre-order flattening. */
export interface TreeItem {
  readonly id: string;
  readonly kind: "dir" | "file";
  readonly depth: number;
}

/** A row with the parent its depth implies, and its index in the full list. */
export interface TreeRow extends TreeItem {
  readonly index: number;
  readonly parent: Option.Option<string>;
}

/** Where a drop lands: a row and an edge relative to it. */
export interface DropTarget {
  readonly id: string;
  readonly edge: "before" | "after" | "into";
}

/** Why a move was refused. */
export type MoveRefusal =
  | "missing"
  | "self"
  | "descendant"
  | "not-a-directory"
  | "illegal-depth";

/** The result of a move: the new list, or the reason it did not happen. */
export type MoveResult =
  | { readonly _tag: "moved"; readonly items: ReadonlyArray<TreeItem> }
  | { readonly _tag: "refused"; readonly reason: MoveRefusal };

/** Whether a move produced a new list. */
export const isMoved = (
  result: MoveResult,
): result is {
  readonly _tag: "moved";
  readonly items: ReadonlyArray<TreeItem>;
} => result._tag === "moved";

const refused = (reason: MoveRefusal): MoveResult => ({
  _tag: "refused",
  reason,
});

const indexOf = (
  items: ReadonlyArray<TreeItem>,
  id: string,
): Option.Option<number> => Arr.findFirstIndex(items, (item) => item.id === id);

const rowOf = (
  rows: ReadonlyArray<TreeRow>,
  id: string,
): Option.Option<TreeRow> => Arr.findFirst(rows, (row) => row.id === id);

/** The nearest earlier row one level up, which is the parent in pre-order. */
const parentOf = (
  items: ReadonlyArray<TreeItem>,
  index: number,
  depth: number,
): Option.Option<string> =>
  depth === 0
    ? Option.none()
    : Option.map(
        Arr.findLast(
          Arr.take(items, index),
          (candidate) => candidate.depth === depth - 1,
        ),
        (candidate) => candidate.id,
      );

/** Every row, whether or not its ancestors are open. */
export const allRows = (
  items: ReadonlyArray<TreeItem>,
): ReadonlyArray<TreeRow> =>
  Arr.map(items, (item, index) => ({
    ...item,
    index,
    parent: parentOf(items, index, item.depth),
  }));

const ancestorsOpen = (
  rows: ReadonlyArray<TreeRow>,
  expanded: ReadonlyArray<string>,
  row: TreeRow,
): boolean =>
  Option.match(row.parent, {
    onNone: () => true,
    onSome: (parentId) =>
      Arr.contains(expanded, parentId) &&
      Option.match(rowOf(rows, parentId), {
        onNone: () => true,
        onSome: (parent) => ancestorsOpen(rows, expanded, parent),
      }),
  });

/** The rows that paint: every ancestor of a row is in `expanded`. */
export const visibleRows = (
  items: ReadonlyArray<TreeItem>,
  expanded: ReadonlyArray<string>,
): ReadonlyArray<TreeRow> => {
  const rows = allRows(items);
  return Arr.filter(rows, (row) => ancestorsOpen(rows, expanded, row));
};

/** `dir-0,dir-1,dir-1/a` — the order readout the steps assert. */
export const describeRows = (rows: ReadonlyArray<TreeRow>): string =>
  Arr.join(
    Arr.map(rows, (row) => row.id),
    ",",
  );

/** The index one past the last descendant of the row at `index`. */
export const subtreeEnd = (
  items: ReadonlyArray<TreeItem>,
  index: number,
): number =>
  Option.match(Arr.get(items, index), {
    onNone: () => index,
    onSome: (root) =>
      index +
      1 +
      Arr.length(
        Arr.takeWhile(
          Arr.drop(items, index + 1),
          (candidate) => candidate.depth > root.depth,
        ),
      ),
  });

/** How many visible rows sit below `index` inside its own subtree. */
export const visibleSubtreeSize = (
  rows: ReadonlyArray<TreeRow>,
  index: number,
): number =>
  Option.match(Arr.get(rows, index), {
    onNone: () => 0,
    onSome: (root) =>
      Arr.length(
        Arr.takeWhile(
          Arr.drop(rows, index + 1),
          (candidate) => candidate.depth > root.depth,
        ),
      ),
  });

/** The ids in the subtree rooted at `id`, root first. */
export const subtreeIds = (
  items: ReadonlyArray<TreeItem>,
  id: string,
): ReadonlyArray<string> =>
  Option.match(indexOf(items, id), {
    onNone: () => [],
    onSome: (index) =>
      Arr.map(
        Arr.take(Arr.drop(items, index), subtreeEnd(items, index) - index),
        (item) => item.id,
      ),
  });

/** The depth invariant a pre-order list must hold. */
const validPreOrder = (items: ReadonlyArray<TreeItem>): boolean =>
  Arr.every(Arr.range(0, Arr.length(items) - 1), (index) => {
    const depth = Option.getOrElse(
      Option.map(Arr.get(items, index), (item) => item.depth),
      () => 0,
    );
    const previous = Option.getOrElse(
      Option.map(Arr.get(items, index - 1), (item) => item.depth),
      () => -1,
    );
    return index === 0 ? depth === 0 : depth >= 0 && depth <= previous + 1;
  });

/**
 * Moves `id`'s whole subtree relative to `target`.
 *
 * `before` inserts at the target row, `after` after the target's subtree, and
 * `into` immediately after the target row (its first child). Every moved node's
 * depth shifts by the same delta, so the subtree keeps its shape.
 */
export const moveSubtree = (
  items: ReadonlyArray<TreeItem>,
  id: string,
  target: DropTarget,
): MoveResult =>
  Option.match(indexOf(items, id), {
    onNone: () => refused("missing"),
    onSome: (from) =>
      Option.match(indexOf(items, target.id), {
        onNone: () => refused("missing"),
        onSome: (at) => {
          const end = subtreeEnd(items, from);
          if (at >= from && at < end) {
            return refused(at === from ? "self" : "descendant");
          }
          return Option.match(Arr.get(items, at), {
            onNone: () => refused("missing"),
            onSome: (anchor) => {
              if (target.edge === "into" && anchor.kind !== "dir") {
                return refused("not-a-directory");
              }
              const insert =
                target.edge === "before"
                  ? at
                  : target.edge === "after"
                    ? subtreeEnd(items, at)
                    : at + 1;
              const slice = Arr.take(Arr.drop(items, from), end - from);
              const rest = Arr.appendAll(
                Arr.take(items, from),
                Arr.drop(items, end),
              );
              const adjusted =
                insert > from ? insert - Arr.length(slice) : insert;
              const newDepth =
                target.edge === "into" ? anchor.depth + 1 : anchor.depth;
              const root = Option.getOrElse(Arr.head(slice), () => anchor);
              const moved = Arr.map(slice, (item) => ({
                ...item,
                depth: item.depth + newDepth - root.depth,
              }));
              const result = Arr.appendAll(
                Arr.take(rest, adjusted),
                Arr.appendAll(moved, Arr.drop(rest, adjusted)),
              );
              return validPreOrder(result)
                ? { _tag: "moved" as const, items: result }
                : refused("illegal-depth");
            },
          });
        },
      }),
  });

/**
 * The pointer → target rule.
 *
 * A directory accepts `into` when the pointer is in the middle half of the row
 * **and** one indent step past its own label; every other position is `before`
 * in the upper half and `after` in the lower half. A file never accepts `into`.
 */
export const targetAt = (
  pointer: { readonly x: number; readonly y: number },
  frame: {
    readonly left: number;
    readonly top: number;
    readonly offset: number;
    readonly rowHeight: number;
    readonly indentStep: number;
  },
  rows: ReadonlyArray<TreeRow>,
): Option.Option<DropTarget> => {
  const count = Arr.length(rows);
  if (count === 0) return Option.none();
  const localY = pointer.y - frame.top + frame.offset;
  const index = Number.clamp(Math.floor(localY / frame.rowHeight), {
    minimum: 0,
    maximum: count - 1,
  });
  const fraction = (localY - index * frame.rowHeight) / frame.rowHeight;
  return Option.map(Arr.get(rows, index), (row) => {
    const indented =
      pointer.x - frame.left >= (row.depth + 1) * frame.indentStep;
    if (row.kind === "dir" && indented && fraction >= 0.25 && fraction < 0.75) {
      return { id: row.id, edge: "into" as const };
    }
    return {
      id: row.id,
      edge: fraction >= 0.5 ? ("after" as const) : ("before" as const),
    };
  });
};

/** Where the drop indicator paints, in rows and indent levels. */
export const indicatorAt = (
  rows: ReadonlyArray<TreeRow>,
  target: DropTarget,
): Option.Option<{ readonly boundary: number; readonly depth: number }> =>
  Option.flatMap(visibleIndexOf(rows, target.id), (index) =>
    Option.map(Arr.get(rows, index), (row) =>
      target.edge === "before"
        ? { boundary: index, depth: row.depth }
        : target.edge === "into"
          ? { boundary: index + 1, depth: row.depth + 1 }
          : {
              boundary: index + 1 + visibleSubtreeSize(rows, index),
              depth: row.depth,
            },
    ),
  );

/** The flattened visible index of `id`, or `None` when it does not paint. */
export const visibleIndexOf = (
  rows: ReadonlyArray<TreeRow>,
  id: string,
): Option.Option<number> => Arr.findFirstIndex(rows, (row) => row.id === id);
