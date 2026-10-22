/**
 * The window-chrome fixture: the flag, the option it asks `init` for, and the
 * readout the probe paints and reads back.
 *
 * The probe asserts a frame against the mode the window actually opened with, so
 * the three have to agree: a flag that decoded to the wrong mode, an option that
 * did not follow the mode, or a readout the probe could not decode would each
 * let a claim pass against the wrong window.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  defaultTitlebarChrome,
  titlebarChromes,
  splitTitlebarChrome,
  decodeEdges,
  formatEdges,
  titlebarOptions,
  barPoint,
  BAR_HEIGHT,
  BAR_SAMPLE,
} from "./chrome.js";

describe("the window-chrome mode", () => {
  it("opens the default titlebar unless the flag names one", () => {
    const parsed = splitTitlebarChrome(["--only", "window-chrome"]);
    expect(parsed.chrome).toBe(defaultTitlebarChrome);
    expect(parsed.rest).toEqual(["--only", "window-chrome"]);
    expect(parsed.unknown).toEqual([]);
  });

  it("takes the transparent mode and keeps the tokens around it", () => {
    const parsed = splitTitlebarChrome([
      "--only",
      "window-chrome",
      "--titlebar",
      "transparent",
    ]);
    expect(parsed.chrome).toBe("transparent");
    expect(parsed.rest).toEqual(["--only", "window-chrome"]);
    expect(parsed.unknown).toEqual([]);
  });

  it("reports a mode that is not one instead of opening the default", () => {
    const parsed = splitTitlebarChrome(["--titlebar", "glassy"]);
    expect(parsed.chrome).toBe(defaultTitlebarChrome);
    expect(parsed.unknown).toEqual([
      `--titlebar glassy is not a mode: ${titlebarChromes.join(", ")}`,
    ]);
    expect(splitTitlebarChrome(["--titlebar"]).unknown).toEqual([
      "--titlebar needs a mode",
    ]);
  });

  it("asks the window for the titlebar the mode names, and nothing else", () => {
    expect(titlebarOptions("default")).toEqual({});
    expect(titlebarOptions("transparent")).toEqual({
      titlebarTransparent: true,
    });
  });
});

describe("the insets readout", () => {
  it("round-trips an edge set through the text the frame carries", () => {
    const edges = { top: 28, right: 0, bottom: 0, left: 0 };
    expect(formatEdges(edges)).toBe("28,0,0,0");
    expect(decodeEdges("28,0,0,0")).toEqual(Option.some(edges));
  });

  it("refuses text that is not four numbers", () => {
    // A readout is unknown input: a wrapped or half-painted line is `None`, not
    // a zero that would read as "no safe area".
    expect(Option.isNone(decodeEdges("28,0,0"))).toBe(true);
    expect(Option.isNone(decodeEdges(""))).toBe(true);
    expect(Option.isNone(decodeEdges("28,0,0,left"))).toBe(true);
  });
});

describe("the bar geometry", () => {
  it("samples inside a bar painted at its top edge", () => {
    expect(barPoint(0)).toEqual({ x: BAR_SAMPLE.x, y: BAR_SAMPLE.y });
    expect(barPoint(28)).toEqual({ x: BAR_SAMPLE.x, y: 28 + BAR_SAMPLE.y });
    expect(barPoint(28).y).toBeLessThan(28 + BAR_HEIGHT);
  });
});
