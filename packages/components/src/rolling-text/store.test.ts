/**
 * The rolling swap's clock, without a renderer.
 *
 * The bugs these guard: an exit window re-armed by every value that arrives
 * mid-exit, which pushed the swap back until the stream stopped and left the
 * clip empty; an entry that never settles, so the phase kept reporting a value
 * still arriving; and a window that outlives the component that started it.
 *
 * A window is real time here (a few milliseconds), so every case waits on the
 * state the window lands rather than on a frame.
 */

import { Option } from "effect";
import { describe, expect, it } from "vitest";
import { makeRollingStore } from "./store.js";

/** Let real time pass: the window is an Effect sleep on the default clock. */
const after = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const policy = { reduced: false, swapMs: 20 };

describe("RollingStore", () => {
  it("holds the outgoing value through the exit, then paints the pending one", async () => {
    const roll = makeRollingStore("first");
    try {
      roll.show("second", policy);
      expect(roll.read().shown).toBe("first");
      expect(roll.read().phase).toBe("leaving");

      await after(60);

      expect(roll.read().shown).toBe("second");
      expect(roll.read().phase).toBe("entering");
    } finally {
      roll.stop();
    }
  });

  it("lands on the newest value without re-arming the exit it arrived in", async () => {
    // The bug this guards: every arrival restarted the window, so a value
    // changing faster than one swap never committed and the clip stayed empty.
    const roll = makeRollingStore("v1");
    try {
      roll.show("v2", policy);
      await after(8);
      roll.show("v3", policy);
      await after(8);
      roll.show("v4", policy);

      // The first change's window has run by now, so a newer value is painted
      // even though the stream never stopped.
      await after(40);
      expect(roll.read().shown).toBe("v4");
      expect(roll.read().phase).toBe("entering");
    } finally {
      roll.stop();
    }
  });

  it("travels a value back when it returns mid-exit", () => {
    const roll = makeRollingStore("first");
    try {
      roll.show("second", policy);
      expect(roll.read().phase).toBe("leaving");

      roll.show("first", policy);

      expect(roll.read().phase).toBe("entering");
      expect(Option.isNone(roll.read().pending)).toBe(true);
    } finally {
      roll.stop();
    }
  });

  it("paints a reduced value at once, with no window", () => {
    const roll = makeRollingStore("first");
    try {
      roll.show("second", { ...policy, reduced: true });

      expect(roll.read().shown).toBe("second");
      expect(roll.read().phase).toBe("rest");
    } finally {
      roll.stop();
    }
  });

  it("settles the entry only once the runtime reports it landed", async () => {
    const roll = makeRollingStore("first");
    try {
      roll.show("second", policy);
      await after(60);
      expect(roll.read().phase).toBe("entering");

      roll.entered();

      expect(roll.read().phase).toBe("rest");
    } finally {
      roll.stop();
    }
  });

  it("stops the window when the component unmounts", async () => {
    const roll = makeRollingStore("first");
    roll.show("second", policy);
    roll.stop();

    await after(60);

    expect(roll.read().shown).toBe("first");
    expect(roll.read().phase).toBe("leaving");
  });

  it("does not publish a swap for the value already on screen", () => {
    const roll = makeRollingStore("first");
    try {
      const before = roll.read();
      roll.show("first", policy);
      expect(roll.read()).toBe(before);
    } finally {
      roll.stop();
    }
  });
});
