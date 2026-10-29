/**
 * The tooltip drawing's alignment geometry, in the popover's own rule.
 *
 * The tip takes the same `align` as the popover, so the drawing imports the
 * shared placement rule instead of writing a second one: `start` shares the
 * trigger's left edge, `center` its centre line and `end` its right edge,
 * clamped by the collision margin.
 */

import { POPOVER_ALIGNMENTS, alignedPlacement } from "./popover-alignment";

/** The three alignments the tip's `align` names. */
export const TOOLTIP_ALIGNMENTS = POPOVER_ALIGNMENTS;

/** An alignment the drawing can show. */
export type TooltipAlign = (typeof TOOLTIP_ALIGNMENTS)[number];

/** The frame the drawing measures against. */
export const TOOLTIP_FRAME_WIDTH = 480;

/** The `Revenue definition` trigger's width, measured in the drawing. */
export const TOOLTIP_TRIGGER_WIDTH = 148;

/** The tip's width in the drawing, so the arithmetic is predictable. */
export const TOOLTIP_WIDTH = 200;

/** The tip's `left` for an alignment, relative to the trigger. */
export const tooltipLayout = (align: TooltipAlign) => {
  const triggerX = (TOOLTIP_FRAME_WIDTH - TOOLTIP_TRIGGER_WIDTH) / 2;
  const placement = alignedPlacement({
    align,
    triggerX,
    triggerWidth: TOOLTIP_TRIGGER_WIDTH,
    panelWidth: TOOLTIP_WIDTH,
    stageWidth: TOOLTIP_FRAME_WIDTH,
  });

  return { ...placement, triggerX, offset: placement.left - triggerX };
};
