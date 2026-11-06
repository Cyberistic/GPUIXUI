export const STACK_VISIBLE = 3;

export const STACK_PEEK = 12;

export const STACK_INSET = 8;

export const STACK_GAP = 12;

export interface ToastSlot {
  readonly rank: number;

  readonly height: number;

  readonly inset: number;

  readonly interactive: boolean;
}

const readHeight = (height: number): number =>
  Number.isFinite(height) && height > 0 ? height : 0;

export const toastSlotOf = (
  rank: number,
  height: number,
  expanded: boolean,
): ToastSlot => {
  if (expanded) {
    return { rank, height, inset: 0, interactive: true };
  }
  if (rank === 0) {
    return { rank, height, inset: 0, interactive: true };
  }
  if (rank >= STACK_VISIBLE) {
    return { rank, height: 0, inset: 0, interactive: false };
  }
  return {
    rank,
    height: STACK_PEEK,
    inset: STACK_INSET * rank,
    interactive: false,
  };
};

export const toastSlots = (
  heights: ReadonlyArray<number>,
  expanded: boolean,
): ReadonlyArray<ToastSlot> =>
  heights.map((value, index) =>
    toastSlotOf(heights.length - 1 - index, readHeight(value), expanded),
  );

export const stackGap = (expanded: boolean): number =>
  expanded ? STACK_GAP : 0;
