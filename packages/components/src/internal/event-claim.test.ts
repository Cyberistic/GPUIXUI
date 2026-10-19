/**
 * The event claim's lifetime, without a renderer.
 *
 * The bug these guard: a live window delivers a nested layer's handler and its
 * parent's for one event across a **microtask** (playground plan 558 measured
 * it). A claim cleared in a microtask was therefore gone before the parent ran,
 * so one Escape closed both a submenu and the dialog around it.
 */

import type { EventPayload } from "@gpuix/react";
import { afterEach, describe, expect, it } from "vitest";
import { claimEvent, isEventClaimed } from "./event-claim.js";

/** A syntactically complete Escape; only its fields matter across copies. */
const key = (): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  key: "escape",
});

/** One task boundary: a real second event is a new task. */
const nextTask = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

/** The claim is module state; each test starts as a new task. */
afterEach(nextTask);

describe("event claim", () => {
  it("keeps the claim across a microtask", async () => {
    claimEvent(key());
    // The live ordering plan 558 measured: the parent's payload copy arrives
    // after a microtask. A microtask reset made it a second, unclaimed event.
    await Promise.resolve();
    expect(isEventClaimed(key())).toBe(true);
  });

  it("lets a new event through after a task", async () => {
    claimEvent(key());
    await nextTask();
    expect(isEventClaimed(key())).toBe(false);
  });

  it("consumes a claim on the first reader", () => {
    claimEvent(key());
    expect(isEventClaimed(key())).toBe(true);
    expect(isEventClaimed(key())).toBe(false);
  });

  it("matches the event's fields, not the payload object", () => {
    claimEvent(key());
    expect(isEventClaimed({ ...key() })).toBe(true);
  });

  it("never confuses two events with different fields", () => {
    claimEvent(key());
    expect(isEventClaimed({ ...key(), key: "a" })).toBe(false);
  });
});
