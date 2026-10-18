/**
 * `Text`'s horizontal alignment in the real GPUix runtime.
 *
 * **The bug this file guards (plan 365).** `TextProps.align` accepts
 * `"start" | "center" | "end"` and the style resolver passed the value through
 * verbatim. The runtime's `text_align` match implements `center`, `right` and
 * `left`/`start` only — `"end"` falls through — so `align="end"` painted
 * byte-identically to `align="start"`. The resolver now sends `"right"` for the
 * public `"end"`.
 *
 * The proof is a capture comparison, not a style-record read: the runtime
 * reports the authored `textAlign` either way, so only the painted frame can
 * say whether the glyphs moved. `align="end"` must match a frame that passes
 * `textAlign: "right"` straight through `style` (bypassing our mapping) and must
 * differ from `align="start"`. The 400 px width is what gives the text room to
 * move inside its box.
 */

import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { ReactElement } from "react";
import { expect, it } from "vitest";
import { Box } from "../src/components/Box.js";
import { Text } from "../src/components/Text.js";
import { Surface, openWindow } from "./fixture.js";

const WIDTH = 400;

/** One full-width frame holding one aligned copy of the same string. */
const frame = (text: ReactElement): ReactElement => (
  <Box tone="none" style={{ width: WIDTH }}>
    <Text role="body" style={{ width: WIDTH }}>
      Hello
    </Text>
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

it("paints align=end exactly like a manual right alignment, and unlike start", async () => {
  const runtime = await openWindow();
  const captured = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const directory = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "gpuixui-align-",
        });
        const capture = (text: ReactElement, name: string) =>
          Effect.gen(function* () {
            runtime.render(<Surface>{frame(text)}</Surface>);
            const file = path.join(directory, `${name}.png`);
            runtime.renderer.captureScreenshot(file);
            return yield* fileSystem.readFile(file);
          });
        return {
          start: yield* capture(<Text align="start">Hello</Text>, "start"),
          end: yield* capture(<Text align="end">Hello</Text>, "end"),
          // The reference: the runtime's own value, with our mapping bypassed.
          right: yield* capture(
            <Text style={{ textAlign: "right" }}>Hello</Text>,
            "right",
          ),
        };
      }),
    ).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
    ),
  );
  expect(sameBytes(captured.end, captured.right)).toBe(true);
  expect(sameBytes(captured.end, captured.start)).toBe(false);
});
