/**
 * Where the Popover's panel sits for each alignment, in the drawing's stage.
 *
 * The component's rule is the floating layer's, read through `placement.ts`:
 * `start` shares the trigger's left edge, `center` its centre line and `end` its
 * right edge. A panel that would leave the stage is shifted back by the same
 * collision margin the collision drawing uses, and the shift is along the
 * alignment — the panel keeps the edge it was asked for, it does not become
 * another alignment.
 */

import { Match } from "effect";
import {
  POPOVER_COLLISION_PADDING,
  POPOVER_FRAME_WIDTH,
  POPOVER_PANEL_WIDTH,
  POPOVER_TRIGGER_WIDTH,
  pullBack,
} from "./popover-preview";

/** The three alignments the component's `align` names. */
export const POPOVER_ALIGNMENTS = ["start", "center", "end"] as const;

/** An alignment the drawing can show. */
export type PopoverAlign = (typeof POPOVER_ALIGNMENTS)[number];

/** The control's label for an alignment. */
export const alignLabel = (align: PopoverAlign): string =>
  Match.value(align).pipe(
    Match.when("start", () => "Left"),
    Match.when("center", () => "Centre"),
    Match.when("end", () => "Right"),
    Match.exhaustive,
  );

/** The alignment's offset from the trigger's own left edge. */
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

/** The trigger and panel an alignment places, in stage coordinates. */
export interface AlignmentAnchor {
  readonly align: PopoverAlign;
  readonly triggerX: number;
  readonly triggerWidth: number;
  readonly panelWidth: number;
}

/** What the collision rule adds to an alignment: the stage it must stay in. */
export interface AlignmentInput extends AlignmentAnchor {
  readonly stageWidth: number;
  readonly margin?: number;
}

/** The panel's left edge an alignment asks for, in stage coordinates. */
export const alignedLeft = ({
  align,
  triggerX,
  triggerWidth,
  panelWidth,
}: AlignmentAnchor): number =>
  triggerX + alignOffset(align, triggerWidth, panelWidth);

/**
 * The panel's box after the stage's collision margin pulls it back inside.
 *
 * `shifted` is the distance the panel slid; it is zero for a panel with room.
 */
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

/**
 * The alignment drawing's numbers: a fixed trigger centred in the stage, and
 * the panel's stage box plus the `left` its anchor-relative paint needs.
 */
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
