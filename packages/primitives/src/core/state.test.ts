import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { initValueState, setValue, withValue } from "./state.js";

/**
 * Guards the controlled/uncontrolled contract.
 *
 * The bug this exists for is specific and common: a component that keeps its
 * own copy of a value the parent also owns. The parent re-renders, the copy
 * wins, and the field appears to revert what the user just typed. `withValue`
 * is the guard — an uncontrolled control must survive a parent re-render, and a
 * controlled one must follow the parent.
 *
 * Plan 324 added the other half: the mode is derived from **this render's**
 * `value`, so a parent that loads its value after mount (`value={data?.name}`)
 * takes over instead of being ignored forever.
 */

describe("initValueState", () => {
  it("is uncontrolled when no value is supplied", () => {
    const state = initValueState<string>(Option.none(), "draft");
    expect(state.mode).toBe("uncontrolled");
    expect(state.current).toBe("draft");
  });

  it("is controlled when a value is supplied, and shows it", () => {
    const state = initValueState(Option.some("from parent"), "default");
    expect(state.mode).toBe("controlled");
    expect(state.current).toBe("from parent");
  });
});

describe("setValue", () => {
  it("keeps an uncontrolled control's value in its own copy", () => {
    const { state, notify } = setValue(
      initValueState<string>(Option.none(), ""),
      "typed",
    );
    expect(state.internal).toBe("typed");
    expect(state.current).toBe("typed");
    expect(notify).toBe(true);
  });

  it("does not let a controlled control keep its own copy", () => {
    const { state } = setValue(
      initValueState(Option.some("parent"), "default"),
      "interaction",
    );
    expect(state.internal).toBe("default");
  });

  it("stays quiet when an interaction changes nothing", () => {
    const state = initValueState(Option.some("same"), "default");
    expect(setValue(state, "same").notify).toBe(false);
    expect(
      setValue(initValueState<string>(Option.none(), "same"), "same").notify,
    ).toBe(false);
  });
});

describe("withValue", () => {
  it("lets a controlled control follow its parent", () => {
    const state = initValueState(Option.some("first"), "default");
    const next = withValue(state, Option.some("second"));
    expect(next.current).toBe("second");
  });

  it("keeps an uncontrolled control's draft while no value is supplied", () => {
    const { state } = setValue(
      initValueState<string>(Option.none(), ""),
      "typed",
    );
    const next = withValue(state, Option.none());
    expect(next.mode).toBe("uncontrolled");
    expect(next.current).toBe("typed");
  });

  it("takes over when a value is supplied after mount", () => {
    // The bug guarded (plan 324): the mode was frozen at mount, so a parent that
    // loaded its value later (`value={data?.name}`) was ignored forever.
    const { state } = setValue(
      initValueState<string>(Option.none(), ""),
      "typed",
    );
    const next = withValue(state, Option.some("loaded"));
    expect(next.mode).toBe("controlled");
    expect(next.current).toBe("loaded");
    expect(next.internal).toBe("typed");
  });

  it("falls back to the uncontrolled draft when the value is removed", () => {
    const state = initValueState(Option.some("parent"), "default");
    const next = withValue(state, Option.none());
    expect(next.mode).toBe("uncontrolled");
    expect(next.current).toBe("default");
  });
});
