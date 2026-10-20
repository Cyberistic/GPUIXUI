/**
 * A text run contains itself in a row, and keeps the end it is asked to keep.
 *
 * **Containment (plan `383`).** `Text` set no layout fact, so as a flex item it
 * kept CSS's automatic content floor and grew to its max-content width. A
 * sentence in a 220 px row painted 439 px wide — 231 px outside the row — and
 * pushed its 40 px sibling entirely out (measured: box `x 451…491`). The run now
 * sets `minWidth: 0`, so it shrinks and wraps at the width it is given. A column
 * is unchanged, and a `truncate` run gets the bounded width its ellipsis needs.
 *
 * **Which end (plan `783`).** The runtime's `StyleDesc.textOverflow` has two
 * values — `"ellipsis"` (clip the tail) and `"ellipsis-start"` (keep the tail) —
 * but `Text` exposed only a boolean and always sent the first, so a path whose
 * meaning is its filename could not show it. The frame is the only witness: the
 * runtime reports the authored `textOverflow` either way, so a style-record read
 * cannot say whether the glyphs moved. The captures below compare the public
 * `truncate="start"` against the runtime's own `ellipsis-start` value (with our
 * mapping bypassed) and against the shipped tail form.
 */

import { Effect } from "effect";
import * as Arr from "effect/Array";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import type { ReactElement } from "react";
import { expect, it } from "vitest";
import { Box } from "../src/components/Box.js";
import { Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const SENTENCE =
  "A value that is long enough to overflow a narrow two-hundred pixel row";

/** A value whose distinguishing part is at its end. */
const PATH =
  "workspaces/primitives/packages/primitives/src/components/Button.tsx";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const inside = (child: Bounds, parent: Bounds): boolean =>
  child.x >= parent.x && child.x + child.width <= parent.x + parent.width;

/** Whether two captured frames are the same image, byte for byte. */
const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length &&
  Arr.every(
    Arr.range(0, left.length - 1),
    (index) => left[index] === right[index],
  );

it("wraps a long sentence inside a bounded row", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" style={{ width: 220 }} testId="row">
        <Text testId="text" role="body">
          {SENTENCE}
        </Text>
        <Box tone="card" style={{ width: 40, height: 20 }} testId="icon" />
      </Stack>
    </Surface>,
  );
  const row = boundsOf(runtime, "row");
  const text = boundsOf(runtime, "text");
  const icon = boundsOf(runtime, "icon");
  expect(inside(text, row)).toBe(true);
  expect(inside(icon, row)).toBe(true);
  // Wrapped, not clipped: the run is taller than one line.
  expect(text.height).toBeGreaterThan(testTheme.typography.body.lineHeight);
});

it("leaves a column's text at the column's width", async () => {
  // The property is on the cross axis here, so it must be inert.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" testId="column">
        <Text testId="text" role="body">
          Short copy
        </Text>
      </Stack>
    </Surface>,
  );
  const column = boundsOf(runtime, "column");
  const text = boundsOf(runtime, "text");
  expect(text.x).toBe(column.x);
  expect(text.width).toBe(column.width);
  expect(text.height).toBe(testTheme.typography.body.lineHeight);
});

it("truncates a one-line run against the row's width", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" style={{ width: 220 }} testId="row">
        <Text testId="text" role="body" truncate>
          {SENTENCE}
        </Text>
        <Box tone="card" style={{ width: 40, height: 20 }} testId="icon" />
      </Stack>
    </Surface>,
  );
  const row = boundsOf(runtime, "row");
  const text = boundsOf(runtime, "text");
  const icon = boundsOf(runtime, "icon");
  // The width the row leaves beside the box — not the sentence's max-content
  // width — and the row's own single-line height (the wrapped run in case 1 is
  // three lines tall).
  expect(text.width).toBe(row.width - 40);
  expect(text.height).toBe(row.height);
  expect(inside(icon, row)).toBe(true);
});

it("keeps the end it is asked to keep, against the runtime's own value", async () => {
  const runtime = await openWindow();
  const captured = await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const directory = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "gpuixui-ellipsis-",
        });
        const capture = (text: ReactElement, name: string) =>
          Effect.gen(function* () {
            runtime.render(
              <Surface>
                <Stack direction="row" style={{ width: 180 }}>
                  {text}
                </Stack>
              </Surface>,
            );
            const file = path.join(directory, `${name}.png`);
            runtime.renderer.captureScreenshot(file);
            return yield* fileSystem.readFile(file);
          });
        return {
          start: yield* capture(<Text truncate="start">{PATH}</Text>, "start"),
          end: yield* capture(<Text truncate>{PATH}</Text>, "end"),
          // The reference: the runtime's own value, with our mapping bypassed.
          manual: yield* capture(
            <Text
              style={{ whiteSpace: "nowrap", textOverflow: "ellipsis-start" }}
            >
              {PATH}
            </Text>,
            "manual",
          ),
          plain: yield* capture(<Text>{PATH}</Text>, "plain"),
          // A run that fits has nothing to ellipsize, so the style is inert.
          shortStart: yield* capture(
            <Text truncate="start">Button.tsx</Text>,
            "short-start",
          ),
          shortPlain: yield* capture(<Text>Button.tsx</Text>, "short-plain"),
        };
      }),
    ).pipe(
      Effect.provide(NodeFileSystem.layer),
      Effect.provide(NodePath.layer),
    ),
  );
  expect(sameBytes(captured.start, captured.manual)).toBe(true);
  expect(sameBytes(captured.start, captured.end)).toBe(false);
  expect(sameBytes(captured.end, captured.plain)).toBe(false);
  expect(sameBytes(captured.shortStart, captured.shortPlain)).toBe(true);
});

it("keeps a leading run on one line inside its row", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" style={{ width: 180 }} testId="row">
        <Text testId="start" truncate="start">
          {PATH}
        </Text>
      </Stack>
    </Surface>,
  );
  // A plain run in the same bounded row wraps, so a one-line height can only
  // come from the truncation.
  const start = boundsOf(runtime, "start");
  const rowBounds = boundsOf(runtime, "row");
  expect(start.height).toBe(testTheme.typography.body.lineHeight);
  expect(start.x).toBeGreaterThanOrEqual(rowBounds.x);
  expect(start.x + start.width).toBeLessThanOrEqual(
    rowBounds.x + rowBounds.width,
  );
});
