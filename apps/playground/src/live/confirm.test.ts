/**
 * Holds the premise the `confirm-dialog-lifecycle` probe is read against.
 *
 * The bugs these catch: a confirm that is counted twice (the probe's
 * single-report check would pass a dialog that fired `onConfirm` per render), a
 * cancel that reports a confirm (the destructive action would run on the safe
 * path), and a locator that no longer names the shipped control (the window
 * probe would fail on a locator error instead of naming the contract that
 * moved).
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the repository's
 * own source, not a runtime path.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONFIRM_ACCEPT,
  CONFIRM_CANCEL,
  CONFIRM_OPENER,
  CONFIRM_READOUT,
  confirmFlow,
  confirmReadout,
  initialConfirmFlow,
  type ConfirmEvent,
  type ConfirmFlow,
} from "./confirm.js";

const shipped = readFileSync(
  new URL(
    "../../../../packages/components/src/confirm-dialog.tsx",
    import.meta.url,
  ),
  "utf8",
);

/** Replays `events` from a fresh flow. */
const replay = (events: ReadonlyArray<ConfirmEvent>): ConfirmFlow =>
  events.reduce(confirmFlow, initialConfirmFlow);

describe("the confirmation flow the probe records", () => {
  it("a confirm reports once and the caller closes the surface", () => {
    expect(replay(["open", "confirm"])).toEqual({
      open: false,
      opens: 1,
      confirms: 1,
      closes: 1,
    });
  });

  it("a cancel closes without reporting a confirm", () => {
    expect(confirmReadout(replay(["open", "cancel"]))).toBe(
      "open=false opens=1 confirms=0 closes=1",
    );
  });

  it("a second confirm is a second report, so the single-report check can fail", () => {
    // The negative control duplicates the call: if the reducer collapsed two
    // confirms into one, the probe's `confirms=1` would pass a real double-fire.
    expect(replay(["open", "confirm", "open", "confirm"]).confirms).toBe(2);
  });

  it("counts every open, so a reopen after a close is visible", () => {
    expect(replay(["open", "confirm", "open"])).toEqual({
      open: true,
      opens: 2,
      confirms: 1,
      closes: 1,
    });
  });

  it("names the shipped controls and the caller-owned close", () => {
    expect(shipped).toContain(`testId="${CONFIRM_CANCEL}"`);
    expect(shipped).toContain(`testId="${CONFIRM_ACCEPT}"`);
    // Cancel is the surface's initial focus: `Enter` on an untouched dialog
    // must take the safe path.
    expect(shipped).toContain(
      "initialFocus={() => cancel.current?.id ?? null}",
    );
    // Confirm only reports: a dialog that closed itself would lose a failed save.
    expect(shipped).toContain("onClick={onConfirm}");
  });

  it("addresses the fixture with ids no other probe owns", () => {
    expect([CONFIRM_OPENER, CONFIRM_READOUT]).toEqual([
      "confirm-open",
      "confirm-readout",
    ]);
  });
});
