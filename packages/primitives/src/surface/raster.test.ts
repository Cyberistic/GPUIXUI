/**
 * The raster adapter's lifecycle and frame contract.
 *
 * The bug this guards: a raster surface that paints a frame of the wrong size
 * (a stretched or truncated buffer), or one that resizes before it is created,
 * must fail through `SurfaceError` instead of reaching `setImagePixels` with
 * nonsense (plan `696`).
 */

import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  SurfaceError,
  type SurfaceHost,
  type SurfaceOperation,
} from "./adapter.js";
import { rasterSurface, type RasterFrame } from "./raster.js";

const hostWith = (
  calls: Array<{ width: number; height: number; bytes: number }>,
): SurfaceHost => ({
  elementId: 7,
  setPixels: (width, height, pixels) => {
    calls.push({ width, height, bytes: pixels.length });
  },
});

const frame = (width: number, height: number): RasterFrame => ({
  width,
  height,
  pixels: new Uint8Array(width * height * 4),
});

const failureOf = (
  effect: Effect.Effect<void, SurfaceError>,
): Promise<SurfaceError> => Effect.runPromise(Effect.flip(effect));

const expectFailure = async (
  effect: Effect.Effect<void, SurfaceError>,
  operation: SurfaceOperation,
  message: string,
): Promise<SurfaceError> => {
  const error = await failureOf(effect);
  expect(error.operation).toBe(operation);
  expect(error.message).toContain(message);
  return error;
};

describe("raster surface", () => {
  it("paints the requested bounds once the surface is created", async () => {
    const calls: Array<{ width: number; height: number; bytes: number }> = [];
    const adapter = rasterSurface({
      paint: ({ width, height }) => Effect.succeed(frame(width, height)),
    });

    await Effect.runPromise(adapter.create(hostWith(calls)));
    await Effect.runPromise(adapter.resize({ width: 2, height: 2 }));

    expect(calls).toStrictEqual([{ width: 2, height: 2, bytes: 16 }]);
  });

  it("refuses a frame whose size does not match the box", async () => {
    const calls: Array<{ width: number; height: number; bytes: number }> = [];
    const adapter = rasterSurface({
      paint: () => Effect.succeed(frame(1, 2)),
    });

    await Effect.runPromise(adapter.create(hostWith(calls)));
    await expectFailure(
      adapter.resize({ width: 2, height: 2 }),
      "resize",
      "1×2 for a 2×2",
    );
    expect(calls).toStrictEqual([]);
  });

  it("refuses a frame with the wrong byte count", async () => {
    const calls: Array<{ width: number; height: number; bytes: number }> = [];
    const adapter = rasterSurface({
      paint: ({ width, height }) =>
        Effect.succeed({
          ...frame(width, height),
          pixels: new Uint8Array(3),
        }),
    });

    await Effect.runPromise(adapter.create(hostWith(calls)));
    await expectFailure(
      adapter.resize({ width: 2, height: 2 }),
      "resize",
      "3 bytes for 16 RGBA bytes",
    );
    expect(calls).toStrictEqual([]);
  });

  it("refuses to resize before create or after destroy", async () => {
    const calls: Array<{ width: number; height: number; bytes: number }> = [];
    const adapter = rasterSurface({
      paint: ({ width, height }) => Effect.succeed(frame(width, height)),
    });

    const before = await expectFailure(
      adapter.resize({ width: 2, height: 2 }),
      "resize",
      "not been created",
    );
    expect(before.operation).toBe("resize");
    await Effect.runPromise(adapter.create(hostWith(calls)));
    await Effect.runPromise(adapter.destroy());
    await Effect.runPromise(adapter.destroy());
    const after = await expectFailure(
      adapter.resize({ width: 2, height: 2 }),
      "resize",
      "not been created",
    );
    expect(after.message).toContain("not been created");
  });

  it("repaints with the new mode on a theme change", async () => {
    const calls: Array<{ width: number; height: number; bytes: number }> = [];
    const modes: Array<"light" | "dark"> = [];
    const adapter = rasterSurface({
      paint: ({ width, height }, context) => {
        modes.push(context.mode);
        return Effect.succeed(frame(width, height));
      },
    });

    await Effect.runPromise(adapter.create(hostWith(calls)));
    await Effect.runPromise(adapter.resize({ width: 2, height: 2 }));
    await Effect.runPromise(adapter.setTheme("dark"));

    expect(modes).toStrictEqual(["light", "dark"]);
    expect(calls).toHaveLength(2);
  });

  it("does not paint for focus or visibility, and propagates a paint failure", async () => {
    const calls: Array<{ width: number; height: number; bytes: number }> = [];
    const boom = new SurfaceError({
      operation: "resize",
      message: "no pixels",
    });
    const adapter = rasterSurface({
      paint: () => Effect.fail(boom),
    });

    await Effect.runPromise(adapter.create(hostWith(calls)));
    await Effect.runPromise(adapter.focus());
    await Effect.runPromise(adapter.setVisible(false));
    const error = await failureOf(adapter.resize({ width: 2, height: 2 }));
    expect(error).toBe(boom);
    expect(calls).toStrictEqual([]);
  });

  it("keeps the adapter kind, defaulting to raster", () => {
    const adapter = rasterSurface({
      paint: ({ width, height }) => Effect.succeed(frame(width, height)),
    });
    const named = rasterSurface({
      kind: "chart",
      paint: ({ width, height }) => Effect.succeed(frame(width, height)),
    });
    expect(adapter.kind).toBe("raster");
    expect(named.kind).toBe("chart");
  });
});
