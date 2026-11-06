import { Match } from "effect";
import {
  POPOVER_COLLISION_PADDING,
  POPOVER_FRAME_WIDTH,
  POPOVER_PANEL_WIDTH,
  POPOVER_TRIGGER_WIDTH,
  pullBack,
} from "./popover-preview";

export const POPOVER_ALIGNMENTS = ["start", "center", "end"] as const;

export type PopoverAlign = (typeof POPOVER_ALIGNMENTS)[number];

export const alignLabel = (align: PopoverAlign): string =>
  Match.value(align).pipe(
    Match.when("start", () => "Left"),
    Match.when("center", () => "Centre"),
    Match.when("end", () => "Right"),
    Match.exhaustive,
  );

const alignOffset = (
  align: PopoverAlign,
  triggerWidth: number,
  panelWidth: number,
): number =>
  Match.value(align).pipe(
    Match.when("start", () => 0),
    Match.when("center", () => (triggerWidth - panelWidth) / 2),
    Match.when("end", () => triggerWidth - panelWidth),
    Match.exhaustive,
  );

export interface AlignmentAnchor {
  readonly align: PopoverAlign;
  readonly triggerX: number;
  readonly triggerWidth: number;
  readonly panelWidth: number;
}

export interface AlignmentInput extends AlignmentAnchor {
  readonly stageWidth: number;
  readonly margin?: number;
}

export const alignedLeft = ({
  align,
  triggerX,
  triggerWidth,
  panelWidth,
}: AlignmentAnchor): number =>
  triggerX + alignOffset(align, triggerWidth, panelWidth);

export const alignedPlacement = (input: AlignmentInput) => {
  const requested = alignedLeft(input);
  const left = pullBack(
    requested,
    input.panelWidth,
    input.stageWidth,
    input.margin ?? POPOVER_COLLISION_PADDING,
  );

  return { requested, left, shifted: requested - left };
};

export const alignmentLayout = (align: PopoverAlign) => {
  const triggerX = (POPOVER_FRAME_WIDTH - POPOVER_TRIGGER_WIDTH) / 2;
  const placement = alignedPlacement({
    align,
    triggerX,
    triggerWidth: POPOVER_TRIGGER_WIDTH,
    panelWidth: POPOVER_PANEL_WIDTH,
    stageWidth: POPOVER_FRAME_WIDTH,
  });

  return { ...placement, triggerX, offset: placement.left - triggerX };
};
