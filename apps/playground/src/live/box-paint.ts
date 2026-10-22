/**
 * What a box's own edges and fill paint.
 *
 * Three things the library's Box docs tell a consumer to pass through `style` —
 * a **dashed border**, **per-side widths**, a **per-corner radius** — and the
 * **two-stop linear gradient** the capability record calls supported, are all
 * declared in `StyleDesc` and were all unmeasured: a component's empty state, a
 * drop zone or a brand surface is drawn with them, and a window reports no
 * style, so only a frame says whether they reached the glass.
 *
 * The reads are exact-colour counts and point samples. A dashed edge is proved
 * by comparing the border pixels it paints with the solid edge of the same
 * geometry — a dash covers less of the same band — rather than by guessing at a
 * dash pattern, and a graded fill is proved by two samples that must differ.
 */
import { pipe } from "effect";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { colourAt, differs } from "./frame.js";

/** Frame sampling is shared with every other probe; re-exported for this one's readers. */
export { colourAt, differs };

/** Where the window's checks read the fixture. */
export const BOX_PAINT_IDS = {
  solid: "boxpaint-solid",
  dashed: "boxpaint-dashed",
  corners: "boxpaint-corners",
  sides: "boxpaint-sides",
  gradient: "boxpaint-gradient",
} as const;

/** The border colour both bordered boxes ask for. */
export const BOX_PAINT_BORDER = "#FF3B30";

/** The fill a box paints under its border, and the page it sits on. */
export const BOX_PAINT_FILL = "#34C759";

/** The gradient's two stops. */
export const BOX_PAINT_STOPS = ["#FF3B30", "#0A84FF"] as const;

/** The box every measurement is made against. */
export const BOX_PAINT_WIDTH = 160;
export const BOX_PAINT_HEIGHT = 60;

/** The border width both bordered boxes ask for. */
export const BOX_PAINT_BORDER_WIDTH = 2;

/** A painted box, as the runtime's layout report gives it. */
export interface PaintBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A logical point inside a box. */
export interface PaintPoint {
  readonly x: number;
  readonly y: number;
}

/** The logical point at `fraction` of the way across a box. */
export const pointAcross = (
  box: PaintBox,
  fraction: number,
  y: number,
): PaintPoint => ({
  x: box.x + box.width * fraction,
  y,
});

/** Whether a sample is the colour `hex` asks for, within the frame's tolerance. */
export const isColour = (sample: Pixels.Rgba, hex: string): boolean =>
  pipe(
    Option.fromNullishOr(Pixels.hexToRgba(hex)),
    Option.exists((colour) => !differs(sample, colour)),
  );

/**
 * How many pixels of `hex` paint inside `box`, or `None` when the box is not in
 * the capture or the colour cannot be read.
 *
 * `None` rather than `0`: a box that moved out of frame would otherwise read as
 * "this edge painted nothing".
 */
export const countPaint = (
  frame: Pixels.Pixels,
  box: PaintBox,
  scale: number,
  hex: string,
): Option.Option<number> =>
  pipe(
    Option.all([
      Option.fromNullishOr(
        Pixels.crop(
          frame,
          new Pixels.PixelRegion({
            x: Math.round(box.x * scale),
            y: Math.round(box.y * scale),
            width: Math.round(box.width * scale),
            height: Math.round(box.height * scale),
          }),
        ),
      ),
      Option.fromNullishOr(Pixels.hexToRgba(hex)),
    ]),
    Option.map(([region, colour]) => Pixels.countColour(region, colour)),
  );
