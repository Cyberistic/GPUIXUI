/**
 * The editor-overlay fixture's premises.
 *
 * The probe's whole measurement is a pixel comparison between two boxes that
 * differ only by the field. If the fixture gave the pair different metrics, a
 * painted fill, or a control ink the code also paints, the comparison would
 * report something other than "the field painted nothing" — and the probe would
 * read as evidence either way. Each case below is one of those premises.
 */
import { describe, expect, it } from "@effect/vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { lightTheme } from "@gpuixui/tokens";
import {
  OVERLAY_ENTER_COUNT,
  OVERLAY_FRAME,
  OVERLAY_GAP,
  OVERLAY_MARK,
  OVERLAY_PAGE,
  OVERLAY_SOURCE,
  overlayCodeStyle,
  overlayFieldStyle,
  overlayReadout,
  overlayRegion,
} from "./editor-overlay.js";

const INKS = ["transparent", "visible"] as const;

describe("the editor-overlay fixture", () => {
  it("lays the field and the code out on one metric", () => {
    const field = overlayFieldStyle(lightTheme, "transparent");
    const code = overlayCodeStyle(lightTheme);
    expect(field.fontFamily).toBe(code.fontFamily);
    expect(field.fontSize).toBe(code.fontSize);
    expect(field.lineHeight).toBe(code.lineHeight);
    expect(field.padding).toBe(code.padding);
    expect(field.fontFamily).not.toBeUndefined();
  });

  it("paints no fill of its own in either ink", () => {
    // A field with a fill hides the layer beneath it, which is the whole
    // composition; the visible control changes the glyph colour only.
    expect(
      Arr.map(INKS, (ink) => overlayFieldStyle(lightTheme, ink).backgroundColor),
    ).toEqual(["transparent", "transparent"]);
  });

  it("keeps the visible control's ink off the code's own colour", () => {
    const code = overlayCodeStyle(lightTheme);
    const visible = overlayFieldStyle(lightTheme, "visible");
    expect(overlayFieldStyle(lightTheme, "transparent").color).toBe(
      "transparent",
    );
    expect(visible.color).not.toBe("transparent");
    // Glyph for glyph in the code's ink, a field could compare as unchanged.
    expect(visible.color).not.toBe(code.color);
  });


  it("scales a logical box into the capture's pixels", () => {
    const region = overlayRegion(
      { x: 10, y: 20, width: OVERLAY_FRAME.width, height: OVERLAY_FRAME.height },
      2,
    );
    expect(region.x).toBe(20);
    expect(region.y).toBe(40);
    expect(region.width).toBe(OVERLAY_FRAME.width * 2);
    expect(region.height).toBe(OVERLAY_FRAME.height * 2);
  });

  it("fits the source and the two boxes on the page", () => {
    const lineHeight = overlayCodeStyle(lightTheme).lineHeight ?? 0;
    const padding = (OVERLAY_GAP / 2) * 2;
    expect(lineHeight).toBeGreaterThan(0);
    // The comparison needs the whole source inside both boxes.
    expect(
      Arr.length(Str.split("\n")(OVERLAY_SOURCE)) * lineHeight + padding,
    ).toBeLessThanOrEqual(OVERLAY_FRAME.height);
    expect(OVERLAY_FRAME.width * 2 + OVERLAY_GAP * 3).toBeLessThanOrEqual(
      OVERLAY_PAGE.width,
    );
  });

  it("prints counts in the readout, never the value", () => {
    // A readout that echoed the value would paint the probe's marker itself, so
    // "the code layer repainted" could never be read from the frame.
    const readout = overlayReadout(OVERLAY_SOURCE, "transparent");
    expect(readout).toBe(
      `ink=transparent chars=${Str.length(OVERLAY_SOURCE)} lines=6`,
    );
    expect(readout).not.toContain("const");
    expect(readout).not.toContain(OVERLAY_MARK);
  });

  it("types enough lines to outgrow the frame", () => {
    const lineHeight = overlayCodeStyle(lightTheme).lineHeight ?? 1;
    expect((OVERLAY_ENTER_COUNT + 1) * lineHeight).toBeGreaterThan(
      OVERLAY_FRAME.height,
    );
  });
});
