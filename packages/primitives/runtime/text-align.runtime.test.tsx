/**
 * Text alignment in a real window.
 *
 * Only a painted frame can prove the claim: the resolver hands the runtime a
 * string, and a string that is not in the host's grammar is silently ignored.
 * The frames are compared rather than decoded — a run aligned to the start and
 * the same run aligned to the end are **byte-identical** when the host ignores
 * the value, which is exactly the state this suite was written against.
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import { Box } from "../src/components/Box.js";
import { Text } from "../src/components/Text.js";
import type { TextAlign } from "../src/core/style.js";
import { Surface, openWindow } from "./fixture.js";
import type { Runtime } from "./harness.js";

/** Whether two captured frames are the same image, byte for byte. */
const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length &&
  Arr.every(
    Arr.range(0, left.length - 1),
    (index) => left[index] === right[index],
  );

/**
 * Capture one run in one alignment.
 *
 * The run sits in a 600-point box, so the element has a definite width and the
 * alignment has somewhere to move the glyphs.
 */
const frames = (
  runtime: Runtime,
): Effect.Effect<
  {
    readonly start: Uint8Array;
    readonly alsoStart: Uint8Array;
    readonly end: Uint8Array;
  },
  unknown
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "gpuixui-align-",
      });
      const capture = (align: TextAlign, file: string) =>
        Effect.gen(function* () {
          runtime.render(
            <Surface>
              <Box tone="background" padding="lg" style={{ width: 600 }}>
                <Text align={align} testId="run">
                  Aligned run
                </Text>
              </Box>
            </Surface>,
          );
          const target = path.join(directory, `${file}.png`);
          runtime.renderer.captureScreenshot(target);
          return yield* fileSystem.readFile(target);
        });
      return {
        start: yield* capture("start", "start"),
        alsoStart: yield* capture("start", "also-start"),
        end: yield* capture("end", "end"),
      };
    }),
  ).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

it("paints an end-aligned run at the end of its line, not the start", async () => {
  // The bug guarded: `align="end"` reached the host as `end`, a word the pinned
  // renderer does not parse (it reads `left`, `center` and `right`, and `start`
  // as left) — so a right-aligned caption painted exactly like a left-aligned
  // one, byte for byte, with nothing reported.
  const runtime = await openWindow();
  const captured = await Effect.runPromise(frames(runtime));
  // The control: two captures of the same alignment are byte-identical, so the
  // difference below is the alignment and not capture noise.
  expect(sameBytes(captured.alsoStart, captured.start)).toBe(true);
  expect(sameBytes(captured.end, captured.start)).toBe(false);
});
