/**
 * The per-row store: snapshot identity is the contract.
 *
 * The bug these guard: a store that hands back a fresh object on every read
 * re-renders every row on any selection change — the exact cost the store
 * exists to remove. The identity assertions fail without the per-value cache.
 */

import * as Option from "effect/Option";
import { describe, expect, it, vi } from "vitest";
import { makeRowStore, type ListSelection } from "./store.js";

/** A selection where `value` is the active row, the tab stop and the choice. */
const only = (value: string): ListSelection => ({
  active: Option.some(value),
  selected: [value],
  tabbable: Option.some(value),
});

describe("makeRowStore", () => {
  it("keeps a row's snapshot identical while its state is unchanged", () => {
    const store = makeRowStore();
    store.write(only("a"));
    const first = store.read("a");
    const untouched = store.read("b");

    store.write(only("a"));

    expect(store.read("a")).toBe(first);
    expect(store.read("b")).toBe(untouched);
  });

  it("replaces only the snapshots whose state moved", () => {
    const store = makeRowStore();
    store.write(only("a"));
    const before = store.read("a");

    store.write(only("b"));

    expect(store.read("a")).not.toBe(before);
    expect(store.read("a")).toEqual({
      active: false,
      selected: false,
      tabbable: false,
    });
    expect(store.read("b")).toEqual({
      active: true,
      selected: true,
      tabbable: true,
    });
  });

  it("notifies a listener until it unsubscribes", () => {
    const store = makeRowStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.write(only("a"));
    unsubscribe();
    store.write(only("b"));

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
