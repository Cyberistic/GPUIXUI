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
import * as Option from "effect/Option";
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
