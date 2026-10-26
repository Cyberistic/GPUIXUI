/**
 * The stack's geometry, without a renderer.
 *
 * GPUix has no `transform`, so a toast cannot be scaled and translated into a
 * fan. The stack is therefore **flow plus height**: the newest card is the last
 * child and paints over nothing, and each older card is a clipped top slice
 * above it. Expanding the stack gives every card its measured height and one
 * shared gap; collapsing it returns the older cards to their peeking slice.
 *
 * Heights are oldest-first, the order the store queues and the viewport paints.
 * Rank is measured from the end: rank 0 is the newest — the card nearest the
 * corner, fully readable and the only target while the stack is collapsed.
 *
 * A peeking card is the **top of the card**, not a small card: the slot clips a
 * full-height surface, so its bottom edge is the cut, not a rounded end. That is
 * the reading Base UI's stack has, and it keeps one surface role (border, radius
 * and elevation) for every state of the card.
 */

/** How many cards a collapsed stack shows. `max` may keep more. */
export const STACK_VISIBLE = 3;

/** The height of one peeking slice, in pixels. */
export const STACK_PEEK = 12;

/** How far each further card insets from each side, in pixels. */
export const STACK_INSET = 8;

/** The gap between full cards in an expanded stack, in pixels. */
export const STACK_GAP = 12;

/** What one card paints at: its box, its inset and its reach. */
export interface ToastSlot {
  /** 0 is the newest card. */
  readonly rank: number;
  /** The painted height of the card's slot. */
  readonly height: number;
  /** The distance the card is inset from each side of the stack. */
  readonly inset: number;
  /** Whether the card's controls answer a press or a Tab. */
  readonly interactive: boolean;
}

/** A measured height the geometry can read: finite and non-negative. */
const readHeight = (height: number): number =>
  Number.isFinite(height) && height > 0 ? height : 0;

/**
 * One card's slot, from its rank and its measured height.
 *
 * A card past the visible three keeps its measured height in the slot's place:
 * the viewport paints it at no height, and expanding the stack is what gives it
 * a box. It is never interactive, because a reader cannot see it to press it.
 */
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

/**
 * One slot per card, oldest first.
 *
 * The heights are the cards' measured full heights, so a card beyond the visible
 * three keeps its own measurement. A measurement that never arrived reads as no
 * height rather than a `NaN` the runtime drops.
 */
export const toastSlots = (
  heights: ReadonlyArray<number>,
  expanded: boolean,
): ReadonlyArray<ToastSlot> =>
  heights.map((value, index) =>
    toastSlotOf(heights.length - 1 - index, readHeight(value), expanded),
  );

/** The gap painted before each card after the first. */
export const stackGap = (expanded: boolean): number =>
  expanded ? STACK_GAP : 0;
