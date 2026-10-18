/**
 * The row-mask store behind `List`'s row-level subscriptions (plan 339).
 *
 * The bug these guard: the store notifying every subscriber on every replace
 * re-renders all 1,000 rows for a two-row change — the cost plan 338 measured.
 * The "notifies nobody" case fails against a notify-always implementation; the
 * "notifies once" cases fail if `replace` forgets to notify on a real change.
 */

import { describe, expect, it } from "vitest";
import { ACTIVE, createRowMasks, SELECTED, TABBABLE } from "./row-state.js";

/** Count the notifications one store sends while `run` executes. */
const counting = (store: ReturnType<typeof createRowMasks>) => {
  let calls = 0;
  store.subscribe(() => {
    calls += 1;
  });
  return () => calls;
};

describe("row masks", () => {
  it("reads 0 for an unregistered row", () => {
    const store = createRowMasks();

    expect(store.get("missing")).toBe(0);
  });

  it("stores the masks a list publishes", () => {
    const store = createRowMasks();

    store.replace([
      ["a", ACTIVE | TABBABLE],
      ["b", SELECTED],
    ]);

    expect(store.get("a")).toBe(ACTIVE | TABBABLE);
    expect(store.get("b")).toBe(SELECTED);
  });

  it("notifies nobody when the masks are identical", () => {
    const store = createRowMasks();
    const calls = counting(store);

    store.replace([
      ["a", ACTIVE],
      ["b", TABBABLE],
    ]);
    store.replace([
      ["a", ACTIVE],
      ["b", TABBABLE],
    ]);

    expect(calls()).toBe(1);
  });

  it("notifies once when a mask changes", () => {
    const store = createRowMasks();
    store.replace([
      ["a", ACTIVE],
      ["b", TABBABLE],
    ]);
    const calls = counting(store);

    store.replace([
      ["a", TABBABLE],
      ["b", ACTIVE],
    ]);

    expect(calls()).toBe(1);
  });

  it("drops the rows a shorter replace leaves out", () => {
    const store = createRowMasks();
    store.replace([
      ["a", ACTIVE],
      ["b", TABBABLE],
    ]);

    store.replace([["a", ACTIVE]]);

    expect(store.get("b")).toBe(0);
    expect(store.get("a")).toBe(ACTIVE);
  });

  it("still notifies when a row loses the last bit", () => {
    const store = createRowMasks();
    store.replace([["a", ACTIVE]]);
    const calls = counting(store);

    store.replace([["a", 0]]);

    expect(calls()).toBe(1);
    expect(store.get("a")).toBe(0);
  });

  it("stops notifying a removed subscriber", () => {
    const store = createRowMasks();
    let calls = 0;
    const remove = store.subscribe(() => {
      calls += 1;
    });

    remove();
    store.replace([["a", ACTIVE]]);

    expect(calls).toBe(0);
  });
});
