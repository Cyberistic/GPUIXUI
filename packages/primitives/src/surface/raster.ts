/**
 * The one surface adapter published GPUix can actually run: an RGBA frame
 * painted onto an `<img>` host through `setImagePixels` (plan `437` §2.3).
 *
 * The caller owns the pixels. This adapter owns the lifecycle, the bounds
 * bookkeeping and the one thing that is easy to get wrong: a frame whose size
 * does not match the requested box must fail loudly, not paint a stretched or
 * truncated buffer (plan `696`).
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import type { ThemeMode } from "../core/theme.js";
import {
  surfaceError,
  type SurfaceAdapter,
  type SurfaceBounds,
  type SurfaceError,
  type SurfaceHost,
  type SurfaceOperation,
} from "./adapter.js";

/** One RGBA frame, tightly packed in row-major order. */
export interface RasterFrame {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

/** What the paint callback knows besides its bounds. */
export interface RasterSurfaceContext {
  readonly mode: ThemeMode;
}

/** How a raster surface produces its pixels. */
export interface RasterSurfaceOptions {
  /** The adapter's `kind`; defaults to `"raster"`. */
  readonly kind?: string;
  /**
   * Produce the frame for a box. Called on every resize and whenever the theme
   * mode changes while the surface is alive.
   */
  readonly paint: (
    bounds: SurfaceBounds,
    context: RasterSurfaceContext,
  ) => Effect.Effect<RasterFrame, SurfaceError>;
}

const isWholeBox = (bounds: SurfaceBounds): boolean =>
  Number.isInteger(bounds.width) &&
  Number.isInteger(bounds.height) &&
  bounds.width >= 0 &&
  bounds.height >= 0;

/**
 * Whether a box has pixels to fill.
 *
 * A zero-area surface is a collapsed layout state, not a failure: it keeps its
 * session and paints nothing, then paints its first frame when it grows (plan
 * `697`).
 */
const hasArea = (bounds: SurfaceBounds): boolean =>
  bounds.width > 0 && bounds.height > 0;

const frameError = (
  bounds: SurfaceBounds,
  frame: RasterFrame,
): Option.Option<string> => {
  if (frame.width !== bounds.width || frame.height !== bounds.height) {
    return Option.some(
      `paint returned ${frame.width}×${frame.height} for a ${bounds.width}×${bounds.height} surface`,
    );
  }
  const expected = bounds.width * bounds.height * 4;
  if (frame.pixels.length !== expected) {
    return Option.some(
      `paint returned ${frame.pixels.length} bytes for ${expected} RGBA bytes at ${bounds.width}×${bounds.height}`,
    );
  }
  return Option.none();
};

/**
 * Build an adapter that paints a caller-supplied RGBA frame.
 *
 * `paint` is called only after `create`; a failure is returned as the typed
 * `SurfaceError` for the lifecycle edge that asked for the frame.
 */
export const rasterSurface = (
  options: RasterSurfaceOptions,
): SurfaceAdapter => {
  let host = Option.none<SurfaceHost>();
  let bounds = Option.none<SurfaceBounds>();
  let mode: ThemeMode = "light";

  const paintAt = (
    target: SurfaceBounds,
    operation: SurfaceOperation,
  ): Effect.Effect<void, SurfaceError> =>
    Effect.gen(function* () {
      if (!isWholeBox(target)) {
        return yield* Effect.fail(
          surfaceError(
            operation,
            `surface bounds must be whole logical pixels, got ${target.width}×${target.height}`,
          ),
        );
      }
      const current = yield* Option.match(host, {
        onNone: () =>
          Effect.fail(
            surfaceError(operation, "the surface has not been created"),
          ),
        onSome: Effect.succeed,
      });
      if (!hasArea(target)) return;
      const frame = yield* options.paint(target, { mode });
      const problem = frameError(target, frame);
      if (Option.isSome(problem)) {
        return yield* Effect.fail(surfaceError(operation, problem.value));
      }
      return yield* Effect.try({
        try: () => current.setPixels(target.width, target.height, frame.pixels),
        catch: (cause) => surfaceError(operation, cause),
      });
    });

  return {
    kind: options.kind ?? "raster",
    create: (nextHost) =>
      Effect.sync(() => {
        host = Option.some(nextHost);
      }),
    resize: (nextBounds) =>
      Effect.gen(function* () {
        yield* paintAt(nextBounds, "resize");
        bounds = Option.some(nextBounds);
      }),
    focus: () => Effect.void,
    // A frame has no focus state: the pair exists so a raster adapter is a
    // complete implementation of the contract (plan `811`).
    blur: () => Effect.void,
    setVisible: () => Effect.void,
    setTheme: (nextMode) =>
      Effect.gen(function* () {
        if (nextMode === mode) return;
        mode = nextMode;
        const current = bounds;
        if (Option.isSome(current)) {
          yield* paintAt(current.value, "setTheme");
        }
      }),
    destroy: () =>
      Effect.sync(() => {
        host = Option.none();
        bounds = Option.none();
      }),
  };
};
