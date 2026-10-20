/**
 * `Surface` in the real GPUix renderer.
 *
 * The bug this guards: a surface whose adapter lifecycle is only half-driven —
 * a host that is never created, a resize that never reaches the adapter, a
 * theme change that leaves stale pixels, or an unmount that leaks the session.
 * It also proves the one raster path published `0.10.0` actually has: an
 * `<img>` host receiving a 2×2 RGBA frame through `setImagePixels` (plan `696`).
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  Surface as SurfacePrimitive,
  SurfaceError,
  rasterSurface,
  type SurfaceAdapter,
  type SurfaceBounds,
  type SurfaceHost,
} from "../src/index.js";
import { Box } from "../src/index.js";
import { a11yNode } from "../src/testing/index.js";
import {
  awaitFrame,
  openWindow,
  Surface as Frame,
  testTheme,
  testThemeDark,
} from "./fixture.js";

interface Recorded {
  readonly calls: Array<string>;
  readonly adapter: SurfaceAdapter;
}

const recorder = (): Recorded => {
  const calls: Array<string> = [];
  const adapter: SurfaceAdapter = {
    kind: "recorder",
    create: () => Effect.sync(() => calls.push("create")),
    resize: (bounds: SurfaceBounds) =>
      Effect.sync(() => calls.push(`resize:${bounds.width}x${bounds.height}`)),
    focus: () => Effect.sync(() => calls.push("focus")),
    setVisible: (visible: boolean) =>
      Effect.sync(() => calls.push(`visible:${visible}`)),
    setTheme: (mode) => Effect.sync(() => calls.push(`theme:${mode}`)),
    destroy: () => Effect.sync(() => calls.push("destroy")),
  };
  return { calls, adapter };
};

const boundsOf = (runtime: Awaited<ReturnType<typeof openWindow>>) =>
  Option.getOrElse(runtime.bounds("raster"), () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  }));

describe("Surface", () => {
  it("creates, sizes, shows and themes one session, then destroys it", async () => {
    const runtime = await openWindow();
    const { calls, adapter } = recorder();
    runtime.render(
      <Frame>
        <SurfacePrimitive
          adapter={adapter}
          width={120}
          height={80}
          label="Raster"
          testId="raster"
        />
      </Frame>,
    );
    await awaitFrame(
      () => calls.includes("theme:light"),
      "the surface session",
    );

    expect(calls).toStrictEqual([
      "create",
      "resize:120x80",
      "visible:true",
      "theme:light",
    ]);
    const element = runtime.element("raster");
    expect(Option.isSome(element)).toBe(true);
    expect(
      Option.flatMap(element, (found) =>
        Option.fromNullishOr(found.style.width),
      ),
    ).toStrictEqual(Option.some(120));
    expect(boundsOf(runtime).width).toBe(120);
    expect(boundsOf(runtime).height).toBe(80);
    expect(Option.isSome(a11yNode(runtime.a11y(), { label: "Raster" }))).toBe(
      true,
    );

    runtime.render(
      <Frame>
        <SurfacePrimitive
          adapter={adapter}
          width={120}
          height={80}
          label="Raster"
          testId="raster"
        />
      </Frame>,
    );
    runtime.render(
      <Frame>
        <Box tone="none" />
      </Frame>,
    );
    await awaitFrame(() => calls.includes("destroy"), "the surface destroy");

    expect(calls).toStrictEqual([
      "create",
      "resize:120x80",
      "visible:true",
      "theme:light",
      "visible:false",
      "destroy",
    ]);
  });

  it("routes native focus into the adapter when the host is a tab stop", async () => {
    const runtime = await openWindow();
    const { calls, adapter } = recorder();
    runtime.render(
      <Frame>
        <SurfacePrimitive
          adapter={adapter}
          width={120}
          height={80}
          label="Focusable"
          tabIndex={0}
          testId="raster"
        />
      </Frame>,
    );
    await awaitFrame(
      () => calls.includes("theme:light"),
      "the surface session",
    );
    runtime.focusNext();
    await awaitFrame(() => runtime.focused()._tag === "Some", "native focus");
    expect(Option.getOrUndefined(runtime.focused())).toBe("raster");
    expect(
      Option.isSome(
        a11yNode(runtime.a11y(), { role: "Group", label: "Focusable" }),
      ),
    ).toBe(true);
    await awaitFrame(() => calls.includes("focus"), "the adapter focus");
    const shadow = Option.flatMap(runtime.element("raster"), (found) =>
      Option.fromNullishOr(found.style.boxShadow),
    );
    expect(Option.isSome(shadow)).toBe(true);

    expect(calls).toContain("focus");
  });

  it("resizes and re-themes a live session", async () => {
    const runtime = await openWindow();
    const { calls, adapter } = recorder();
    const view = (width: number, theme: typeof testTheme) => (
      <Frame theme={theme}>
        <SurfacePrimitive
          adapter={adapter}
          width={width}
          height={80}
          label="Raster"
          testId="raster"
        />
      </Frame>
    );

    runtime.render(view(120, testTheme));
    await awaitFrame(() => calls.includes("theme:light"), "the first session");

    runtime.render(view(200, testThemeDark));
    await awaitFrame(
      () => calls.includes("resize:200x80") && calls.includes("theme:dark"),
      "the resize and dark theme",
    );

    expect(calls).toStrictEqual([
      "create",
      "resize:120x80",
      "visible:true",
      "theme:light",
      "resize:200x80",
      "theme:dark",
    ]);
  });

  it("paints a real RGBA frame through setImagePixels", async () => {
    const runtime = await openWindow();
    const paints: Array<{ width: number; height: number; bytes: number }> = [];
    const errors: Array<SurfaceError> = [];
    const modes: Array<"light" | "dark"> = [];
    const raw = rasterSurface({
      paint: ({ width, height }, context) => {
        modes.push(context.mode);
        return Effect.succeed({
          width,
          height,
          pixels: new Uint8Array(width * height * 4).fill(255),
        });
      },
    });
    const calls: Array<string> = [];
    const adapter: SurfaceAdapter = {
      ...raw,
      create: (host: SurfaceHost) => {
        calls.push("create");
        return raw.create({
          ...host,
          setPixels: (width, height, pixels) => {
            calls.push("pixels");
            paints.push({ width, height, bytes: pixels.length });
            host.setPixels(width, height, pixels);
          },
        });
      },
      resize: (bounds) => {
        calls.push(`resize:${bounds.width}x${bounds.height}`);
        return raw.resize(bounds);
      },
      setTheme: (mode) => {
        calls.push(`theme:${mode}`);
        return raw.setTheme(mode);
      },
    };

    runtime.render(
      <Frame>
        <SurfacePrimitive
          adapter={adapter}
          width={2}
          height={2}
          label="Frame"
          testId="raster"
          onError={(error) => errors.push(error)}
        />
      </Frame>,
    );
    await awaitFrame(
      () => paints.length >= 1 || errors.length > 0,
      "the raster frame",
    );

    expect(calls).toStrictEqual([
      "create",
      "resize:2x2",
      "pixels",
      "theme:light",
    ]);
    expect(modes).toStrictEqual(["light"]);
    expect(errors).toStrictEqual([]);
    expect(paints).toStrictEqual([{ width: 2, height: 2, bytes: 16 }]);
    expect(modes).toStrictEqual(["light"]);
    expect(boundsOf(runtime).width).toBe(2);
    expect(boundsOf(runtime).height).toBe(2);
  });

  it("reports a typed failure without unmounting the host", async () => {
    const runtime = await openWindow();
    const errors: Array<SurfaceError> = [];
    const adapter = rasterSurface({
      paint: () =>
        Effect.fail(
          new SurfaceError({ operation: "resize", message: "no pixels" }),
        ),
    });

    runtime.render(
      <Frame>
        <SurfacePrimitive
          adapter={adapter}
          width={40}
          height={30}
          label="Broken"
          testId="raster"
          onError={(error) => errors.push(error)}
        />
      </Frame>,
    );
    await awaitFrame(() => errors.length === 1, "the typed failure");

    expect(errors[0]?.operation).toBe("resize");
    expect(errors[0]?.message).toBe("no pixels");
    expect(boundsOf(runtime).width).toBe(40);
    expect(boundsOf(runtime).height).toBe(30);
  });
});
