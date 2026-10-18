/**
 * A long tooltip beside its trigger must stay on its side.
 *
 * **The bug guarded (plan `393`).** `tipWidthCap` returned only the window cap
 * for a `left`/`right` tip, although the trigger's edge is where that layer
 * ends. Measured on this host: a 60-word `side="left"` tip on a trigger at
 * `x 992..1112` painted `x 15..1277` — 1 262 px wide where its side offered
 * `992 − 8 = 984` — so it covered the trigger. The same happened on the right:
 * 1 262 px where the side offered 1 140.
 *
 * These cases assert the cap **reaches the paint**, using the trigger box the
 * runtime reports rather than a magic position. They deliberately do not assert
 * an absolute tip edge: this host's binding is plan `529`'s unpublished artifact,
 * whose tooltip placement is ~7 px off (the same reason `fields.runtime`'s
 * absolute placement cases fail here). The exact side arithmetic is pinned in
 * `src/core/floating.test.ts`.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import type { ReactNode } from "react";
import { Box } from "../src/components/Box.js";
import { Tooltip, tooltipHeight } from "../src/components/Tooltip.js";
import { FLOATING_MARGIN } from "../src/core/index.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, WINDOW, openWindow, testTheme } from "./fixture.js";

const LONG = Array.from({ length: 60 }, (_, index) => `word${index}`).join(" ");

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.bounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** Mount a row of `width` px that puts the trigger at its far end. */
const mountAtEnd = async (width: number): Promise<Runtime> => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box
        tone="background"
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          width,
        }}
      >
        <Tooltip content={LONG} side="left" testId="tip">
          <div
            testId="target"
            tabIndex={0}
            style={{ width: 120, height: 24 }}
          />
        </Tooltip>
      </Box>
    </Surface>,
  );
  runtime.hover("target");
  return runtime;
};

it("caps a left-side tip at the room before its trigger", async () => {
  const runtime = await mountAtEnd(1100);
  const tip = boundsOf(runtime, "tip");
  const target = boundsOf(runtime, "target");
  // The old rule painted 1 262 px here; the room is target.x - margin.
  expect(tip.width).toBeLessThanOrEqual(target.x - FLOATING_MARGIN);
});

it("caps a right-side tip at the room after its trigger", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={LONG} side="right" testId="tip">
        <div testId="target" tabIndex={0} style={{ width: 120, height: 24 }} />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  const tip = boundsOf(runtime, "tip");
  const target = boundsOf(runtime, "target");
  expect(tip.width).toBeLessThanOrEqual(
    WINDOW.width - FLOATING_MARGIN - (target.x + target.width),
  );
});

it("leaves a short tip at its natural width", async () => {
  // The other direction: the cap must not squeeze content that already fits.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Box
        tone="background"
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          width: 1100,
        }}
      >
        <Tooltip content="A hint" side="left" testId="tip">
          <div
            testId="target"
            tabIndex={0}
            style={{ width: 120, height: 24 }}
          />
        </Tooltip>
      </Box>
    </Surface>,
  );
  runtime.hover("target");
  const tip = boundsOf(runtime, "tip");
  expect(tip.width).toBeGreaterThan(0);
  expect(tip.width).toBeLessThan(100);
  // It fits on one line: a cap narrower than its text would wrap it. (The
  // host's border model reports the painted tip 2 px taller than the estimate.)
  expect(tip.height).toBeLessThan(tooltipHeight(testTheme) + 6);
});

it("widens the tip when the trigger moves right", async () => {
  // The room is a property of the trigger, not the window: of two triggers in
  // the same row, the right-hand one has 120 px more room on its left, so its
  // tip is 120 px wider. The difference is robust to the artifact's constant
  // placement skew.
  const runtime = await openWindow();
  const trigger = (testId: string): ReactNode => (
    <Tooltip content={LONG} side="left" testId={`${testId}-tip`}>
      <div testId={testId} tabIndex={0} style={{ width: 120, height: 24 }} />
    </Tooltip>
  );
  runtime.render(
    <Surface>
      <Box
        tone="background"
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          width: 1100,
        }}
      >
        {trigger("left")}
        {trigger("right")}
      </Box>
    </Surface>,
  );
  runtime.hover("left");
  const leftTip = boundsOf(runtime, "left-tip").width;
  runtime.hover("right");
  const rightTip = boundsOf(runtime, "right-tip").width;
  expect(rightTip).toBeGreaterThan(leftTip);
  expect(Math.abs(rightTip - leftTip - 120)).toBeLessThanOrEqual(2);
});
