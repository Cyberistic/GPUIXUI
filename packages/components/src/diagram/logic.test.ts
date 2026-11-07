import { describe, expect, it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import * as Option from "effect/Option";
import {
  diagramDataUrl,
  diagramDrawing,
  diagramType,
  DiagramError,
} from "./logic.js";

const SOURCE = `flowchart LR
  A[Author] --> B[Component]
  B --> C[Reader]`;

describe("a diagram's drawing", () => {
  it("needs no document and no window", () => {
    const globals: { readonly [key: string]: unknown } = globalThis;
    expect(globals["document"]).toBeUndefined();
    expect(globals["window"]).toBeUndefined();
  });

  it.effect("renders a source to an SVG document with a measured size", () =>
    Effect.gen(function* () {
      const drawing = yield* diagramDrawing(SOURCE);
      expect(drawing.svg).toContain("<svg");
      expect(drawing.svg).toContain("</svg>");
      expect(drawing.width).toBeGreaterThan(0);
      expect(drawing.height).toBeGreaterThan(0);
      expect(drawing.type).toBe("flowchart");
    }),
  );

  it.effect("is pure: the same source makes the same drawing", () =>
    Effect.gen(function* () {
      const first = yield* diagramDrawing(SOURCE);
      const second = yield* diagramDrawing(SOURCE);
      expect(second.svg).toBe(first.svg);
      expect(second.width).toBe(first.width);
      expect(second.height).toBe(first.height);
    }),
  );

  it.effect(
    "names the kind a source declares, whatever the parser calls it",
    () =>
      Effect.gen(function* () {
        const type = yield* diagramType("sequenceDiagram\n  A->>B: hi");
        expect(Option.getOrThrow(type)).toBe("sequence");
      }),
  );

  it.effect("names no kind for a source that declares none", () =>
    Effect.gen(function* () {
      const type = yield* diagramType("not a diagram");
      expect(Option.isNone(type)).toBe(true);
    }),
  );

  it.effect("reports a source the parser refuses as a typed failure", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(diagramDrawing("this is not a diagram"));
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isSuccess(exit)) return;

      const error = yield* Effect.flip(exit);
      expect(error).toBeInstanceOf(DiagramError);
    }),
  );

  it.effect("keeps the parser's sentence in the failure", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(diagramDrawing("this is not a diagram"));

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isSuccess(exit)) return;
      const error = yield* Effect.flip(exit);
      expect(error.message.length).toBeGreaterThan(0);
      expect(error._tag).toBe("DiagramError");
    }),
  );

  it.effect("carries the drawing as a data URL the runtime decodes", () =>
    Effect.gen(function* () {
      const drawing = yield* diagramDrawing(SOURCE);
      const url = diagramDataUrl(drawing.svg);
      expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true);

      const payload = url.slice("data:image/svg+xml;base64,".length);
      expect(Buffer.from(payload, "base64").toString("utf8")).toBe(drawing.svg);
    }),
  );

  it.effect("keeps a quote in the source out of the data URL", () =>
    Effect.gen(function* () {
      const drawing = yield* diagramDrawing(
        `flowchart LR\n  A["a quoted label"] --> B[Next]`,
      );
      const url = diagramDataUrl(drawing.svg);
      expect(url.slice("data:image/svg+xml;base64,".length)).not.toContain('"');
    }),
  );
});
