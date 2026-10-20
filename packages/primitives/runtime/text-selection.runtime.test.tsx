/**
 * `Text`'s `selectable` — the proof the docs never had.
 *
 * **The gap this file closes (plan 385).** `docs/text.mdx` promises that text
 * "is pointer-selectable when `selectable` is on", and
 * `docs/gpuix-capabilities.md` lists selection as a runtime capability, but the
 * only thing ever asserted was the `userSelect` style property
 * (`core/style.test.ts`). A style property is not a selection: the user can
 * only take the text if a real drag produces a selection range.
 *
 * Each case opens its own window (`fixture.tsx`), because a selection belongs to
 * the window's paint state. The drag endpoints are derived from the measured
 * box, so an unrelated bounds-origin change cannot decide the result (the
 * store's binding is currently main-derived; plan `529`).
 */

import { expect, it } from "vitest";
import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { ReactElement } from "react";
import { Box } from "../src/components/Box.js";
import { Text } from "../src/components/Text.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, openWindow } from "./fixture.js";

const SENTENCE = "Alpha bravo charlie";

const boxOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** Drag across `testId`'s painted line, from two pixels inside each edge. */
const dragAcross = (
  runtime: Runtime,
  testId: string,
): Option.Option<string> => {
  const box = boxOf(runtime, testId);
  const middle = box.y + box.height / 2;
  return runtime.dragSelection(
    { x: box.x + 2, y: middle },
    { x: box.x + box.width - 2, y: middle },
  );
};

it("takes the text under a real drag when selectable is on", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Text role="body" selectable testId="pick">
        {SENTENCE}
      </Text>
    </Surface>,
  );

  const dragged = dragAcross(runtime, "pick");
  const selected = Option.getOrElse(dragged, () => "");
  // Measured on this host the whole run comes back; a substring stays valid if
  // a future binding rounds the drag start to the nearest glyph.
  expect(SENTENCE).toContain(selected);
  expect(selected.length).toBeGreaterThan(SENTENCE.length / 2);
  // The drag's return value and the window's own selection agree.
  expect(runtime.selection()).toStrictEqual(dragged);
});

it("takes nothing from a text that is not selectable", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box tone="none" style={{ width: 400 }}>
        <Text role="body" testId="chrome">
          {SENTENCE}
        </Text>
      </Box>
    </Surface>,
  );

  expect(dragAcross(runtime, "chrome")).toStrictEqual(Option.none());
  expect(runtime.selection()).toStrictEqual(Option.none());
});

/** Whether two captured frames are the same image, byte for byte. */
const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length &&
  Arr.every(
    Arr.range(0, left.length - 1),
    (index) => left[index] === right[index],
  );

/**
 * One fresh window, one dragged run, one captured frame.
 *
 * A selection belongs to the window's paint state, so each frame needs its own
 * window; the fixture closes every window after the test. The capture lives in a
 * scoped temp directory and is read back before the scope closes.
 */
const captureDragged = async (tree: ReactElement): Promise<Uint8Array> => {
  const runtime = await openWindow();
  runtime.render(<Surface>{tree}</Surface>);
  const selected = dragAcross(runtime, "pick");
  expect(Option.isSome(selected)).toBe(true);
  runtime.flush();
  return Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const directory = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "gpuixui-selection-",
        });
        const file = path.join(directory, "frame.png");
        runtime.renderer.captureScreenshot(file);
        return yield* fileSystem.readFile(file);
      }),
    ).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
    ),
  );
};

it("paints the caller's selection wash, on the run and on its container", async () => {
  // The bug guarded (plan 784): the page said the runtime paints its own
  // highlight colour and there was no way to change it, while `StyleDesc`
  // exposes an inherited `selectionColor` that `style` already reaches. A
  // capture is the only witness (the style is reported as authored either way).
  const run = (selectionColor?: string): ReactElement => (
    <Box tone="none" style={{ width: 400 }}>
      <Text
        role="body"
        selectable
        testId="pick"
        style={selectionColor === undefined ? undefined : { selectionColor }}
      >
        {SENTENCE}
      </Text>
    </Box>
  );
  const container = (selectionColor: string, own?: string): ReactElement => (
    <Box tone="none" style={{ width: 400, selectionColor }}>
      <Text
        role="body"
        selectable
        testId="pick"
        style={own === undefined ? undefined : { selectionColor: own }}
      >
        {SENTENCE}
      </Text>
    </Box>
  );
  const plain = await captureDragged(run());
  const twin = await captureDragged(run());
  const own = await captureDragged(run("#FF0000"));
  const inherited = await captureDragged(container("#00FF00"));
  const overridden = await captureDragged(container("#00FF00", "#FF0000"));
  // Two identical windows agree, so a cross-window comparison is evidence.
  expect(sameBytes(plain, twin)).toBe(true);
  expect(sameBytes(plain, own)).toBe(false);
  expect(sameBytes(plain, inherited)).toBe(false);
  // An own value wins over the container's, so the container adds nothing.
  expect(sameBytes(inherited, own)).toBe(false);
  expect(sameBytes(overridden, own)).toBe(true);
});
