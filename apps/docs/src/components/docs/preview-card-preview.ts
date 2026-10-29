/**
 * The preview card drawing's geometry, in the popover's own rule.
 *
 * The shipped card takes the same `align` as the popover and lets the shared
 * placement rule decide the edge, so the drawing imports that rule rather than
 * writing a second one: `start` shares the trigger's left edge, `center` its
 * centre line and `end` its right edge, clamped by the collision margin.
 *
 * The card also keeps itself open across its 6px gap: the pointer leaves the
 * trigger before it reaches the surface, so a card that closed on that leave
 * could never be entered. The drawing fills the gap with a transparent bridge
 * (`.gx-preview-card-bridge`), the same way a hover card is expected to behave —
 * a gap is a hole in the target, not a dismissal.
 */

import { POPOVER_ALIGNMENTS, alignedPlacement } from "./popover-alignment";

/** The three alignments the card's `align` names, as the popover's control does. */
export const PREVIEW_CARD_ALIGNMENTS = POPOVER_ALIGNMENTS;

/** An alignment the drawing can show. */
export type PreviewCardAlign = (typeof PREVIEW_CARD_ALIGNMENTS)[number];

/** The frame the drawing measures against, wide enough for every alignment. */
export const PREVIEW_CARD_FRAME_WIDTH = 600;

/** The `design-system.md` trigger's width, measured in the drawing. */
export const PREVIEW_CARD_TRIGGER_WIDTH = 148;

/** The card's width in the drawing, so the arithmetic is predictable. */
export const PREVIEW_CARD_WIDTH = 300;

/** The gap the component leaves between its trigger and the card. */
export const PREVIEW_CARD_SIDE_OFFSET = 6;

/**
 * The card's `left` for an alignment, relative to the trigger, plus the stage
 * box the readout prints. The trigger sits centred in the frame, as the
 * popover's drawing does.
 */
export const previewCardLayout = (align: PreviewCardAlign) => {
  const triggerX = (PREVIEW_CARD_FRAME_WIDTH - PREVIEW_CARD_TRIGGER_WIDTH) / 2;
  const placement = alignedPlacement({
    align,
    triggerX,
    triggerWidth: PREVIEW_CARD_TRIGGER_WIDTH,
    panelWidth: PREVIEW_CARD_WIDTH,
    stageWidth: PREVIEW_CARD_FRAME_WIDTH,
  });

  return { ...placement, triggerX, offset: placement.left - triggerX };
};
