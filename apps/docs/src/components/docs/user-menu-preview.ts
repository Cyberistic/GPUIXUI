export const MENU_WIDTH = 224;

export const ANCHOR_WIDTH = 240;

export const STAGE_WIDTH = 520;

export const STAGE_INSET = 8;

export const SIDE_OFFSET = 4;

export const TRIGGER_RIGHT = STAGE_INSET + ANCHOR_WIDTH;

export const menuLeft = (triggerRight: number): number =>
  triggerRight + SIDE_OFFSET;

export const STAGE_MENU_LEFT = menuLeft(TRIGGER_RIGHT);
