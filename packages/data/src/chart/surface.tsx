/** @jsxImportSource @gpuix/react */
/**
 * The surface a chart's marks paint on.
 *
 * The runtime has **no chart host** and no canvas: `<canvas>` paints nothing,
 * and `<svg source>` is rasterised through GPUI's *icon* element, so its whole
 * markup becomes **one tinted mask**. That is why a chart drawn that way is
 * one element per series, each a single colour, with no gradient and no
 * translucent mark over a mark beneath it.
 *
 * `ImgInstance.setImage` decodes **SVG bytes** through GPUI's own
 * `SvgRenderer` instead. One element then carries the chart's whole document:
 * every series in its own fill, a real gradient, a stroke at its own weight,
 * a mark at its own alpha. `chart-raster` measured the route — three fills
 * painted three colours inside one element — and `chart-surface-lifecycle`
 * measured that the element scales its image to its box, so a chart drawn at
 * its layout size follows a splitter.
 *
 * Two rules the route carries, both measured:
 *
 * - the bytes must be on the element **before** the frame that paints it, so
 *   the push is a **layout effect** and not a passive one;
 * - a resize re-scales the image with its box, so a chart does not re-push
 *   when only its size changed.
 *
 * The `<svg source>` route stays as the **fallback**, for a host that cannot
 * decode an image: the same document, painted as one mask per series. A
 * caller asks for the route it needs; the chart's geometry does not change.
 */

import type { ImgInstance, Props } from "@gpuix/react";
import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useLayoutEffect, useRef } from "react";
import type { ChartBox } from "./logic.js";
import { chartSvg, type ChartDocument } from "./svg.js";

/** How a chart's marks reach the frame. */
export type ChartRender =
  /** One image carrying the chart's whole document — every colour its own. */
  | "document"
  /** One tinted mask per series — the route a host without an image needs. */
  | "mask";

/** The failure a chart's image decode reports. */
export class ChartDecodeError extends Schema.TaggedError<ChartDecodeError>()(
  "ChartDecodeError",
  { reason: Schema.String },
  { description: "The chart's SVG could not be decoded by the runtime." },
) {}

/**
 * The push of a chart's document onto an image.
 *
 * The decode is a **native call that may throw**, so it is lifted into a
 * typed failure rather than caught and dropped: the failure is a value the
 * caller reads, and nothing is swallowed — a chart that cannot paint says
 * so, and the caller decides what happens next.
 */
export const pushDocument = (
  element: ImgInstance | null,
  markup: string,
): Effect.Effect<void, ChartDecodeError> =>
  element === null
    ? Effect.void
    : Effect.try({
        try: () => element.setImage(Buffer.from(markup, "utf8")),
        catch: (cause) => new ChartDecodeError({ reason: String(cause) }),
      });

/** {@link ChartSurface} props. */
export interface ChartSurfaceProps extends Omit<Props, "children"> {
  /** The marks the surface paints, in paint order. */
  readonly document: ChartDocument;
  /** The route the marks take. Defaults to `document`. */
  readonly render?: ChartRender;
  /** The chart's name, for the image's accessible label. */
  readonly label?: string;
  /** The chart's values, for the image's accessible description. */
  readonly description?: string;
  /** The chart's test id. */
  readonly testId?: string;
  /**
   * The decode failed.
   *
   * A chart that cannot paint its document says so rather than painting an
   * empty frame, so a caller can fall back to the mask route or report the
   * failure.
   */
  readonly onDecodeError?: (failure: ChartDecodeError) => void;
}

/**
 * The surface: one `<img>` carrying the chart's document.
 *
 * The image is sized by the box the chart measured, and the document is drawn
 * at that size, so the runtime's own rasterisation is at the scale the marks
 * will be read at. A document drawn at a different size is scaled by the
 * runtime, and a stroke softens when it is scaled up.
 */
export const ChartSurface = ({
  document,
  render = "document",
  label,
  description,
  testId,
  onDecodeError,
  style,
  ...rest
}: ChartSurfaceProps) => {
  const instance = useRef<ImgInstance | null>(null);
  const markup = chartSvg(document);
  const box: ChartBox = document.box;

  // The bytes must be on the element before the frame that paints it, so the
  // push is a layout effect. The decode is a native call, so it is lifted
  // into a typed failure and reported rather than swallowed: the chart's own
  // fallback route takes over.
  useLayoutEffect(() => {
    if (render !== "document") return;
    Effect.runSync(
      pushDocument(instance.current, markup).pipe(
        Effect.catchTag("ChartDecodeError", (failure) =>
          Effect.sync(() => onDecodeError?.(failure)),
        ),
      ),
    );
  }, [markup, render, onDecodeError]);

  return (
    <img
      {...rest}
      ref={instance}
      role={label === undefined ? undefined : "img"}
      aria-label={label}
      aria-description={description}
      testId={testId}
      style={{
        width: box.width,
        height: box.height,
        ...style,
      }}
    />
  );
};

/**
 * The image a chart's surface carries, when a host cannot decode one.
 *
 * A chart drawn as a mask is one `<svg>` per series, each tinted through the
 * element's own `color`. The document is the same; the paint is not.
 */
export const ChartMaskSurface = ({
  document,
  label,
  description,
  testId,
  style,
  ...rest
}: Omit<ChartSurfaceProps, "render">) => {
  const box = document.box;
  return (
    <svg
      {...rest}
      source={chartSvg(document)}
      role={label === undefined ? undefined : "img"}
      aria-label={label}
      aria-description={description}
      testId={testId}
      style={{
        width: box.width,
        height: box.height,
        ...style,
      }}
    />
  );
};

/**
 * Whether a chart's marks take the document route.
 *
 * The route is the caller's answer to a question only the host can answer:
 * can it decode an image? The default is the document route, because that is
 * the route that paints in colour.
 */
export const rendersDocument = (render: ChartRender | undefined): boolean =>
  Option.getOrElse(Option.fromNullishOr(render), () => "document" as const) ===
  "document";
