export const POPOVER_SIDE_OFFSET = 6;

export const POPOVER_COLLISION_PADDING = 8;

export const POPOVER_SIDES = ["top", "right", "bottom", "left"] as const;

export type PopoverSide = (typeof POPOVER_SIDES)[number];

export const sideLabel = (side: PopoverSide): string =>
  `${side.charAt(0).toUpperCase()}${side.slice(1)}`;

export const POPOVER_PANEL_WIDTH = 240;

export const POPOVER_FRAME_WIDTH = 600;

export const POPOVER_FRAME_PADDING = 24;

export const POPOVER_TRIGGER_WIDTH = 74;

export const pullBack = (
  requested: number,
  panelWidth: number,
  frameWidth: number,
  margin: number = POPOVER_COLLISION_PADDING,
): number =>
  Math.max(margin, Math.min(requested, frameWidth - margin - panelWidth));

export const pullBackBy = (
  requested: number,
  panelWidth: number,
  frameWidth: number,
  margin: number = POPOVER_COLLISION_PADDING,
): number => requested - pullBack(requested, panelWidth, frameWidth, margin);

export const collisionLayout = () => {
  const requested =
    POPOVER_FRAME_WIDTH - POPOVER_FRAME_PADDING - POPOVER_TRIGGER_WIDTH;

  return {
    requested,
    left: pullBack(requested, POPOVER_PANEL_WIDTH, POPOVER_FRAME_WIDTH),
    pulledBack: pullBackBy(requested, POPOVER_PANEL_WIDTH, POPOVER_FRAME_WIDTH),
    frameWidth: POPOVER_FRAME_WIDTH,
    panelWidth: POPOVER_PANEL_WIDTH,
    margin: POPOVER_COLLISION_PADDING,
  };
};
