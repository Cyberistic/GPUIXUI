/**
 * The editor-overlay measurement: can a highlighted code view be made editable
 * by laying a transparent `<textarea>` over it?
 *
 * Plan `130`'s handoff leaves this as the one editor question a probe owes: an
 * *editable* highlighted surface has no runtime element, and the only honest
 * composition is a `<code>` display with a text field above it. Two things
 * decide whether that composition is real, and neither is visible from the
 * typings:
 *
 * - a field can be made **invisible** (transparent text and fill) so the code
 *   beneath is the only thing a reader sees, while its **caret** stays visible;
 * - the field's content can be kept in step with the code view, so a file longer
 *   than the frame does not desynchronise.
 *
 * The probe paints the same source twice: once under the field and once beside
 * it with no field. The two boxes are identical apart from the field, so a
 * pixel-for-pixel comparison of the two regions is the measurement — zero means
 * the field painted nothing, and the same comparison with the ink switched on is
 * the negative control that proves the instrument sees a field's glyphs.
 *
 * Kept native-free, as the other fixtures are, so the premises the paint checks
 * rest on are testable on a host with no binding.
 */
import type { StyleDesc } from "@gpuix/react";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { textStyle, type Theme } from "@gpuixui/tokens";
import { Pixels, type Smoke } from "@gpuixui/testing";

/** The page the probe paints, in logical pixels. */
export const OVERLAY_PAGE = { width: 680, height: 300 } as const;

/** One editor box: the overlay on the left, the reference on the right. */
export const OVERLAY_FRAME = { width: 300, height: 180 } as const;

/** The gap the fixture uses between the two boxes and around the page. */
export const OVERLAY_GAP = 16;

/**
 * The source both boxes paint: six short lines, so neither box scrolls.
 *
 * Short on purpose — the comparison needs the whole source in the frame, and a
 * scrollbar or a clipped line would be a difference the field did not paint.
 */
export const OVERLAY_SOURCE = [
  "const total = add(1, 2);",
  "export const doubled = total * 2;",
  "function add(a: number, b: number) {",
  "  return a + b;",
  "}",
  "console.log(doubled);",
].join("\n");

/** The text the probe types into the field, unique in the frame. */
export const OVERLAY_MARK = "zz";

/** How many newlines the scroll step types, to grow past the frame. */
export const OVERLAY_ENTER_COUNT = 12;

/** Whether the field paints its own glyphs, or lets the code beneath show. */
export type OverlayInk = "transparent" | "visible";

/**
 * The text style both layers share.
 *
 * One declaration for the pair is the alignment premise: the field and the code
 * are laid out with the same family, size and line height, so a caret and a
 * glyph start on the same grid. The probe does not claim they line up — that is
 * the app's arithmetic once the runtimes agree — but a fixture that gave them
 * different metrics would have no chance of it.
 */
export const overlayMetrics = (theme: Theme): StyleDesc =>
  textStyle(theme, "code");

/** The code layer the field sits over, and the reference beside it. */
export const overlayCodeStyle = (theme: Theme): StyleDesc => ({
  ...overlayMetrics(theme),
  color: theme.colors.foreground,
  padding: OVERLAY_GAP / 2,
  whiteSpace: "nowrap",
});

/**
 * The field's own paint.
 *
 * Both inks share everything except the colour: the transparent state must be
 * the same box the visible one is, or the comparison measures layout instead of
 * ink. The fill is transparent in both, because a field that paints its own
 * surface hides the layer beneath it, and the glyph colour is the **style's** —
 * a field theme's `text` token did not override `style.color` when both were
 * set, so the ink the probe toggles has one owner.
 *
 * The visible ink is the **destructive** role, not the field's own: it is the
 * negative control, and a control painted the code's `foreground` could match
 * glyph for glyph and compare as zero — the one way a broken instrument would
 * pass. A colour no code layer paints makes any glyph the field adds visible.
 */
export const overlayFieldStyle = (
  theme: Theme,
  ink: OverlayInk,
): StyleDesc => ({
  ...overlayMetrics(theme),
  color: ink === "transparent" ? "transparent" : theme.colors.destructive,
  backgroundColor: "transparent",
  padding: OVERLAY_GAP / 2,
});

/** The readout a state paints — counts, never the value text, so no glyph is doubled. */
export const overlayReadout = (value: string, ink: OverlayInk): string =>
  `ink=${ink} chars=${Str.length(value)} lines=${Arr.length(Str.split("\n")(value))}`;

/**
 * The capture pixels a logical box covers.
 *
 * A window is captured at its display's scale (the frame, not the window, is
 * the authority), so the region a comparison names is the box scaled by it.
 */
export const overlayRegion = (
  box: Smoke.Bounds,
  scale: number,
): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });
