/**
 * The behaviour suites' wait helper.
 *
 * A component timer is real time. The bug this guards: a fixed sleep that is
 * barely longer than the delay, which passes or fails on how busy the machine
 * is — and a poller that keeps polling after the deadline, which would turn "it
 * never opened" into a pass.
 */

import { describe, expect, it, vi } from "vitest";
import { waitFor } from "./interaction.js";

describe("waitFor", () => {
  it("returns as soon as the check passes", async () => {
    const check = vi.fn();
    await waitFor(check);
    expect(check).toHaveBeenCalledTimes(1);
  });

  it("polls until a later attempt passes", async () => {
    let attempts = 0;
    const check = (): void => {
      attempts += 1;
      expect(attempts).toBeGreaterThan(1);
    };
    await waitFor(check);
    expect(attempts).toBe(2);
  });

  it("rethrows the check's own failure when the state never arrives", async () => {
    await expect(
      waitFor(() => expect("the panel").toBeUndefined(), 30),
    ).rejects.toThrow("expected 'the panel' to be undefined");
  });
});
