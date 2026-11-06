export const ROWS = 200;

export const ROW = 32;

export const DETAIL = 88;

export const TARGET = 3;

export const REVEAL = 150;

export const VIEWPORT = 240;

export const heightAt = (index: number, open: boolean): number =>
  index === TARGET && open ? ROW + DETAIL : ROW;

export const spaceBelowGrowth = (): number =>
  VIEWPORT - TARGET * ROW - (ROW + DETAIL);
