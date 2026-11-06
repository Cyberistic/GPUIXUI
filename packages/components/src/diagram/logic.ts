/**
 * A diagram's drawing: a Mermaid source rendered to SVG by Pele.
 *
 * Pele is a **zero-dependency** renderer that turns Mermaid into SVG
 * synchronously, and it needs no DOM: `render(source)` reads a string and
 * returns a string. Measured in a plain Node process — `typeof document` and
 * `typeof window` both `undefined` — a flowchart rendered to a 403×64 SVG.
 *
 * That is what makes a diagram mountable in a native app: the SVG travels
 * the same road a chart's document travels, as a data URL the runtime's own
 * decoder paints.
 *
 * Two limits the native route carries, and they are the honest ones:
 *
 * - an image cannot be **re-themed by a CSS variable**. Pele writes its
 *   theme as `var(--pele-bg, …)` on the root element, which a browser
 *   resolves and a raster cannot — so the values are read from the theme
 *   here and baked into the drawing;
 * - an image cannot be **selected** and cannot carry a **link**. Pele
 *   reports the links in its result, so the component can surface them, but
 *   the pixels are not clickable.
 */

import { Effect, Exit, Result } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { detectType, render } from "pele";

/**
 * A source Pele could not read.
 *
 * The source is **user text**, so a diagram that does not parse is a typed
 * failure rather than a thrown render: the component paints the failure in
 * its place and the caller reads the parser's sentence.
 */
export class DiagramError extends Schema.TaggedError<DiagramError>()(
  "DiagramError",
  {
    /** The parser's sentence. */
    message: Schema.String,
    /** The line the problem is on, when the parser knows it. */
    line: Schema.optional(Schema.Number),
    /** The column the problem is on, when the parser knows it. */
    column: Schema.optional(Schema.Number),
    /** The source line the problem is on, when the parser knows it. */
    snippet: Schema.optional(Schema.String),
  },
  { description: "A Mermaid source that Pele's parser refused." },
) {}

/** The drawing a source makes. */
export interface DiagramDrawing {
  /** The SVG document. */
  readonly svg: string;
  /** The drawing's natural width, in pixels. */
  readonly width: number;
  /** The drawing's natural height, in pixels. */
  readonly height: number;
  /** The kind of diagram the source declares, when the parser recognised it. */
  readonly type: string;
}

/** The options a render takes. */
export interface DiagramOptions {
  /** The prefix on the drawing's ids, so two drawings on a page do not collide. */
  readonly idPrefix?: string;
  /** The base font size, in pixels. */
  readonly fontSize?: number;
  /** The width the drawing may use, so a narrow box adapts the layout. */
  readonly maxWidth?: number;
  /** Whether the drawing may switch to a vertical layout when it is narrow. */
  readonly autoDirection?: boolean;
}

/**
 * Pele's own failure, read without naming its class.
 *
 * Pele exports a `PeleError` with the message, the code and the position.
 * The shape is read through a **predicate**, so the module does not depend on
 * the class: a failure from another source is still a failure, and the
 * component shows what it can.
 */
const failureOf = (cause: unknown): DiagramError => {
  const failure: {
    readonly message?: string;
    readonly line?: number;
    readonly column?: number;
    readonly snippet?: string;
  } = typeof cause === "object" && cause !== null ? cause : {};
  return new DiagramError({
    message:
      failure.message !== undefined && failure.message !== ""
        ? failure.message
        : "The diagram could not be read.",
    line: failure.line,
    column: failure.column,
    snippet: failure.snippet,
  });
};

/**
 * Render a Mermaid source to a drawing.
 *
 * The render is **pure**: the same source and the same options make the same
 * drawing, so a caller can render a diagram at build time and paint it later.
 */
export const diagramDrawing = (
  source: string,
  options: DiagramOptions = {},
): Effect.Effect<DiagramDrawing, DiagramError> =>
  Effect.try({
    try: () => {
      const result = render(source, {
        idPrefix: options.idPrefix,
        fontSize: options.fontSize,
        maxWidth: options.maxWidth,
        autoDirection: options.autoDirection,
      });
      return {
        svg: result.svg,
        width: result.width,
        height: result.height,
        type: result.type,
      };
    },
    catch: failureOf,
  });

/**
 * Render a Mermaid source to a drawing, **or** to the failure.
 *
 * The render is **pure and synchronous**, so a component that paints a
 * diagram does not need a runtime: it calls this and reads the result. The
 * {@link diagramDrawing} effect is for the callers who want the failure in
 * the error channel.
 */
export const renderDiagram = (
  source: string,
  options: DiagramOptions = {},
): DiagramResult => {
  const exit = Effect.runSyncExit(diagramDrawing(source, options));
  if (Exit.isSuccess(exit)) {
    return { drawing: Option.some(exit.value), failure: Option.none() };
  }
  // The failure is the typed error, not a defect: a source the parser
  // refused is a failure a reader can be shown.
  const found = Exit.findError(exit);
  return {
    drawing: Option.none(),
    failure: Result.isSuccess(found)
      ? Option.some(found.success)
      : Option.none(),
  };
};

/**
 * What a render produced: a drawing, or the failure that stopped it.
 */
export interface DiagramResult {
  /** The drawing, when the source parsed. */
  readonly drawing: Option.Option<DiagramDrawing>;
  /** The failure, when the source did not. */
  readonly failure: Option.Option<DiagramError>;
}

/**
 * The kind of diagram a source declares, when the parser recognises it.
 *
 * A source that names no kind is **no kind** rather than a guess: the
 * component says the source declares nothing rather than showing a type the
 * parser never named.
 */
export const diagramType = (
  source: string,
): Effect.Effect<Option.Option<string>, DiagramError> =>
  Effect.try({
    try: () => {
      const type = detectType(source);
      return type === null ? Option.none() : Option.some(type);
    },
    catch: failureOf,
  });

/**
 * The drawing as a **data URL** the runtime's `<img>` decodes.
 *
 * The bytes are base64, so the markup's own characters — a quote, a `<`, a
 * newline — cannot break the URL. The MIME type is `image/svg+xml`, which is
 * the format the runtime's decoder sniffs.
 */
export const diagramDataUrl = (svg: string): string =>
  `data:image/svg+xml;base64,${base64(svg)}`;

/**
 * A string as base64.
 *
 * `Buffer` is the runtime's own byte buffer, and it encodes base64 in one
 * call. A runtime with no `Buffer` falls back to the platform's own encoder.
 */
const base64 = (value: string): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(value);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
};
