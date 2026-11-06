/**
 * The arithmetic of a reorderable tab strip.
 *
 * The component keeps the pointer and the paint in React; everything that can
 * be decided from ids and boxes lives here so a drag, a keyboard step and a
 * close all agree on what "between two tabs" means. No DOM reads and no React:
 * a test can drive the same rules a pointer does.
 */

/** A tab as the model sees it: an id and its painted box on the rail. */
export interface TabBox {
  readonly id: string;
  readonly left: number;
  readonly width: number;
}

/**
 * Where a pointer at `clientX` would insert into a strip whose boxes are
 * measured from `origin` (the rail's left edge).
 *
 * A tab splits at its centre, the rule a drop slot follows: releasing before the
 * middle of the second tab inserts before it, after the middle inserts after.
 * The boxes must already exclude the tab being dragged, or the dragged tab
 * counts itself as a target.
 *
 * `origin` is not decoration: a pointer event carries viewport coordinates
 * while `offsetLeft` is measured from the rail, and comparing the two made
 * every pointer past the rail's own x count as "after every tab" — the dragged
 * tab jumped to the end on the first move and no inner slot was reachable.
 */
export const dropIndex = (
  boxes: ReadonlyArray<Pick<TabBox, "left" | "width">>,
  clientX: number,
  origin = 0,
): number => {
  const x = clientX - origin;
  return boxes.filter((box) => x > box.left + box.width / 2).length;
};

/** The gap between two neighbouring boxes, or zero for a strip of one. */
export const gapOf = (boxes: ReadonlyArray<TabBox>): number => {
  const first = boxes[0];
  const second = boxes[1];
  if (first === undefined || second === undefined) return 0;
  return Math.max(0, second.left - (first.left + first.width));
};

/**
 * The order a drop at `index` produces.
 *
 * The index is the position in the strip **after** the dragged tab is lifted,
 * so moving the last tab to index 0 puts it first and moving a tab to its own
 * index changes nothing.
 */
export const orderWith = (
  boxes: ReadonlyArray<TabBox>,
  id: string,
  index: number,
): ReadonlyArray<TabBox> => {
  const dragged = boxes.find((box) => box.id === id);
  if (dragged === undefined) return boxes;
  const rest = boxes.filter((box) => box.id !== id);
  const at = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, at), dragged, ...rest.slice(at)];
};

/** The left edge every tab would paint at after a drop. */
export const positionsFor = (
  boxes: ReadonlyArray<TabBox>,
  id: string,
  index: number,
): Readonly<Record<string, number>> => {
  const gap = gapOf(boxes);
  const start = boxes[0]?.left ?? 0;
  return orderWith(boxes, id, index).reduce<{
    readonly x: number;
    readonly positions: Record<string, number>;
  }>(
    (state, box) => ({
      x: state.x + box.width + gap,
      positions: { ...state.positions, [box.id]: state.x },
    }),
    { x: start, positions: {} },
  ).positions;
};

/**
 * How far each tab must travel to show the gap a drop would leave: the dragged
 * tab's destination and every other tab's shift. A tab that stays put is zero,
 * so the caller can paint `translateX(0)` without a special case.
 */
export const shiftsFor = (
  boxes: ReadonlyArray<TabBox>,
  id: string,
  index: number,
): {
  readonly dragged: number;
  readonly others: Readonly<Record<string, number>>;
} => {
  const dragged = boxes.find((box) => box.id === id);
  if (dragged === undefined) return { dragged: 0, others: {} };
  const positions = positionsFor(boxes, id, index);
  const others: Record<string, number> = {};
  for (const box of boxes) {
    if (box.id === id) continue;
    others[box.id] = (positions[box.id] ?? box.left) - box.left;
  }
  return {
    dragged: (positions[id] ?? dragged.left) - dragged.left,
    others,
  };
};

/** The same tabs with one moved to `index` in the order (post-removal). */
export const moveTabTo = <T extends { readonly id: string }>(
  tabs: ReadonlyArray<T>,
  id: string,
  index: number,
): ReadonlyArray<T> => {
  const dragged = tabs.find((tab) => tab.id === id);
  if (dragged === undefined) return tabs;
  const rest = tabs.filter((tab) => tab.id !== id);
  const at = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, at), dragged, ...rest.slice(at)];
};

/** The tabs a close produces, and the one that should take the selection. */
export const closedTabs = <T extends { readonly id: string }>(
  tabs: ReadonlyArray<T>,
  id: string,
): {
  readonly tabs: ReadonlyArray<T>;
  readonly active: string | null;
} => {
  const at = tabs.findIndex((tab) => tab.id === id);
  if (at === -1) return { tabs, active: null };
  const rest = tabs.filter((tab) => tab.id !== id);
  const next = rest[at] ?? rest[at - 1];
  return { tabs: rest, active: next?.id ?? null };
};
