import { Effect, Exit, Result } from "effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { detectType, render } from "pele";

export class DiagramError extends Schema.TaggedError<DiagramError>()(
  "DiagramError",
  {
    message: Schema.String,

    line: Schema.optional(Schema.Number),

    column: Schema.optional(Schema.Number),

    snippet: Schema.optional(Schema.String),
  },
  { description: "A Mermaid source that Pele's parser refused." },
) {}

export interface DiagramDrawing {
  readonly svg: string;

  readonly width: number;

  readonly height: number;

  readonly type: string;
}

export interface DiagramOptions {
  readonly idPrefix?: string;

  readonly fontSize?: number;

  readonly maxWidth?: number;

  readonly autoDirection?: boolean;
}

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

export const renderDiagram = (
  source: string,
  options: DiagramOptions = {},
): DiagramResult => {
  const exit = Effect.runSyncExit(diagramDrawing(source, options));
  if (Exit.isSuccess(exit)) {
    return { drawing: Option.some(exit.value), failure: Option.none() };
  }

  const found = Exit.findError(exit);
  return {
    drawing: Option.none(),
    failure: Result.isSuccess(found)
      ? Option.some(found.success)
      : Option.none(),
  };
};

export interface DiagramResult {
  readonly drawing: Option.Option<DiagramDrawing>;

  readonly failure: Option.Option<DiagramError>;
}

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

export const diagramDataUrl = (svg: string): string =>
  `data:image/svg+xml;base64,${base64(svg)}`;

const base64 = (value: string): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64");
  }
  const bytes = new TextEncoder().encode(value);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
};
