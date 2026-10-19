/**
 * A floating layer must follow the window size the host reports.
 *
 * **The bug guarded (plan `604`).** `Select` subscribes to the window size
 * (`useWindowSize`), but `Tooltip` read it in render and never re-rendered, so
 * a resize left the tip on the side chosen for the old window. Measured on the
 * release-tag build: a `side="bottom"` tip stayed at `y 241` over a trigger at
 * `y 212..236` after the host reported a 250-high window, and a 1 258 px
 * 60-word tip ignored a 300 px report entirely. The wrapper now polls only
 * while a tip is open and re-measures the painted tip when the size changes,
 * so a re-wrapped tip's height reaches the side decision too.
 *
 * **The harness limit.** The `TestRenderer` cannot resize its offscreen window
 * (there is no setter; measured), so each case injects the size the platform
 * reports — the same signal `useWindowSize` polls. The layer's own layout still
 * runs against the real window, so the assertions are about our decision (which
 * side, what cap), never about the runtime's clamp.
 *
 * **Plan `609`:** `Tooltip` slept while closed, but `Select` used the default
 * 100 ms observer for its whole mounted life — measured, a closed select asked
 * `getWindowSize` 4 times in 450 ms with nothing to place. The last case holds
 * the control to the same rule: no interval while closed, sampling while open.
 *
 * **Plan `645`:** the window is not the only placement input. A trigger that
 * moves while its layer is open keeps the side chosen for the old box: measured,
 * a `Tooltip` and a `Select` whose trigger moved from `y 712` to `y 12` painted
 * at `13…37`/`13…79`, over a trigger at `12…36`/`13…47`. Both wrappers now
 * sample the trigger on the same 100 ms cadence while open, and sleep closed.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Box } from "../src/components/Box.js";
import { Select } from "../src/components/Select.js";
import { Tooltip } from "../src/components/Tooltip.js";
import { FLOATING_FOLLOW_MS, FLOATING_MARGIN } from "../src/core/index.js";
import type { Bounds, Runtime } from "../src/testing/index.js";
import { Surface, WINDOW, openWindow, settleFocus, sleep } from "./fixture.js";

const LONG = Array.from({ length: 60 }, (_, index) => `word${index}`).join(" ");

/** Two 100 ms samples of the window observer, plus margin for its re-render. */
const WINDOW_SETTLE_MS = 250;

const boundsOf = (runtime: Runtime, testId: string): Bounds =>
  Option.getOrElse(runtime.paintBounds(testId), () =>
    expect.fail(`the runtime painted no box for ${testId}`),
  );

/** Report a new window size, as the platform's `getWindowSize` would. */
const reportWindow = (
  runtime: Runtime,
  size: { readonly width: number; readonly height: number },
): void => {
  runtime.renderer.getWindowSize = () => ({ ...size });
};

/** Let the observer sample, the wrapper re-place, and the frame repaint. */
const settleWindow = async (runtime: Runtime): Promise<void> => {
  await sleep(WINDOW_SETTLE_MS);
  runtime.flush();
  // A re-wrapped tip is measured in a layout effect, whose `setBox` schedules
  // the render that uses the new height (the side decision).
  await sleep(50);
  runtime.flush();
};

/** Let one follow tick measure, re-place and repaint (plan `645`). */
const settleFollow = async (runtime: Runtime): Promise<void> => {
  await sleep(FLOATING_FOLLOW_MS + 80);
  runtime.flush();
  await sleep(30);
  runtime.flush();
};

/** A trigger at a known distance from the top, in column flow. */
const belowSpacer = (height: number) => (
  <Box tone="background" style={{ height }} />
);

it("flips a bottom tooltip above when the host window shrinks", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      {belowSpacer(200)}
      <Tooltip content="A hint" side="bottom" testId="tip">
        <div testId="target" tabIndex={0} style={{ width: 120, height: 24 }} />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  const before = boundsOf(runtime, "tip");
  const target = boundsOf(runtime, "target");
  expect(before.y).toBeGreaterThanOrEqual(target.y + target.height - 1);

  reportWindow(runtime, { width: 600, height: 250 });
  await settleWindow(runtime);

  const after = boundsOf(runtime, "tip");
  // No room below in the reported window, so the tip must not stay there.
  expect(after.y + after.height).toBeLessThanOrEqual(target.y + 1);
});

it("caps a long tip to a narrower host window", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      <Tooltip content={LONG} testId="tip">
        <div testId="target" tabIndex={0} style={{ width: 120, height: 24 }} />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  const before = boundsOf(runtime, "tip");
  expect(before.width).toBeGreaterThan(1000);

  reportWindow(runtime, { width: 300, height: 800 });
  await settleWindow(runtime);

  const after = boundsOf(runtime, "tip");
  expect(after.width).toBeLessThanOrEqual(300 - 2 * FLOATING_MARGIN);
  expect(after.width).toBeLessThan(before.width);
});

it("moves a long tip below when a narrow window makes it too tall above", async () => {
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      {belowSpacer(80)}
      <Tooltip content={LONG} testId="tip">
        <div testId="target" tabIndex={0} style={{ width: 120, height: 24 }} />
      </Tooltip>
    </Surface>,
  );
  runtime.hover("target");
  const target = boundsOf(runtime, "target");
  const before = boundsOf(runtime, "tip");
  // At full width the tip fits above its trigger.
  expect(before.y + before.height).toBeLessThanOrEqual(target.y + 1);

  reportWindow(runtime, { width: 300, height: 800 });
  await settleWindow(runtime);

  // Re-wrapped, it is too tall for the room above; the side must flip.
  const after = boundsOf(runtime, "tip");
  expect(after.y).toBeGreaterThanOrEqual(target.y + target.height - 1);
});

it("moves a Select list above when the host window shrinks", async () => {
  // The control for the technique: `Select` already subscribes, so this case
  // passes before the tooltip fix and proves the injected signal is real.
  const runtime = await openWindow();
  runtime.render(
    <Surface>
      {belowSpacer(200)}
      <Select
        testId="sel"
        label="Fruit"
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  runtime.click("sel-trigger");
  runtime.flush();
  // Let the focus tracker publish its sample, so no unrelated re-render can
  // sample the new size for a wrapper that does not subscribe.
  await settleFocus();
  const target = boundsOf(runtime, "sel-trigger");
  const before = boundsOf(runtime, "sel-content");
  expect(before.y).toBeGreaterThanOrEqual(target.y + target.height - 1);

  reportWindow(runtime, { width: 600, height: 250 });
  await settleWindow(runtime);

  const after = boundsOf(runtime, "sel-content");
  expect(after.y + after.height).toBeLessThanOrEqual(target.y + 1);
});

it("a closed Select does not sample the window", async () => {
  const runtime = await openWindow();
  let calls = 0;
  const size = WINDOW;
  runtime.renderer.getWindowSize = () => {
    calls += 1;
    return { ...size };
  };
  runtime.render(
    <Surface>
      <Select
        testId="sel"
        label="Fruit"
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>,
  );
  // The state initialiser and the observer's immediate read: two reads at mount.
  expect(calls).toBe(2);

  const closedAt = calls;
  await sleep(WINDOW_SETTLE_MS + 100);
  expect(calls - closedAt).toBe(0);

  runtime.click("sel-trigger");
  runtime.flush();
  const openAt = calls;
  await sleep(WINDOW_SETTLE_MS + 100);
  expect(calls - openAt).toBeGreaterThanOrEqual(2);

  runtime.keyDown("sel-trigger", "escape");
  runtime.flush();
  await sleep(20);
  const reclosedAt = calls;
  await sleep(WINDOW_SETTLE_MS + 100);
  expect(calls - reclosedAt).toBe(0);
});

it("follows a Tooltip trigger that moves while the tip is open", async () => {
  const runtime = await openWindow();
  const view = (offset: number) => (
    <Surface>
      {belowSpacer(offset)}
      <Tooltip content="A hint" side="top" testId="tip">
        <div testId="target" tabIndex={0} style={{ width: 120, height: 24 }} />
      </Tooltip>
    </Surface>
  );
  runtime.render(view(700));
  runtime.hover("target");
  const firstTarget = boundsOf(runtime, "target");
  const firstTip = boundsOf(runtime, "tip");
  expect(firstTip.y + firstTip.height).toBeLessThanOrEqual(firstTarget.y + 1);

  // A layout change moves the trigger to the top edge, where a top-side tip has
  // no room. The runtime re-anchors the layer; the wrapper must re-decide the
  // side or the tip covers its own trigger (measured before the fix: 13…37 over
  // a trigger at 12…36).
  runtime.render(view(0));
  await settleFollow(runtime);
  const target = boundsOf(runtime, "target");
  const tip = boundsOf(runtime, "tip");
  expect(tip.y).toBeGreaterThanOrEqual(target.y + target.height - 1);
});

it("follows a Select trigger that moves while the list is open", async () => {
  const runtime = await openWindow();
  const view = (offset: number) => (
    <Surface>
      {belowSpacer(offset)}
      <Select
        testId="sel"
        label="Fruit"
        options={[
          { value: "apple", label: "Apple" },
          { value: "pear", label: "Pear" },
        ]}
      />
    </Surface>
  );
  runtime.render(view(700));
  runtime.click("sel-trigger");
  runtime.flush();
  const firstTarget = boundsOf(runtime, "sel-trigger");
  const firstList = boundsOf(runtime, "sel-content");
  expect(firstList.y + firstList.height).toBeLessThanOrEqual(firstTarget.y + 1);

  runtime.render(view(0));
  await settleFollow(runtime);
  const target = boundsOf(runtime, "sel-trigger");
  const list = boundsOf(runtime, "sel-content");
  // A list is never painted over its own trigger; at the top edge it opens below.
  expect(list.y).toBeGreaterThanOrEqual(target.y + target.height - 1);
});

it("samples a trigger only while its layer is open", async () => {
  const runtime = await openWindow();
  const read = runtime.renderer.getElementBounds.bind(runtime.renderer);
  let calls = 0;
  runtime.renderer.getElementBounds = (id) => {
    calls += 1;
    return read(id);
  };
  runtime.render(
    <Surface>
      <Tooltip content="A hint" testId="tip">
        <div testId="target" tabIndex={0} style={{ width: 120, height: 24 }} />
      </Tooltip>
    </Surface>,
  );
  // The closed wrapper still measures its root once, so a controlled tip can
  // open from code with a real trigger box (plan 347).
  expect(calls).toBeGreaterThan(0);
  const closedAt = calls;
  await sleep(2 * FLOATING_FOLLOW_MS + 100);
  expect(calls - closedAt).toBe(0);

  runtime.hover("target");
  await sleep(FLOATING_FOLLOW_MS + 80);
  runtime.flush();
  const openAt = calls;
  expect(openAt - closedAt).toBeGreaterThan(0);

  runtime.keyDown("target", "escape");
  runtime.flush();
  // The close itself may schedule one last measurement; take the baseline once
  // it has settled, then require a silent follow interval.
  await sleep(2 * FLOATING_FOLLOW_MS + 100);
  const reclosedAt = calls;
  await sleep(2 * FLOATING_FOLLOW_MS + 100);
  expect(calls - reclosedAt).toBe(0);
});
