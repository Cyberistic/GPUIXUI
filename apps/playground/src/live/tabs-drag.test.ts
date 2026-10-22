/**
 * Holds the rules a movable tab rests on.
 *
 * The bugs these guard: a drop that ignores which half of a tab the pointer is
 * over lands on the wrong side of it, a move that leaves the source's selection
 * pointing at the tab that just left mounts a panel for a tab the strip no
 * longer holds, and a step that wraps teleports a tab from one end to the
 * other. All three read as "the tab moved" in a screenshot, so they are pinned
 * here rather than inferred from the window probe.
 */
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  groupAt,
  groupOf,
  groupOrder,
  groupSelection,
  insertionIndex,
  moveTab,
  stepTab,
  TAB_GROUP_INITIAL,
  tabReadout,
  type GroupBox,
  type TabBox,
} from "./tabs-drag.js";

/** Two groups side by side, as the probe lays them out: 280 wide, 24 apart. */
const groups: ReadonlyArray<GroupBox> = [
  { group: "left", x: 28, y: 100, width: 280, height: 240 },
  { group: "right", x: 332, y: 100, width: 280, height: 240 },
];

/** The left strip's tabs, 60 wide from the group's own padding. */
const leftTabs: ReadonlyArray<TabBox> = [
  { tab: "alpha", x: 32, width: 60 },
  { tab: "bravo", x: 96, width: 60 },
  { tab: "charlie", x: 160, width: 60 },
];

describe("groupAt", () => {
  it("names the group whose painted box holds the point", () => {
    expect(groupAt({ x: 100, y: 200 }, groups)).toEqual(Option.some("left"));
    expect(groupAt({ x: 400, y: 200 }, groups)).toEqual(Option.some("right"));
  });

  it("reports a miss between the groups and outside both", () => {
    // 312 is the gap between left's right edge (308) and right's left (332).
    expect(groupAt({ x: 320, y: 200 }, groups)).toEqual(Option.none());
    expect(groupAt({ x: 100, y: 20 }, groups)).toEqual(Option.none());
    expect(groupAt({ x: 700, y: 200 }, groups)).toEqual(Option.none());
  });
});

describe("insertionIndex", () => {
  it("splits a tab at its centre", () => {
    expect(insertionIndex(leftTabs, 40)).toBe(0);
    expect(insertionIndex(leftTabs, 66)).toBe(1);
    expect(insertionIndex(leftTabs, 130)).toBe(2);
  });

  it("appends past the last centre instead of refusing the drop", () => {
    expect(insertionIndex(leftTabs, 400)).toBe(3);
    expect(insertionIndex([], 100)).toBe(0);
  });
});

describe("moveTab", () => {
  it("moves a tab into the other strip at the drop slot and selects it", () => {
    const next = moveTab(TAB_GROUP_INITIAL, "bravo", {
      group: "right",
      index: 0,
    });
    expect(next.left.tabs).toEqual(["alpha", "charlie"]);
    expect(next.right.tabs).toEqual(["bravo", "delta", "echo"]);
    expect(next.right.selected).toEqual(Option.some("bravo"));
  });

  it("selects the neighbour the moved tab leaves behind", () => {
    const next = moveTab(TAB_GROUP_INITIAL, "alpha", {
      group: "right",
      index: 2,
    });
    expect(next.left.selected).toEqual(Option.some("bravo"));
  });

  it("keeps the source's selection when another tab was moved", () => {
    const next = moveTab(TAB_GROUP_INITIAL, "charlie", {
      group: "right",
      index: 0,
    });
    expect(next.left.selected).toEqual(Option.some("alpha"));
  });

  it("empties a strip's selection when its last tab leaves", () => {
    const single = {
      left: { tabs: ["alpha"], selected: Option.some("alpha") },
      right: { tabs: ["delta"], selected: Option.some("delta") },
    };
    const next = moveTab(single, "alpha", { group: "right", index: 1 });
    expect(next.left.tabs).toEqual([]);
    expect(next.left.selected).toEqual(Option.none());
    expect(groupOrder(next, "left")).toBe("none");
    expect(groupSelection(next, "left")).toBe("none");
  });

  it("reorders inside one strip rather than duplicating the tab", () => {
    const next = moveTab(TAB_GROUP_INITIAL, "alpha", {
      group: "left",
      index: 2,
    });
    expect(next.left.tabs).toEqual(["bravo", "charlie", "alpha"]);
    expect(next.right.tabs).toEqual(["delta", "echo"]);
    expect(next.left.selected).toEqual(Option.some("alpha"));
  });

  it("leaves an unknown tab and an out-of-range slot sane", () => {
    expect(
      moveTab(TAB_GROUP_INITIAL, "nobody", { group: "right", index: 0 }),
    ).toEqual(TAB_GROUP_INITIAL);
    const next = moveTab(TAB_GROUP_INITIAL, "bravo", {
      group: "right",
      index: 99,
    });
    expect(next.right.tabs).toEqual(["delta", "echo", "bravo"]);
  });
});

describe("stepTab", () => {
  it("steps a tab one slot and selects it", () => {
    const next = stepTab(TAB_GROUP_INITIAL, "alpha", 1);
    expect(next.left.tabs).toEqual(["bravo", "alpha", "charlie"]);
    expect(next.left.selected).toEqual(Option.some("alpha"));
  });

  it("clamps at both ends instead of wrapping", () => {
    const left = stepTab(TAB_GROUP_INITIAL, "alpha", -1);
    expect(left.left.tabs).toEqual(TAB_GROUP_INITIAL.left.tabs);
    const right = stepTab(TAB_GROUP_INITIAL, "echo", 1);
    expect(right.right.tabs).toEqual(["delta", "echo"]);
  });

  it("reports the strip a tab lives in", () => {
    expect(groupOf(TAB_GROUP_INITIAL, "echo")).toEqual(Option.some("right"));
    expect(groupOf(TAB_GROUP_INITIAL, "nobody")).toEqual(Option.none());
  });
});

describe("tabReadout", () => {
  it("prints both orders and both selections from one layout", () => {
    expect(tabReadout(TAB_GROUP_INITIAL)).toBe(
      "left=alpha,bravo,charlie selected=alpha | right=delta,echo selected=delta",
    );
    const moved = moveTab(TAB_GROUP_INITIAL, "bravo", {
      group: "right",
      index: 0,
    });
    expect(tabReadout(moved)).toBe(
      "left=alpha,charlie selected=alpha | right=bravo,delta,echo selected=bravo",
    );
  });
});
