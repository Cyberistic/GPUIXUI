/**
 * Reading a chart's markup out of a rendered tree.
 *
 * A chart's marks reach the frame in one of two forms, and a suite that asks
 * "what did this chart draw?" must not care which:
 *
 * - the **markup** on a `<svg source>` — the mask route, one element per
 *   series, each tinted through its own `color`;
 * - a **data URL** on an `<img>`'s `src` — the document route, one element
 *   carrying every series' own colour, which the runtime decodes.
 *
 * Both are read here, so a test names the chart and not the route.
 */

import * as Option from "effect/Option";

/** One element of a rendered tree, as the renderer reports it. */
export interface MarkedElement {
  readonly customProps?: Record<string, unknown>;
  readonly text?: string | null;
  readonly children: ReadonlyArray<number>;
}

/**
 * The markup a data URL carries.
 *
 * The chart's document travels as `data:image/svg+xml;base64,…`, so the
 * markup is the base64 payload decoded. A URL that is not a data URL, or one
 * whose payload is not base64, carries no markup.
 */
const decodeDataUrl = (url: string): Option.Option<string> => {
  if (!url.startsWith("data:")) return Option.none();
  const marker = url.indexOf(",");
  if (marker === -1) return Option.none();
  const metadata = url.slice(0, marker);
  if (!metadata.includes("base64")) return Option.none();
  if (typeof Buffer === "undefined") return Option.none();
  return Option.some(
    Buffer.from(url.slice(marker + 1), "base64").toString("utf8"),
  );
};

/**
 * The markup one element carries, in whichever form it carries it.
 *
 * A `<svg>` carries the markup itself; an `<img>` carries it as a data URL,
 * which the runtime decodes into the same bytes.
 */
export const markupOf = (
  element: MarkedElement | undefined,
): Option.Option<string> => {
  if (element === undefined) return Option.none();
  const source = element.customProps?.source;
  if (typeof source === "string") return Option.some(source);
  const src = element.customProps?.src;
  if (typeof src !== "string") return Option.none();
  return decodeDataUrl(src);
};

/**
 * The chart a layer belongs to, by the layer's own test id.
 *
 * A layer is named `${chartTestId}-layer-${key}`, so the chart's id is the
 * part before that suffix. A test id that names no layer is a chart's own id.
 */
export const chartIdOf = (testId: string): string => {
  const marker = testId.lastIndexOf("-layer-");
  return marker === -1 ? testId : testId.slice(0, marker);
};
