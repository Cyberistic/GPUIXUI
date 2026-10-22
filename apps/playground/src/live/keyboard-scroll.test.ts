/**
 * The `keyboard-scroll-lifecycle` fixture, held to the arithmetic its probe
 * reads.
 *
 * The probe asserts where the window's renderer holds the offset after each
 * key, so a layout whose content stopped overflowing — or a prediction that
 * drifted from `core/scroll.ts` — would let the probe measure a clamp it
 * mistakes for a move. These cases hold the geometry (two pages of vertical
 * travel, more than a page of horizontal travel) and the prediction at every
 * step the probe takes.
 */
import { describe, expect, it } from "vitest";
import {
  HORIZONTAL_CONTENT,
  HORIZONTAL_MAX,
  HORIZONTAL_VIEWPORT,
  KEYBOARD_SCROLL_IDS,
  VERTICAL_CONTENT,
  VERTICAL_MAX,
  VERTICAL_VIEWPORT,
  lineStep,
  offsetText,
  predictedOffset,
} from "./keyboard-scroll.js";
import { densityPresets, getTheme } from "@gpuixui/tokens";

const line = lineStep(getTheme("dark"));
const page = VERTICAL_VIEWPORT.height;
const sidePage = HORIZONTAL_VIEWPORT.width;

describe("the keyboard-scroll fixture", () => {
  it("gives each region more content than it shows", () => {
    expect(VERTICAL_CONTENT).toBe(480);
    expect(VERTICAL_MAX).toBe(-320);
    expect(HORIZONTAL_CONTENT).toBe(1440);
    expect(HORIZONTAL_MAX).toBe(-1120);
  });

  it("steps a line by the density row the theme carries", () => {
    // The region steps by `theme.density.rowHeight`, so a theme whose row is 28
    // or 36 moves a different distance — the probe must not pin 32.
    expect(line).toBe(32);
    const compact = { ...getTheme("dark"), density: densityPresets.compact };
    expect(lineStep(compact)).toBe(28);
  });

  it("pages by the side the region shows", () => {
    expect(predictedOffset(0, "pagedown", line, page, VERTICAL_MAX)).toBe(-160);
    expect(predictedOffset(0, "pagedown", line, sidePage, HORIZONTAL_MAX)).toBe(
      -320,
    );
  });

  it("walks the vertical sequence the probe drives", () => {
    // down, down, up, pagedown, home, pagedown, pagedown, pagedown, end, up
    expect(predictedOffset(0, "down", line, page, VERTICAL_MAX)).toBe(-32);
    expect(predictedOffset(-32, "down", line, page, VERTICAL_MAX)).toBe(-64);
    expect(predictedOffset(-64, "up", line, page, VERTICAL_MAX)).toBe(-32);
    expect(predictedOffset(-32, "pagedown", line, page, VERTICAL_MAX)).toBe(
      -192,
    );
    expect(predictedOffset(-192, "home", line, page, VERTICAL_MAX)).toBe(0);
    expect(predictedOffset(-160, "pagedown", line, page, VERTICAL_MAX)).toBe(
      -320,
    );
    // A third page asks for -480; the runtime clamps at the content's end.
    expect(predictedOffset(-320, "pagedown", line, page, VERTICAL_MAX)).toBe(
      -320,
    );
    expect(predictedOffset(0, "end", line, page, VERTICAL_MAX)).toBe(-320);
    expect(predictedOffset(0, "up", line, page, VERTICAL_MAX)).toBe(0);
    expect(predictedOffset(0, "pageup", line, page, VERTICAL_MAX)).toBe(0);
  });

  it("walks the horizontal sequence the probe drives", () => {
    expect(predictedOffset(0, "right", line, sidePage, HORIZONTAL_MAX)).toBe(
      -32,
    );
    expect(
      predictedOffset(-32, "pagedown", line, sidePage, HORIZONTAL_MAX),
    ).toBe(-352);
    expect(predictedOffset(-352, "end", line, sidePage, HORIZONTAL_MAX)).toBe(
      -1120,
    );
    expect(predictedOffset(-1120, "home", line, sidePage, HORIZONTAL_MAX)).toBe(
      0,
    );
  });

  it("spells the readout one way", () => {
    expect(offsetText({ x: 0, y: -32 })).toBe("x=0 y=-32");
  });

  it("gives every element its own id", () => {
    const ids = Object.values(KEYBOARD_SCROLL_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
