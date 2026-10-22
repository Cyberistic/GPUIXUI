/**
 * Guards the stop rule the `dock-focus-lifecycle` probe measures.
 *
 * The probe asserts that a Tab traversal visits exactly `dockStops`, so the
 * list is part of the measurement rather than a note beside it: if it grew a
 * stop per tab, or if the closed sidebar lost the wrong action, the probe would
 * still be comparing the runtime against a fixture that no longer describes a
 * dock. The rule the probe teaches lives here: one rail stop, one pane field,
 * and a closed sidebar with only its guarded action's stop removed.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  DOCK_GUARDED_ACTION,
  DOCK_SIDEBAR_ACTIONS,
  DOCK_STATUS,
  DOCK_TABS,
  DOCK_TOGGLE,
  dockActionId,
  dockFieldId,
  dockRailId,
  dockStops,
  stepTab,
} from "./dock-focus.js";

/** Every sidebar state with every selected tab. */
const permutations: ReadonlyArray<{
  readonly sidebarOpen: boolean;
  readonly stops: ReadonlyArray<string>;
}> = Arr.flatMap([true, false], (sidebarOpen) =>
  Arr.map(DOCK_TABS, (tab) => ({
    sidebarOpen,
    stops: dockStops(sidebarOpen, tab),
  })),
);

describe("the dock-focus fixture", () => {
  it("carries one rail stop and one pane field, whichever tab is selected", () => {
    const stops = dockStops(true, "output");
    expect(Arr.contains(stops, dockRailId("output"))).toBe(true);
    expect(Arr.contains(stops, dockFieldId("output"))).toBe(true);
    expect(Arr.contains(stops, dockRailId("explorer"))).toBe(false);
    expect(Arr.contains(stops, dockFieldId("explorer"))).toBe(false);
  });

  it("drops only the guarded action's stop when the sidebar closes", () => {
    const open = dockStops(true, "explorer");
    const closed = dockStops(false, "explorer");
    expect(open).toHaveLength(1 + DOCK_SIDEBAR_ACTIONS.length + 3);
    expect(closed).toEqual(
      Arr.filter(open, (stop) => stop !== dockActionId(DOCK_GUARDED_ACTION)),
    );
    // The unguarded sample is what the runtime's behaviour is measured with.
    expect(closed).toContain(dockActionId("new"));
  });

  it("lists each stop once between the toggle and the status bar", () => {
    expect(Arr.map(permutations, ({ stops }) => Arr.dedupe(stops))).toEqual(
      Arr.map(permutations, ({ stops }) => stops),
    );
    expect(
      Arr.map(permutations, ({ stops }) => [Arr.head(stops), Arr.last(stops)]),
    ).toEqual(
      Arr.map(permutations, () => [
        Option.some(DOCK_TOGGLE),
        Option.some(DOCK_STATUS),
      ]),
    );
  });

  it("steps the rail in the direction it was asked for, wrapping at both ends", () => {
    expect(stepTab("output", 1)).toBe("problems");
    expect(stepTab("problems", 1)).toBe("explorer");
    expect(stepTab("explorer", 1)).toBe("output");
    expect(stepTab("explorer", -1)).toBe("problems");
    expect(stepTab("output", -1)).toBe("explorer");
  });
});
