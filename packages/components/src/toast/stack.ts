/**
 * The stack's geometry, without a renderer.
 *
 * GPUix has no `transform`, so a toast cannot be scaled and translated into a
 * fan. The stack is therefore **flow plus height**: the newest card is the last
 * child and paints over nothing, and each older card is a short clipped strip
 * above it. Expanding the stack gives every card its measured height and one
 * shared gap; collapsing it returns the older cards to their peeking strip.
 *
 * Heights are oldest-first, the order the store queues and the viewport paints.
 * Rank is measured from the end: rank 0 is the newest — the card nearest the
 * corner, fully readable and the only target while the stack is collapsed.
 */

/** How many cards a collapsed stack shows. `max` may keep more. */
export const STACK_VISIBLE = 3;

/** The height of one peeking strip, in pixels. */
export const STACK_PEEK = 12;

/** How far each further card insets from its right edge, in pixels. */
export const STACK_INSET = 8;

/** The width a peeking card loses on each side, per rank. */
export const STACK_DIM = 0.3;

/** The gap between full cards in an expanded stack, in pixels. */
export const STACK_GAP = 12;

/** What one card paints at: its box, its inset, its dimming and its reach. */
export interface ToastSlot {
  /** 0 is the newest card. */
  readonly rank: number;
  /** The painted height of the card's outer box. */
  readonly height: number;
  /** The distance the card is inset from the stack's right edge. */
  readonly inset: number;
  /** The surface's opacity: older cards are dimmer. */
  readonly opacity: number;
  /** Whether the card's controls answer a press or a Tab. */
  readonly interactive: boolean;
}

/** A measured height the geometry can read: finite and non-negative. */
const readHeight = (height: number): number =>
  Number.isFinite(height) && height > 0 ? height : 0;

/** One card's slot, from its rank and its measured height. */
const slotAt = (rank: number, height: number, expanded: boolean): ToastSlot => {
  if (expanded) {
    return { rank, height, inset: 0, opacity: 1, interactive: true };
  }
  if (rank === 0) {
    return { rank, height, inset: 0, opacity: 1, interactive: true };
  }
  if (rank >= STACK_VISIBLE) {
    return { rank, height: 0, inset: 0, opacity: 0, interactive: false };
  }
  return {
    rank,
    height: STACK_PEEK,
    inset: STACK_INSET * rank,
    opacity: 1 - STACK_DIM * rank,
    interactive: false,
  };
};

/**
 * One slot per card, oldest first.
 *
 * The heights are the cards' measured full heights; a card beyond the visible
 * three keeps its measured height so expanding the stack can show it. A
 * measurement that never arrived reads as no height rather than a `NaN` the
 * runtime drops.
 */
export const toastSlots = (
  heights: ReadonlyArray<number>,
  expanded: boolean,
): ReadonlyArray<ToastSlot> =>
  heights.map((value, index) => {
    const rank = heights.length - 1 - index;
    return slotAt(rank, readHeight(value), expanded);
  });

/** The gap painted before each card after the first. */
export const stackGap = (expanded: boolean): number =>
  expanded ? STACK_GAP : 0;
