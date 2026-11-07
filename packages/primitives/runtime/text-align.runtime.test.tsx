import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import { Box } from "../src/components/Box.js";
import { Text } from "../src/components/Text.js";
import type { TextAlign } from "../src/core/style.js";
import { Surface, openWindow } from "./fixture.js";
import type { Runtime } from "./harness.js";

const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length &&
  Arr.every(
    Arr.range(0, left.length - 1),
    (index) => left[index] === right[index],
  );

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
  const runtime = await openWindow();
  const captured = await Effect.runPromise(frames(runtime));

  expect(sameBytes(captured.alsoStart, captured.start)).toBe(true);
  expect(sameBytes(captured.end, captured.start)).toBe(false);
});
