/**
 * The arithmetic the `slider-vertical-lifecycle` probe reads a window with.
 *
 * A vertical slider runs **up**: the value's floor is the bottom of the rail and
 * its ceiling the top, which is the opposite of the axis every screenshot is
 * read down. The runtime has no `column-reverse`, so the track mirrors its parts
 * and packs them to the floor (`renderSliderTrack`), and the pointer value is
 * measured from the bottom (`verticalPointerValue`). Both halves are the
 * offscreen renderer's reading today; this fixture is what a window is read
 * against, so a sign flip in either one is a miss the probe names.
 *
 * A window reports no style, so the thumb's position is read from the paint: the
 * thumb's inner fill is the only `input`-coloured ink in the slice, and its
 * box's centre is the thumb's centre. `thumbCentreAt` is the same fraction the
 * pointer mapping produces, so the two can be held to each other.
 */
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";

/** The height the caller gives a vertical track, in logical points. */
export const VERTICAL_SLIDER_HEIGHT = 200;

/** The fraction the drag from the centre aims at: a quarter from the floor. */
export const VERTICAL_FRACTION = 0.25;

/** Where the probe reads the fixture. */
export const VERTICAL_SLIDER_IDS = {
  probe: "vslider-probe",
  slider: "vslider",
  rail: "vslider-rail",
  readout: "vslider-readout",
  range: "vrangeslider",
  rangeRail: "vrangeslider-rail",
  rangeReadout: "vrangeslider-readout",
} as const;

/** A painted box, as the runtime's layout report gives it. */
export interface VerticalBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The y a thumb's centre sits at for a fraction of a vertical rail.
 *
 * The rail is the track inside its half-thumb insets, so its own box is the
 * usable span: fraction 0 is its floor (bottom edge) and 1 its ceiling.
 */
export const thumbCentreAt = (rail: VerticalBox, fraction: number): number =>
  rail.y + (1 - fraction) * rail.height;

/** The capture pixels a logical box covers. */
const regionOf = (box: VerticalBox, scale: number): Pixels.PixelRegion =>
  new Pixels.PixelRegion({
    x: Math.round(box.x * scale),
    y: Math.round(box.y * scale),
    width: Math.round(box.width * scale),
    height: Math.round(box.height * scale),
  });

/**
 * The painted box of `colour` inside a region, in logical points.
 *
 * A capture reports device pixels and a crop reports its own origin, so both
 * are put back into the window's coordinates: a probe compares a painted box
 * with the layout report it was read beside.
 */
export const inkBounds = (
  frame: Pixels.Pixels,
  region: VerticalBox,
  scale: number,
  colour: string,
): Option.Option<VerticalBox> =>
  Option.flatMap(Option.fromNullishOr(Pixels.hexToRgba(colour)), (ink) =>
    Option.flatMap(
      Option.fromNullishOr(Pixels.crop(frame, regionOf(region, scale))),
      (crop) =>
        Option.map(
          Option.fromNullishOr(Pixels.boundsOfColour(crop, ink)),
          (bounds) => ({
            x: region.x + bounds.x / scale,
            y: region.y + bounds.y / scale,
            width: bounds.width / scale,
            height: bounds.height / scale,
          }),
        ),
    ),
  );

/**
 * The logical y of a thumb's centre from the frame, or `None` when the box
 * paints none of `colour`.
 *
 * The centre of the painted bound is the shape's centre for a round fill, even
 * with a border: the border is symmetric, so the inner fill is centred inside
 * the thumb.
 */
export const thumbCentreY = (
  frame: Pixels.Pixels,
  region: VerticalBox,
  scale: number,
  colour: string,
): Option.Option<number> =>
  Option.map(
    inkBounds(frame, region, scale, colour),
    (ink) => ink.y + ink.height / 2,
  );
