import { Pixels } from "@gpuixui/testing";

export const TERMINAL_REST = new Pixels.Rgba({
  r: 0xd9,
  g: 0x43,
  b: 0x2b,
  a: 255,
});

export const TERMINAL_REST_FILL = "#D9432B";

export const TERMINAL_NO_TERMINAL = new Pixels.Rgba({
  r: 0x1b,
  g: 0x7f,
  b: 0x3a,
  a: 255,
});

export const TERMINAL_NO_TERMINAL_FILL = "#1B7F3A";

export const TERMINAL_PRESSED = new Pixels.Rgba({
  r: 0x2b,
  g: 0x43,
  b: 0xd9,
  a: 255,
});

export const TERMINAL_PRESSED_FILL = "#2B43D9";

export const TERMINAL_INK = new Pixels.Rgba({
  r: 0xff,
  g: 0xff,
  b: 0xff,
  a: 255,
});

export const TERMINAL_INK_FILL = "#FFFFFF";

export const TERMINAL_CLICK_INK = new Pixels.Rgba({
  r: 0xff,
  g: 0xf2,
  b: 0x00,
  a: 255,
});

export const TERMINAL_CLICK_INK_FILL = "#FFF200";

export const TERMINAL_WORD = "TERMINAL";

export const terminalInk = (clicked: boolean): string =>
  clicked ? TERMINAL_CLICK_INK_FILL : TERMINAL_INK_FILL;

export const terminalFill = (terminal: boolean, keys: number): string =>
  terminal
    ? keys === 0
      ? TERMINAL_REST_FILL
      : TERMINAL_PRESSED_FILL
    : TERMINAL_NO_TERMINAL_FILL;
