export interface TabBox {
  readonly id: string;
  readonly left: number;
  readonly width: number;
}

export const dropIndex = (
  boxes: ReadonlyArray<Pick<TabBox, "left" | "width">>,
  clientX: number,
  origin = 0,
): number => {
  const x = clientX - origin;
  return boxes.filter((box) => x > box.left + box.width / 2).length;
};

export const gapOf = (boxes: ReadonlyArray<TabBox>): number => {
  const first = boxes[0];
  const second = boxes[1];
  if (first === undefined || second === undefined) return 0;
  return Math.max(0, second.left - (first.left + first.width));
};

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
