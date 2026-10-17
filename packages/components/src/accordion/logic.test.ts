/**
 * Accordion open-state transitions.
 *
 * The bugs these guard: in single mode opening a second section left the first
 * open, so two panels showed at once; toggling the open section of a
 * `collapsible: false` accordion closed everything and left the form blank; and
 * multi-mode let the same section be added twice, so one toggle closed it while
 * the header still said it was open.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { initial, isOpen, toggle, type AccordionState } from "./logic.js";

const single = (collapsible: boolean, open?: string): AccordionState =>
  initial({ type: "single", collapsible, defaultValue: open });

const multiple = (open: ReadonlyArray<string> = []): AccordionState =>
  initial({ type: "multiple", defaultValue: open });

describe("initial", () => {
  it("starts closed when there is no default", () => {
    expect(single(false)).toEqual({
      type: "single",
      open: Option.none(),
      collapsible: false,
    });
  });

  it("opens the default section", () => {
    expect(isOpen(single(false, "billing"), "billing")).toBe(true);
    expect(isOpen(single(false, "billing"), "profile")).toBe(false);
  });

  it("accepts one section or a list for multiple mode", () => {
    expect(initial({ type: "multiple", defaultValue: "a" })).toEqual(
      multiple(["a"]),
    );
    expect(multiple(["a", "b"])).toEqual({
      type: "multiple",
      open: ["a", "b"],
    });
  });

  it("drops a repeated default section", () => {
    expect(initial({ type: "multiple", defaultValue: ["a", "a"] })).toEqual(
      multiple(["a"]),
    );
  });
});

describe("toggle in single mode", () => {
  it("opens a section", () => {
    expect(toggle(single(false), "a")).toEqual(single(false, "a"));
  });

  it("moves the open section instead of opening a second one", () => {
    const state = toggle(toggle(single(false), "a"), "b");
    expect(isOpen(state, "a")).toBe(false);
    expect(isOpen(state, "b")).toBe(true);
  });

  it("refuses to close the only open section when not collapsible", () => {
    const state = single(false, "a");
    expect(toggle(state, "a")).toEqual(state);
  });

  it("closes the open section when collapsible", () => {
    expect(toggle(single(true, "a"), "a")).toEqual(single(true));
  });

  it("opens the section again after closing it", () => {
    const closed = toggle(single(true, "a"), "a");
    expect(isOpen(toggle(closed, "a"), "a")).toBe(true);
  });
});

describe("toggle in multiple mode", () => {
  it("keeps sections opened in order", () => {
    const state = toggle(toggle(multiple(), "a"), "b");
    expect(state).toEqual(multiple(["a", "b"]));
  });

  it("removes a section that is already open", () => {
    expect(toggle(multiple(["a", "b"]), "a")).toEqual(multiple(["b"]));
  });

  it("never holds the same section twice", () => {
    const once = toggle(multiple(), "a");
    expect(toggle(once, "a")).toEqual(multiple());
  });

  it("leaves the other sections open", () => {
    const state = toggle(toggle(toggle(multiple(), "a"), "b"), "c");
    expect(toggle(state, "b")).toEqual(multiple(["a", "c"]));
  });
});
