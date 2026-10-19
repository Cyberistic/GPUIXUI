/**
 * The box model the runtime reports, pinned against the box it paints and hits.
 *
 * Published `0.10.0` reports a **content origin** for a plain `div` — a 100 × 36
 * element at (12, 12) with `padding: 10` and `borderWidth: 1` reports
 * `{ x: 23, y: 23, width: 98, height: 34 }` — while a real pointer hits all
 * 100 px starting at (12, 12). `paintBounds` is the correction the geometry
 * suites opt into; this file pins it against the authored box and the hit box,
 * so a runtime change to the model fails here by name instead of re-baselining
 * thirty assertions (plan `597`).
 *
 * The report is **not** one model: a `Button` reports its border box (measured
 * below), which is why the correction is opt-in per call site and never applied
 * by `bounds`.
 */

import { expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { StyleDesc } from "@gpuix/react";
import { Button } from "../src/components/Button.js";
import { Text } from "../src/components/Text.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { openWindow, SURFACE, Surface } from "./fixture.js";

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime reported no box for ${testId}`),
  );

const paintBoundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.paintBounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** The x coordinates a real click lands on, scanned across one row. */
const hitRange = (
  runtime: Runtime,
  box: Bounds,
  hits: { count: number },
  y: number,
): ReadonlyArray<number> =>
  Arr.filter(Arr.range(box.x - 8, box.x + box.width + 8), (x) => {
    const before = hits.count;
    runtime.clickAt(x, y);
    return hits.count > before;
  });

interface Probe {
  readonly runtime: Runtime;
  readonly hits: { count: number };
  readonly box: Bounds;
}

const mountProbe = async (style: StyleDesc): Promise<Probe> => {
  const runtime = await openWindow();
  const hits = { count: 0 };
  runtime.render(
    <Surface>
      <div
        testId="target"
        onClick={() => {
          hits.count += 1;
        }}
        style={{ display: "flex", ...style }}
      >
        <Text>Probe</Text>
      </div>
    </Surface>,
  );
  return { runtime, hits, box: paintBoundsOf(runtime, "target") };
};

it("reports a plain div from its content origin, and paints its border box", async () => {
  const { box, runtime, hits } = await mountProbe({
    width: 100,
    height: 36,
    padding: 10,
    borderWidth: 1,
  });
  // The surface's own report is its content origin, which is where its first
  // child's border box starts.
  const origin = boundsOf(runtime, SURFACE);
  // The report is the content origin: 1 px border + 10 px padding in.
  expect(boundsOf(runtime, "target")).toStrictEqual({
    ...origin,
    x: origin.x + 11,
    y: origin.y + 11,
    width: 98,
    height: 34,
  });
  expect(box).toStrictEqual({ ...origin, width: 100, height: 36 });
  // The pointer proves the painted box is the real hit box: all 100 px across
  // the middle row land on the element, and the pixels outside it do not.
  expect(hitRange(runtime, box, hits, box.y + box.height / 2)).toStrictEqual(
    Arr.range(box.x, box.x + 99),
  );
});

it("corrects each side from its own longhand", async () => {
  const { box, runtime } = await mountProbe({
    width: 100,
    height: 36,
    paddingTop: 4,
    paddingRight: 6,
    paddingBottom: 2,
    paddingLeft: 8,
    borderTopWidth: 2,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 3,
  });
  const origin = boundsOf(runtime, SURFACE);
  expect(box).toStrictEqual({ ...origin, width: 100, height: 36 });
  // 11 px of border + padding in on the left, 6 on the top.
  expect(boundsOf(runtime, "target").x).toBe(origin.x + 11);
  expect(boundsOf(runtime, "target").y).toBe(origin.y + 6);
});

it("leaves a Button's border-box report alone: the correction is opt-in", async () => {
  // Measured: a 36-high Button with 8/16 padding reports 36, not 20. Its
  // content is centred, so no consumer of its box needs the content origin;
  // applying `paintBounds` there would subtract padding that is already out.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Button testId="b">Save</Button>
    </Surface>,
  );
  const raw = boundsOf(runtime, "b");
  expect(raw.height).toBe(36);
  expect(raw.x).toBe(boundsOf(runtime, SURFACE).x);
  // `paintBounds` would move the origin 16 px left and read a height of 36; it
  // is not a correction for this host.
});
