/**
 * The surface adapter contract.
 *
 * A surface is a leaf region whose pixels are owned by something other than
 * React: a rasterised chart, a media frame, or (when the runtime grows the
 * seam) a native child view. The component reserves one box and drives the
 * lifecycle; the adapter owns everything inside it. Every operation returns an
 * `Effect` so a host failure is typed and reaches the caller instead of
 * becoming an unhandled rejection (plan `696`).
 */

import type { NativeRenderer } from "@gpuix/react";
import { Effect } from "effect";
import * as Schema from "effect/Schema";
import type { ThemeMode } from "../core/theme.js";

/** The logical box a surface paints into. */
export interface SurfaceBounds {
  readonly width: number;
  readonly height: number;
}

/**
 * What an adapter receives when the surface is created.
 *
 * `setPixels` is the raster path that exists in published 0.10.0; `renderer` is
 * the wider runtime handle, present when the host provides one, for an adapter
 * that needs a capability beyond the leaf.
 */
export interface SurfaceHost {
  readonly elementId: number;
  readonly renderer?: NativeRenderer;
  readonly setPixels: (
    width: number,
    height: number,
    pixels: Uint8Array,
  ) => void;
}

const SurfaceOperation = Schema.Literals([
  "create",
  "resize",
  "focus",
  "setVisible",
  "setTheme",
  "destroy",
]).annotate({
  title: "SurfaceOperation",
  description: "The adapter call that failed.",
});

/** The adapter call that failed, named so a consumer can route the failure. */
export type SurfaceOperation = typeof SurfaceOperation.Type;

/**
 * A surface adapter failure.
 *
 * Expected: a runtime without the capability, a paint callback that cannot
 * produce a frame, or a native call that throws. The operation says which
 * lifecycle edge failed; the message is safe to show a developer.
 */
export class SurfaceError extends Schema.TaggedError<SurfaceError>()(
  "SurfaceError",
  {
    operation: SurfaceOperation,
    message: Schema.String,
  },
  {
    description: "A surface adapter operation failed.",
  },
) {}

/** Translate an unknown cause into the typed surface failure for an operation. */
export const surfaceError = (
  operation: SurfaceOperation,
  cause: unknown,
): SurfaceError =>
  new SurfaceError({
    operation,
    message: cause instanceof Error ? cause.message : String(cause),
  });

/**
 * The lifecycle a surface host drives.
 *
 * `create` receives the leaf once; every later call may arrive only after it
 * resolved. `destroy` is idempotent and must be safe after a failed `create`.
 */
export interface SurfaceAdapter {
  readonly kind: string;
  readonly create: (host: SurfaceHost) => Effect.Effect<void, SurfaceError>;
  readonly resize: (bounds: SurfaceBounds) => Effect.Effect<void, SurfaceError>;
  readonly focus: () => Effect.Effect<void, SurfaceError>;
  readonly setVisible: (visible: boolean) => Effect.Effect<void, SurfaceError>;
  readonly setTheme: (mode: ThemeMode) => Effect.Effect<void, SurfaceError>;
  readonly destroy: () => Effect.Effect<void, SurfaceError>;
}
