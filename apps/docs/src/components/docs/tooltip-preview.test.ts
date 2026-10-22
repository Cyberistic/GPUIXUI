import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  closedTip,
  describeTip,
  tipAfter,
  tipTiming,
  type TipEvent,
  type TipState,
  type TipTiming,
} from "./tooltip-preview";

/**
 * The tooltip preview's clock.
 *
 * The preview teaches the tip's timing — the 0 ms provider delay, the 80 ms a
 * leaving pointer gets, the 300 ms reopen window and the immediate open on
 * focus — and a wrong number here would teach a behaviour the shipped component
 * does not have. The numbers are read out of the installed
 * `@gpuix/react/tooltip` source rather than trusted, and the machine is pinned
 * event by event, including the traversal a window measured as **not** running
 * the trigger's `onFocus`.
 */

const runtime = new URL(
  "../../../../../packages/primitives/node_modules/@gpuix/react/dist/components/tooltip.js",
  import.meta.url,
);

const tooltipSource = (): string => readFileSync(runtime, "utf8");

/** `slow`, so a scheduled open is distinguishable from an immediate one. */
const slow: TipTiming = { delay: 600, closeGrace: 80, skipDelay: 300 };

/** Run a list of events from the closed state. */
const run = (
  events: ReadonlyArray<TipEvent>,
  timing: TipTiming = slow,
): TipState =>
  events.reduce<TipState>(
    (state, event) => tipAfter(state, event, timing),
    closedTip,
  );

const opened = tipAfter(
  tipAfter(closedTip, { type: "enter" }, slow),
  { type: "elapsed" },
  slow,
);

describe("the tooltip preview", () => {
  it("reads the clock off the runtime's own tooltip", () => {
    const source = tooltipSource();
    const delay = /delayDuration = (\d+)/.exec(source)?.[1];
    const grace = /setTimeout\(close, (\d+)\)/.exec(source)?.[1];
    const skip = /skipDelayDuration = (\d+)/.exec(source)?.[1];

    expect([delay, grace, skip]).toEqual(["0", "80", "300"]);
    expect(tipTiming).toEqual({
      delay: Number(delay),
      closeGrace: Number(grace),
      skipDelay: Number(skip),
    });
    // The trigger's focus opens through `openImmediately`, not the delay.
    expect(source).toContain("onFocus: (event) => {");
    expect(source).toContain("context.openImmediately()");
  });

  it("opens at once at the provider's delay, and waits when one is set", () => {
    const immediate = tipAfter(closedTip, { type: "enter" }, tipTiming);
    expect(immediate).toEqual({
      open: false,
      held: false,
      timer: { after: 0, opens: true },
    });
    expect(tipAfter(immediate, { type: "elapsed" }, tipTiming).open).toBe(true);

    const delayed = tipAfter(closedTip, { type: "enter" }, slow);
    expect(delayed.timer).toEqual({ after: 600, opens: true });
    expect(tipAfter(delayed, { type: "elapsed" }, slow).open).toBe(true);
  });

  it("skips the delay when the pointer returns inside the reopen window", () => {
    const returned = tipAfter(
      closedTip,
      { type: "enter", recentlyClosed: true },
      slow,
    );

    expect(returned.timer).toEqual({ after: 0, opens: true });
  });

  it("gives a leaving pointer the grace, and the tip cancels it", () => {
    const leaving = tipAfter(opened, { type: "leave" }, slow);
    // The tip is still painted while the grace runs — the state a screenshot
    // cannot tell from an idle tip.
    expect(leaving).toEqual({
      open: true,
      held: false,
      timer: { after: 80, opens: false },
    });
    expect(describeTip(leaving, slow)).toContain("closes it in 80 ms");
    // Crossing the gap onto the tip cancels the close.
    expect(tipAfter(leaving, { type: "enter-tip" }, slow).timer).toBeNull();
    // Without the crossing, the grace ends and the tip goes.
    expect(tipAfter(leaving, { type: "elapsed" }, slow).open).toBe(false);
  });

  it("holds the tip shut after a press until the pointer leaves", () => {
    const pressed = tipAfter(opened, { type: "press" }, slow);
    expect(pressed).toEqual({ open: false, held: true, timer: null });
    expect(describeTip(pressed)).toContain("must leave");
    // Re-entering while the pointer never left opens nothing.
    expect(tipAfter(pressed, { type: "enter" }, slow)).toBe(pressed);
    expect(tipAfter(pressed, { type: "leave" }, slow).held).toBe(false);
  });

  it("opens on focus immediately, whatever the delay is", () => {
    expect(tipAfter(closedTip, { type: "focus" }, slow).open).toBe(true);
    expect(tipAfter(opened, { type: "blur" }, slow)).toEqual(closedTip);
  });

  it("leaves the tip alone when a traversal reaches the trigger", () => {
    // Measured in a window three times on 0.11.0: `Tab` moves the focus and the
    // tip stays closed, because the traversal does not run the trigger's
    // `onFocus`. A preview that opened here would teach a keyboard path the
    // shipped component does not have.
    expect(run([{ type: "traversal" }])).toEqual(closedTip);
    expect(run([{ type: "traversal" }, { type: "escape" }])).toEqual(closedTip);
  });

  it("words the state a reader can watch", () => {
    expect(describeTip(closedTip)).toBe("closed");
    expect(
      describeTip(tipAfter(closedTip, { type: "enter" }, slow), slow),
    ).toBe("opening in 600 ms");
    expect(describeTip(opened, slow)).toBe(
      "open — a press or Escape closes it",
    );
  });
});
