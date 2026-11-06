import * as Schema from "effect/Schema";

const BubbleVariants = Schema.Literals([
  "default",
  "secondary",
  "muted",
  "tinted",
  "outline",
  "ghost",
  "destructive",
]);

export type BubbleVariant = typeof BubbleVariants.Type;

const BubbleAlignments = Schema.Literals(["start", "end"]);

export type BubbleAlign = typeof BubbleAlignments.Type;

const BubbleGroups = Schema.Literals(["single", "first", "middle", "last"]);

export type BubbleGroupPosition = typeof BubbleGroups.Type;

export const bubbleVariantOf = (value: unknown): BubbleVariant =>
  Schema.is(BubbleVariants)(value) ? value : "default";

export const bubbleAlignOf = (value: unknown): BubbleAlign =>
  Schema.is(BubbleAlignments)(value) ? value : "start";

export const bubbleGroupOf = (value: unknown): BubbleGroupPosition =>
  Schema.is(BubbleGroups)(value) ? value : "single";

export interface BubbleCorners {
  readonly borderTopLeftRadius: number;
  readonly borderTopRightRadius: number;
  readonly borderBottomLeftRadius: number;
  readonly borderBottomRightRadius: number;
}

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

export const reactionInset = (rowHeight: number, gap: number): number =>
  -(rowHeight / 4 + gap);
