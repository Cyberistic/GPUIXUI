/**
 * A skeleton contains itself in a row.
 *
 * The bug this guards (plan `384`): `skeletonStyle` gave every placeholder
 * `width: "100%"` and `flexShrink: 0`, so a default line beside a 40 px avatar
 * in a 220 px row painted `x 58…278` — 46 px outside the row, the width of the
 * whole parent rather than the space the row left. The same rule made a nested
 * auto-width column collapse its lines to zero. A percentage (or default)
 * width now shrinks to the space offered; a numeric width, and a circle whose
 * width is its height, keeps its size. The height is a floor, so a bounded
 * column cannot squash it.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Skeleton } from "../src/components/Skeleton.js";
import { Stack } from "../src/components/Stack.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, openWindow, testTheme } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

const right = (bounds: Bounds): number => bounds.x + bounds.width;

it("keeps a placeholder line inside the row it shares with an avatar", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" style={{ width: 220 }} gap="sm" testId="row">
        <Skeleton circle height={40} testId="avatar" />
        <Skeleton height={18} testId="line" />
      </Stack>
    </Surface>,
  );
  const row = boundsOf(runtime, "row");
  const avatar = boundsOf(runtime, "avatar");
  const line = boundsOf(runtime, "line");
  // The avatar keeps its square; the line takes exactly what the row leaves.
  expect(avatar.width).toBe(40);
  expect(avatar.height).toBe(40);
  expect(line.x).toBe(right(avatar) + testTheme.spacing.sm);
  expect(line.width).toBe(right(row) - line.x);
  expect(right(line)).toBeLessThanOrEqual(right(row));
});

it("keeps a placeholder's explicit height in an over-full column", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack
        direction="column"
        style={{ width: 220, height: 40 }}
        testId="column"
      >
        <Skeleton height={18} testId="a" />
        <Skeleton height={18} testId="b" />
        <Skeleton height={18} testId="c" />
      </Stack>
    </Surface>,
  );
  const column = boundsOf(runtime, "column");
  // The three rows are taller than the column; none may be squashed to fit.
  Arr.forEach(["a", "b", "c"], (id) => {
    const line = boundsOf(runtime, id);
    expect(line.height).toBe(18);
    expect(line.width).toBe(column.width);
  });
});

it("still fills a row when the placeholder is the only item", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Stack direction="row" style={{ width: 220 }} testId="row">
        <Skeleton height={18} testId="only" />
      </Stack>
    </Surface>,
  );
  const row = boundsOf(runtime, "row");
  const only = boundsOf(runtime, "only");
  expect(only.x).toBe(row.x);
  expect(only.width).toBe(row.width);
});
