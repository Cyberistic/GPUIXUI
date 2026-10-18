/**
 * A wrapping stack packs its lines at the cross-axis start.
 *
 * The bug this guards (plan `387`, measured first by the playground's plan
 * `341` §2): GPUix inherits CSS's `align-content: stretch` for a multi-line flex
 * container, so a **bounded** wrapping row spreads its leftover height between
 * its lines. A 200 px row of 30 px children put the third child — the first of
 * line two — at `y 103`, the middle of the box, instead of `36` (`30 + gap`).
 *
 * Every assertion is relative to the stack's own painted box: the host's
 * absolute frame is not stable enough to assert against (TODO.md, the live-suite
 * note), while the line offset is the layout rule itself.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Stack } from "../src/components/Stack.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const GAP = testTheme.spacing.sm;
const CHILD = { width: 40, height: 30 } as const;

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** Three children: two on the first line, the third starts line two. */
const wrappingRow = (testId: string, height?: number) => (
  <Stack
    direction="row"
    wrap
    gap="sm"
    style={{ width: 100, height }}
    testId={testId}
  >
    <Box tone="card" style={CHILD} testId={`${testId}-one`} />
    <Box tone="card" style={CHILD} testId={`${testId}-two`} />
    <Box tone="card" style={CHILD} testId={`${testId}-three`} />
  </Stack>
);

it("starts a bounded row's second line directly under the first", async () => {
  const runtime = await openWindow();
  runtime.render(<Surface>{wrappingRow("stack", 200)}</Surface>);
  const stack = boundsOf(runtime, "stack");
  const first = boundsOf(runtime, "stack-one");
  const third = boundsOf(runtime, "stack-three");
  expect(stack.height).toBe(200);
  expect(first.y - stack.y).toBe(0);
  // 36 after the fix; 103 when the runtime stretched the two line boxes.
  expect(third.y - stack.y).toBe(CHILD.height + GAP);
});

it("leaves an auto-height wrapping row's line offsets unchanged", async () => {
  const runtime = await openWindow();
  runtime.render(<Surface>{wrappingRow("auto")}</Surface>);
  const stack = boundsOf(runtime, "auto");
  const third = boundsOf(runtime, "auto-three");
  // Two lines plus one gap. This was already exact before the fix — the case
  // proves `alignContent` did not invent a height.
  expect(stack.height).toBe(CHILD.height * 2 + GAP);
  expect(third.y - stack.y).toBe(CHILD.height + GAP);
});

it("packs a wrapping column at the cross-axis start", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack
        direction="column"
        wrap
        gap="sm"
        style={{ width: 200, height: 20 }}
        testId="column"
      >
        <Box
          tone="card"
          style={{ width: 60, height: 20 }}
          testId="column-one"
        />
        <Box
          tone="card"
          style={{ width: 60, height: 20 }}
          testId="column-two"
        />
      </Stack>
    </Surface>,
  );
  const stack = boundsOf(runtime, "column");
  const second = boundsOf(runtime, "column-two");
  // 66 after the fix; 103 when the runtime stretched the two columns.
  expect(second.x - stack.x).toBe(60 + GAP);
});
