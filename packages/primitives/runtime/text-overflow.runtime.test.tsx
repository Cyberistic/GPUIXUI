/**
 * A text run contains itself in a row.
 *
 * The bug this guards (plan `383`): `Text` set no layout fact, so as a flex item
 * it kept CSS's automatic content floor and grew to its max-content width. A
 * sentence in a 220 px row painted 439 px wide — 231 px outside the row — and
 * pushed its 40 px sibling entirely out (measured: box `x 451…491`). The run now
 * sets `minWidth: 0`, so it shrinks and wraps at the width it is given. A column
 * is unchanged, and a `truncate` run gets the bounded width its ellipsis needs.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const SENTENCE =
  "A value that is long enough to overflow a narrow two-hundred pixel row";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const inside = (child: Bounds, parent: Bounds): boolean =>
  child.x >= parent.x && child.x + child.width <= parent.x + parent.width;

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
