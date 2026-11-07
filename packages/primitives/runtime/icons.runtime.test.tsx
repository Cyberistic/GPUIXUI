import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Icon, ICON_SIZES } from "@gpuixui/icons";
import type { IconName, IconSize } from "@gpuixui/icons";
import { a11yNode, type Runtime } from "./harness.js";
import { Surface, openWindow } from "./fixture.js";

const ICON = "icon";

const mount = (runtime: Runtime, icon: React.ReactElement): void => {
  runtime.render(<Surface>{icon}</Surface>);
};

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

it("paints an icon whose raw size cannot be measured at the default step", async () => {
  const runtime = await openWindow();
  const widthAt = (size: number): number => {
    mount(
      runtime,
      <Icon name="check" color="#123456" size={size} testId={ICON} />,
    );
    return boundsOfIcon(runtime).width;
  };
  expect(widthAt(Number.NaN)).toBe(ICON_SIZES.md);
  expect(widthAt(Number.POSITIVE_INFINITY)).toBe(ICON_SIZES.md);
  expect(widthAt(0)).toBe(ICON_SIZES.md);
  expect(widthAt(-4)).toBe(ICON_SIZES.md);
  expect(widthAt(21)).toBe(21);
});

it("paints an icon whose stored size name the scale no longer carries", async () => {
  const runtime = await openWindow();
  const stored = "huge" as IconSize;
  mount(
    runtime,
    <Icon name="check" color="#123456" size={stored} testId={ICON} />,
  );
  const bounds = boundsOfIcon(runtime);
  expect(bounds.width).toBe(ICON_SIZES.md);
  expect(bounds.height).toBe(ICON_SIZES.md);
});

it("paints a mark for a stored name the set no longer carries", async () => {
  const runtime = await openWindow();
  const stored = "floppy" as IconName;
  const captured = await Effect.runPromise(tintedFrames(runtime, stored));
  expect(sameBytes(captured.blue, captured.red)).toBe(false);
  expect(boundsOfIcon(runtime).width).toBe(ICON_SIZES.xl);
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

const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length &&
  Arr.every(
    Arr.range(0, left.length - 1),
    (index) => left[index] === right[index],
  );

const tintedFrames = (
  runtime: Runtime,
  name: IconName,
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

  expect(sameBytes(captured.alsoRed, captured.red)).toBe(true);
  expect(sameBytes(captured.blue, captured.red)).toBe(false);
});

it("tints a filled glyph too, which is how a chosen star reads", async () => {
  const runtime = await openWindow();
  const captured = await Effect.runPromise(
    tintedFrames(runtime, "star-filled"),
  );
  expect(sameBytes(captured.alsoRed, captured.red)).toBe(true);
  expect(sameBytes(captured.blue, captured.red)).toBe(false);
});

it("paints every geometry form the set is built from", async () => {
  const runtime = await openWindow();
  const samples: ReadonlyArray<[IconName, string]> = [
    ["pause", "two rects and nothing else"],
    ["play", "one closed path of arcs"],
    ["circle", "one circle and nothing else"],
    ["file", "arcs joined to straight segments"],
  ];

  const unmeasured = await Effect.runPromise(
    Effect.forEach(
      samples,
      ([name, form]) =>
        Effect.map(tintedFrames(runtime, name), (captured) =>
          sameBytes(captured.blue, captured.red) ? [`${name}: ${form}`] : [],
        ),
      { concurrency: 1 },
    ),
  );
  expect(Arr.flatten(unmeasured)).toEqual([]);
});
