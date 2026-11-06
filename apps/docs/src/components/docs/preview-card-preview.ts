import { POPOVER_ALIGNMENTS, alignedPlacement } from "./popover-alignment";

export const PREVIEW_CARD_ALIGNMENTS = POPOVER_ALIGNMENTS;

export type PreviewCardAlign = (typeof PREVIEW_CARD_ALIGNMENTS)[number];

export const PREVIEW_CARD_FRAME_WIDTH = 600;

export const PREVIEW_CARD_TRIGGER_WIDTH = 148;

export const PREVIEW_CARD_WIDTH = 300;

export const PREVIEW_CARD_SIDE_OFFSET = 6;

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
