/**
 * The focus wait itself, in the real runtime.
 *
 * **The bug guarded (plan `691`).** The fixture used to offer a fixed 120 ms
 * sleep (`2 × 50 ms` tracker intervals + 20 ms), while the tracker publishes a
 * sample and React paints a render after it. Under load the sleep elapsed
 * first: two of three full runtime runs failed 2–3 ring cases (zero rings in
 * the frame) although the same files pass scoped. This file proves the race
 * deterministically — a renderer that reports the focused id six polls late
 * paints no ring at the old wait — and that `awaitFrame` waits for the paint
 * without turning a missing paint into a pass. The old wait is written as the
 * literal `sleep(120)` it was, and plan `693` removed it from the fixture.
 *
 * The delay is counted in tracker polls, not wall-clock time, so the case is
 * deterministic and measures the interval it is about.
 */

import { expect, it } from "vitest";
import * as Option from "effect/Option";
import { Input } from "../src/components/Input.js";
import { isFocusRing, type Runtime } from "../src/testing/index.js";
import { Surface, awaitFrame, openWindow, sleep } from "./fixture.js";

/** Whether the input paints a focus ring (the resting recipe shadow is not one). */
const ringed = (runtime: Runtime): boolean =>
  Option.exists(runtime.element("c"), (element) =>
    isFocusRing(element.style.boxShadow),
  );

/**
 * Make the renderer report no focused element for the first `polls` calls.
 *
 * `NativeFocusProvider` captures the renderer object and calls this method on
 * every tick, so an own property on the instance delays the sample without
 * touching the component (plan `590`).
 */
const delayFocusReport = (runtime: Runtime, polls: number): void => {
  const original = runtime.renderer.getFocusedElementId.bind(runtime.renderer);
  let remaining = polls;
  Object.defineProperty(runtime.renderer, "getFocusedElementId", {
    configurable: true,
    value: () => {
      if (remaining > 0) {
        remaining -= 1;
        return undefined;
      }
      return original();
    },
  });
};

it("waits for a ring the tracker reports late", async () => {
  const runtime = await openWindow();
  // The mount read and the five ticks after `focusNext` report nothing; the
  // seventh names the input. That is ~300 ms, past the 120 ms old wait.
  delayFocusReport(runtime, 6);
  runtime.render(
    <Surface>
      <Input testId="c" label="Name" />
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  // The fixed 120 ms wait this file exists to indict (plans `691`, `693`).
  await sleep(120);
  // The failing direction: the fixed wait asserted here, before the sample.
  expect(ringed(runtime)).toBe(false);
  await awaitFrame(() => ringed(runtime), "the late focus ring");
  expect(ringed(runtime)).toBe(true);
});

it("still fails when the ring never paints", async () => {
  const runtime = await openWindow();
  delayFocusReport(runtime, Number.POSITIVE_INFINITY);
  runtime.render(
    <Surface>
      <Input testId="c" label="Name" />
    </Surface>,
  );
  runtime.focusNext();
  runtime.flush();
  await expect(
    awaitFrame(() => ringed(runtime), "the never-arriving ring", 150),
  ).rejects.toThrow(
    "timed out after 150 ms waiting for the never-arriving ring",
  );
});
