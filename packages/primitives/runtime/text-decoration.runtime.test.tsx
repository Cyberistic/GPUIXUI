/**
 * `Text`'s inline decoration in the real GPUix runtime.
 *
 * **The gap this file guards (plan 377).** Published 0.10.0 paints
 * `textDecoration: "underline" | "line-through"`, but `Text` had no prop for
 * either, so the only way to strike a former price was to pass `style` by hand.
 *
 * The proof is a capture comparison, not a style-record read: the runtime
 * reports the authored `textDecoration` either way, so only the painted frame
 * can say whether the glyphs carry the line. Every frame holds one copy of the
 * same string, so the only difference between two captures is the decoration.
 */

import { Effect } from "effect";
import * as Option from "effect/Option";
import * as Arr from "effect/Array";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as R from "effect/Record";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { ReactElement } from "react";
import { expect, it } from "vitest";
import { Box } from "../src/components/Box.js";
import { Text } from "../src/components/Text.js";
import { Surface, openWindow } from "./fixture.js";

const WIDTH = 400;

/** One full-width frame holding one copy of the same string. */
const frame = (text: ReactElement): ReactElement => (
  <Box tone="none" style={{ width: WIDTH }}>
    {text}
  </Box>
);

/** Whether two captured frames are the same image, byte for byte. */
const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length &&
  Arr.every(
    Arr.range(0, left.length - 1),
    (index) => left[index] === right[index],
  );

/** One captured frame, or a named failure — never an `undefined` argument. */
const image = (
  captured: Readonly<Record<string, Uint8Array>>,
  name: string,
): Uint8Array =>
  Option.getOrElse(Option.fromNullishOr(captured[name]), () =>
    expect.fail(`the runtime captured no ${name} frame`),
  );

/** Capture one frame per name into a temp directory. */
const captures = async (
  frames: ReadonlyArray<readonly [string, ReactElement]>,
): Promise<Readonly<Record<string, Uint8Array>>> => {
  const runtime = await openWindow();
  return Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const directory = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "gpuixui-decoration-",
        });
        const capture = ([name, text]: readonly [string, ReactElement]) =>
          Effect.gen(function* () {
            runtime.render(<Surface>{frame(text)}</Surface>);
            const file = path.join(directory, `${name}.png`);
            runtime.renderer.captureScreenshot(file);
            const bytes = yield* fileSystem.readFile(file);
            return [name, bytes] as const;
          });
        const entries = yield* Effect.forEach(frames, capture, {
          concurrency: 1,
        });
        return R.fromEntries(entries);
      }),
    ).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
    ),
  );
};

it("paints underline exactly like a manual frame", async () => {
  const captured = await captures([
    ["plain", <Text role="body">Hello</Text>],
    [
      "underline",
      <Text role="body" decoration="underline">
        Hello
      </Text>,
    ],
    [
      "manual",
      <Text role="body" style={{ textDecoration: "underline" }}>
        Hello
      </Text>,
    ],
  ]);
  expect(
    sameBytes(image(captured, "underline"), image(captured, "manual")),
  ).toBe(true);
  expect(
    sameBytes(image(captured, "underline"), image(captured, "plain")),
  ).toBe(false);
});

it("paints line-through unlike plain and underline", async () => {
  const captured = await captures([
    ["plain", <Text role="body">Hello</Text>],
    [
      "underline",
      <Text role="body" decoration="underline">
        Hello
      </Text>,
    ],
    [
      "strike",
      <Text role="body" decoration="line-through">
        Hello
      </Text>,
    ],
  ]);
  expect(sameBytes(image(captured, "strike"), image(captured, "plain"))).toBe(
    false,
  );
  expect(
    sameBytes(image(captured, "strike"), image(captured, "underline")),
  ).toBe(false);
  expect(
    sameBytes(image(captured, "plain"), image(captured, "underline")),
  ).toBe(false);
});
