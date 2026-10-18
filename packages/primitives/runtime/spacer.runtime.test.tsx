/**
 * A fixed `Spacer` measures along the parent's main axis, not as a square.
 *
 * The bug this guards (plan `382`): the fixed form set `width` *and* `height`,
 * so a 48 px horizontal gap also made its caption row 48 px tall — 32 px of
 * invisible vertical space from a horizontal spacer (measured: row `h 48` for a
 * `16` px caption line). It now uses `flexBasis`, which is the main-axis size in
 * both directions, so the row keeps its text height and the column gap still
 * works.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Spacer } from "../src/components/Separator.js";
import { Stack } from "../src/components/Stack.js";
import { Text } from "../src/components/Text.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

/** The largest spacing step — tall enough to expose a square spacer. */
const STEP = testTheme.spacing["4xl"];

/** The caption line: the height a row of captions must keep. */
const LINE = testTheme.typography.caption.lineHeight;

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** Two captions with a spacer between them. */
const captions = ({ flexible = false }: { readonly flexible?: boolean }) => (
  <>
    <Text testId="a" role="caption">
      Read-only
    </Text>
    {flexible ? <Spacer testId="gap" /> : <Spacer size="4xl" testId="gap" />}
    <Text testId="b" role="caption">
      Reset all
    </Text>
  </>
);

it("separates a row by the step without making it taller than its text", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" align="center" testId="row">
        {captions({})}
      </Stack>
    </Surface>,
  );
  const a = boundsOf(runtime, "a");
  const b = boundsOf(runtime, "b");
  const gap = boundsOf(runtime, "gap");
  expect(b.x - (a.x + a.width)).toBe(STEP);
  // The row is its text's height, and the spacer's own box is that line — not a
  // 48 px square.
  expect(boundsOf(runtime, "row").height).toBe(LINE);
  expect(gap.width).toBe(STEP);
});

it("separates a column by the step", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="column" testId="column">
        {captions({})}
      </Stack>
    </Surface>,
  );
  const a = boundsOf(runtime, "a");
  const b = boundsOf(runtime, "b");
  expect(b.y - (a.y + a.height)).toBe(STEP);
});

it("lets a caller's flexBasis win over the step", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" testId="row">
        <Text testId="a" role="caption">
          Read-only
        </Text>
        <Spacer size="4xl" testId="gap" style={{ flexBasis: 40 }} />
        <Text testId="b" role="caption">
          Reset all
        </Text>
      </Stack>
    </Surface>,
  );
  const a = boundsOf(runtime, "a");
  const b = boundsOf(runtime, "b");
  expect(b.x - (a.x + a.width)).toBe(40);
});

it("still grows a flexible spacer to the far edge", async () => {
  // The other branch of the resolver: no `size` means "fill what is left", and
  // the fixed-form change must not touch it.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" testId="row">
        {captions({ flexible: true })}
      </Stack>
    </Surface>,
  );
  const row = boundsOf(runtime, "row");
  const b = boundsOf(runtime, "b");
  expect(b.x + b.width).toBe(row.x + row.width);
});
