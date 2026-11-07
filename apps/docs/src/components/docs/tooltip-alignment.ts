import { POPOVER_ALIGNMENTS, alignedPlacement } from "./popover-alignment";

export const TOOLTIP_ALIGNMENTS = POPOVER_ALIGNMENTS;

export type TooltipAlign = (typeof TOOLTIP_ALIGNMENTS)[number];

export const TOOLTIP_FRAME_WIDTH = 480;

export const TOOLTIP_TRIGGER_WIDTH = 148;

export const TOOLTIP_WIDTH = 200;

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
