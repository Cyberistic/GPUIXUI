/**
 * The icon set in the real GPUix runtime.
 *
 * Lives here rather than in `packages/icons` because the runtime harness lives
 * with the components that use it: `@gpuixui/primitives` already depends on
 * `@gpuixui/icons`, and the reverse dependency would break the boundary. One
 * harness, one suite.
 *
 * `packages/icons/src/*.test.ts` proves the icon *data*; this proves the three
 * claims that only a painted frame can: that GPUix paints the raw `<svg
 * source>` markup at all, that `style.width` sizes it, and that `style.color`
 * tints it. `COMPONENTS.md` carried the last two as "unverified on screen"
 * until this suite existed.
 *
 * The tint is checked at the level of **painted pixels**, not props: the frame
 * is captured twice, once per colour, and the two PNGs must differ — with a
 * same-colour pair as the control that says the difference is the colour and
 * not capture noise. Reading a style value back would only prove the prop
 * arrived.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon, ICON_SIZES } from "@gpuixui/icons";
import { a11yNode, type Runtime } from "./harness.js";
import { Surface, openWindow } from "./fixture.js";

const ICON = "icon";

const mount = (runtime: Runtime, icon: React.ReactElement): void => {
  runtime.render(<Surface>{icon}</Surface>);
};

/** The bounds of the one icon on screen. */
const boundsOfIcon = (runtime: Runtime) =>
  Option.getOrElse(runtime.bounds(ICON), () =>
    expect.fail("the runtime painted no icon"),
  );

it("paints an icon at the pixel count its size resolves to", async () => {
  const runtime = await openWindow();
  mount(runtime, <Icon name="check" color="#123456" size="lg" testId={ICON} />);
  const bounds = boundsOfIcon(runtime);
  expect(bounds.width).toBe(ICON_SIZES.lg);
  expect(bounds.height).toBe(ICON_SIZES.lg);
});

it("scales an icon from the size scale", async () => {
  const runtime = await openWindow();
  const widthAt = (size: keyof typeof ICON_SIZES): number => {
    mount(
      runtime,
      <Icon name="check" color="#123456" size={size} testId={ICON} />,
    );
    return boundsOfIcon(runtime).width;
  };
  expect(widthAt("sm")).toBe(ICON_SIZES.sm);
  expect(widthAt("xl")).toBe(ICON_SIZES.xl);
  expect(widthAt("xl")).toBeGreaterThan(widthAt("sm"));
});

it("takes a decorative icon out of the accessibility tree and keeps a named one", async () => {
  const runtime = await openWindow();
  mount(runtime, <Icon name="check" color="#123456" testId={ICON} />);
  expect(Option.isNone(a11yNode(runtime.a11y(), { role: "Image" }))).toBe(true);

  mount(
    runtime,
    <Icon name="check" color="#123456" label="Done" testId={ICON} />,
  );
  const named = Option.getOrElse(
    a11yNode(runtime.a11y(), { label: "Done" }),
    () => expect.fail("the labelled icon is not in the accessibility tree"),
  );
  expect(named.aria?.role).toBe("Image");
});

/** Whether two captured frames are the same image, byte for byte. */
const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length &&
  Arr.every(
    Arr.range(0, left.length - 1),
    (index) => left[index] === right[index],
  );

/**
 * Capture one icon in two colours, plus a same-colour control.
 *
 * The tint is read from painted pixels, not from props: a colour prop that
 * arrives while the renderer paints the markup's own colour would pass a style
 * read and fail a reader. The control (two captures of one frame) says a
 * difference is the colour and not capture noise.
 */
const tintedFrames = (
  runtime: Runtime,
  name: "check" | "star-filled",
): Effect.Effect<
  {
    readonly red: Uint8Array;
    readonly alsoRed: Uint8Array;
    readonly blue: Uint8Array;
  },
  unknown
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "gpuixui-icon-",
      });
      const capture = (color: string, file: string) =>
        Effect.gen(function* () {
          mount(
            runtime,
            <Icon name={name} color={color} size="xl" testId={ICON} />,
          );
          const target = path.join(directory, `${file}.png`);
          runtime.renderer.captureScreenshot(target);
          return yield* fileSystem.readFile(target);
        });
      return {
        red: yield* capture("#FF0000", "red"),
        alsoRed: yield* capture("#FF0000", "also-red"),
        blue: yield* capture("#0000FF", "blue"),
      };
    }),
  ).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

it("tints the painted mark from the colour it was given", async () => {
  const runtime = await openWindow();
  const captured = await Effect.runPromise(tintedFrames(runtime, "check"));
  // The control: two captures of the same frame are byte-identical, so the
  // difference below can only come from the colour.
  expect(sameBytes(captured.alsoRed, captured.red)).toBe(true);
  expect(sameBytes(captured.blue, captured.red)).toBe(false);
});

it("tints a filled glyph too, which is how a chosen star reads", async () => {
  // `star-filled` is the one icon drawn with `fill`, and `Rating` paints every
  // chosen star with it. A tint that reached only `stroke` would paint the
  // filled star black in every theme — a shape a stroke-icon test cannot see.
  const runtime = await openWindow();
  const captured = await Effect.runPromise(
    tintedFrames(runtime, "star-filled"),
  );
  expect(sameBytes(captured.alsoRed, captured.red)).toBe(true);
  expect(sameBytes(captured.blue, captured.red)).toBe(false);
});
