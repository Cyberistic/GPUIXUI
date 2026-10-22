/**
 * The colours a terminal-mode frame proves.
 *
 * A terminal window reports no style, so the app itself is the instrument: the
 * page fills the frame with one exact value, and the fill it chooses says what
 * the app read. The rest fill means `isTerminal()` was true; the no-terminal
 * fill is what the same tree paints in a window, so a run that silently fell
 * back to the native platform cannot pass the paint check. The pressed fill is
 * the whole repaint a key causes, which is how the probe sees a key at all — a
 * terminal frame carries pixels, not a test id.
 *
 * Kept free of `@gpuix/*` imports so the runner's assumptions are testable on a
 * host with no binding.
 */
import { Pixels } from "@gpuixui/testing";

/** The page a terminal run paints once it has started. */
export const TERMINAL_REST = new Pixels.Rgba({
  r: 0xd9,
  g: 0x43,
  b: 0x2b,
  a: 255,
});
/** {@link TERMINAL_REST} as the app writes it. */
export const TERMINAL_REST_FILL = "#D9432B";

/** The page a run paints when `isTerminal()` is false. */
export const TERMINAL_NO_TERMINAL = new Pixels.Rgba({
  r: 0x1b,
  g: 0x7f,
  b: 0x3a,
  a: 255,
});
/** {@link TERMINAL_NO_TERMINAL} as the app writes it. */
export const TERMINAL_NO_TERMINAL_FILL = "#1B7F3A";

/** The page a terminal run paints after the first key reaches the app. */
export const TERMINAL_PRESSED = new Pixels.Rgba({
  r: 0x2b,
  g: 0x43,
  b: 0xd9,
  a: 255,
});
/** {@link TERMINAL_PRESSED} as the app writes it. */
export const TERMINAL_PRESSED_FILL = "#2B43D9";

/** The ink of the word that proves text is rasterised into the frame. */
export const TERMINAL_INK = new Pixels.Rgba({
  r: 0xff,
  g: 0xff,
  b: 0xff,
  a: 255,
});
/** {@link TERMINAL_INK} as the app writes it. */
export const TERMINAL_INK_FILL = "#FFFFFF";

/** The ink the word takes once a pointer press has reached the app. */
export const TERMINAL_CLICK_INK = new Pixels.Rgba({
  r: 0xff,
  g: 0xf2,
  b: 0x00,
  a: 255,
});
/** {@link TERMINAL_CLICK_INK} as the app writes it. */
export const TERMINAL_CLICK_INK_FILL = "#FFF200";

/** The one word the frame draws, centred on both axes. */
export const TERMINAL_WORD = "TERMINAL";

/** The ink the word paints: white at rest, the press ink after a click. */
export const terminalInk = (clicked: boolean): string =>
  clicked ? TERMINAL_CLICK_INK_FILL : TERMINAL_INK_FILL;

/** The page colour for a run: terminal mode, and how many keys it has seen. */
export const terminalFill = (terminal: boolean, keys: number): string =>
  terminal
    ? keys === 0
      ? TERMINAL_REST_FILL
      : TERMINAL_PRESSED_FILL
    : TERMINAL_NO_TERMINAL_FILL;
