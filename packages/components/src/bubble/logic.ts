/**
 * Bubble's vocabulary, without React or GPUix.
 *
 * A bubble's variant, alignment and place in a group are stored data as often
 * as literals — a transcript restored from storage carries the role it was
 * written with — so each name is decoded here and an unknown one reads as the
 * documented default. The corner map is pure so the tail rule is testable
 * without a window: consecutive bubbles square the corner on the sender's side,
 * and the row still gap-tightens through {@link BUBBLE_GROUP}.
 */

import * as Schema from "effect/Schema";

/** The seven surfaces a bubble can wear. */
const BubbleVariants = Schema.Literals([
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "ghost",
  "destructive",
]);

/** The seven surfaces a bubble can wear. */
export type BubbleVariant = typeof BubbleVariants.Type;

/** The inline alignment of a bubble. */
const BubbleAlignments = Schema.Literals(["start", "end"]);

/** The inline alignment of a bubble. */
export type BubbleAlign = typeof BubbleAlignments.Type;

/** Where a bubble sits among consecutive bubbles from one sender. */
const BubbleGroups = Schema.Literals(["single", "first", "middle", "last"]);

/** Where a bubble sits among consecutive bubbles from one sender. */
export type BubbleGroupPosition = typeof BubbleGroups.Type;

/** The variant a stored name paints; `default` when it names none of ours. */
export const bubbleVariantOf = (value: unknown): BubbleVariant =>
  Schema.is(BubbleVariants)(value) ? value : "default";

/** The alignment a stored name paints; `start` when it names none of ours. */
export const bubbleAlignOf = (value: unknown): BubbleAlign =>
  Schema.is(BubbleAlignments)(value) ? value : "start";

/** The group position a stored name paints; `single` when it names none. */
export const bubbleGroupOf = (value: unknown): BubbleGroupPosition =>
  Schema.is(BubbleGroups)(value) ? value : "single";

/** The four corner radii of a bubble's surface, in CSS order. */
export interface BubbleCorners {
  readonly borderTopLeftRadius: number;
  readonly borderTopRightRadius: number;
  readonly borderBottomLeftRadius: number;
  readonly borderBottomRightRadius: number;
}

/**
 * The corners a bubble paints.
 *
 * `single` is the whole radius. In a group the joined edge squares to `join`,
 * so the run reads as one column: the first joins below, the middle joins both
 * sides, and the last joins above and keeps a short `tail` on the sender's
 * corner — the direction a reader follows without a drawn triangle.
 */
export const bubbleCorners = (
  align: BubbleAlign,
  group: BubbleGroupPosition,
  radius: number,
  join: number,
  tail: number,
): BubbleCorners => {
  const top = group === "middle" || group === "last" ? join : radius;
  const bottom = group === "first" || group === "middle" ? join : radius;
  const sender = group === "last" ? tail : bottom;
  return {
    borderTopLeftRadius: top,
    borderTopRightRadius: top,
    borderBottomLeftRadius: align === "end" ? bottom : sender,
    borderBottomRightRadius: align === "end" ? sender : bottom,
  };
};

/**
 * The top inset that hangs a reaction row over the surface's bottom edge.
 *
 * shadcn anchors the row absolutely and translates it three quarters of its own
 * height past the edge, so a quarter crosses the surface. The runtime has no
 * parent-relative positioning, so the row stays in the column and this inset
 * pulls it up by that quarter — plus the column's gap, which it also cancels.
 * The row's remaining height still lays out, so the next row cannot paint over
 * it.
 */
export const reactionInset = (rowHeight: number, gap: number): number =>
  -(rowHeight / 4 + gap);
