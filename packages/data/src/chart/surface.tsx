/** @jsxImportSource @gpuix/react */
import type { ImgInstance, Props } from "@gpuix/react";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useLayoutEffect, useRef } from "react";
import type { ChartBox } from "./logic.js";
import { chartSvg, type ChartDocument } from "./svg.js";

export type ChartRender = "document" | "mask";

export class ChartDecodeError extends Schema.TaggedError<ChartDecodeError>()(
  "ChartDecodeError",
  { reason: Schema.String },
  { description: "The chart's SVG could not be decoded by the runtime." },
) {}

export const documentDataUrl = (markup: string): string =>
  `data:image/svg+xml;base64,${base64(markup)}`;

const base64 = (value: string): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(value);
  return btoa(
    Arr.join(
      Arr.map(Array.from(bytes), (byte) => String.fromCharCode(byte)),
      "",
    ),
  );
};

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

export interface ChartSurfaceProps extends Omit<Props, "children"> {
  readonly document: ChartDocument;

  readonly markup?: string;

  readonly render?: ChartRender;

  readonly label?: string;

  readonly description?: string;

  readonly testId?: string;

  readonly onDecodeError?: (failure: ChartDecodeError) => void;
}

export const ChartSurface = ({
  document,
  markup,
  render = "document",
  label,
  description,
  testId,
  onDecodeError,
  style,
  ...rest
}: ChartSurfaceProps) => {
  const instance = useRef<ImgInstance | null>(null);

  const drawn = markup ?? chartSvg(document);
  const box: ChartBox = document.box;
  const source = render === "document" ? documentDataUrl(drawn) : undefined;

  useLayoutEffect(() => {
    if (render !== "document") return;
    Effect.runSync(
      pushDocument(instance.current, drawn).pipe(
        Effect.catchTag("ChartDecodeError", (failure) =>
          Effect.sync(() => onDecodeError?.(failure)),
        ),
      ),
    );
  }, [drawn, render, onDecodeError]);

  return (
    <img
      {...rest}
      ref={instance}
      src={source}
      role="none"
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

export const rendersDocument = (render: ChartRender | undefined): boolean =>
  Option.getOrElse(Option.fromNullishOr(render), () => "document" as const) ===
  "document";
