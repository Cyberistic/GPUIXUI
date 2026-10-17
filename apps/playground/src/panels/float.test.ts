/**
 * The pure half of `float-tab` (plan `194`).
 *
 * Bugs guarded:
 * - tearing off a tab that is not in the dock must not disturb the dock;
 * - a second tear-off must append to the open window instead of moving it to
 *   the pointer;
 * - a dragged window must stay inside the app surface on both axes;
 * - docking must move exactly one tab, prune an empty window, and lose nothing
 *   when the target group does not exist;
 * - a saved workspace must round-trip the dock and the float position, and
 *   refuse a corrupt payload instead of throwing.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { describeDock, type DockNode } from "./dock.js";
import {
  FLOAT_HEIGHT,
  FLOAT_WIDTH,
  clampFloat,
  decodeWorkspace,
  dockFloat,
  encodeWorkspace,
  tearOff,
  type FloatWindow,
} from "./float.js";

const dock = (): DockNode => ({
  kind: "group",
  id: "main",
  title: "Main panel",
  tabs: [
    { id: "alpha", title: "Alpha" },
    { id: "beta", title: "Beta" },
  ],
  active: "alpha",
});

const app = { width: 900, height: 480 };

const windowAt = (x: number, y: number): FloatWindow => ({
  id: "float-1",
  title: "Floating panel",
  tabs: [{ id: "alpha", title: "Alpha" }],
  active: "alpha",
  x,
  y,
  width: FLOAT_WIDTH,
  height: FLOAT_HEIGHT,
});

describe("tearOff", () => {
  it("moves the tab out of the dock and activates its neighbour", () => {
    const torn = tearOff(dock(), Option.none(), "alpha", { x: 40, y: 60 }, app);

    expect(Option.isSome(torn)).toBe(true);
    const result = Option.getOrElse(torn, () => {
      throw new Error("expected a tear-off");
    });
    expect(describeDock(result.dock)).toBe("main=beta@beta");
    expect(result.float.tabs.map((tab) => tab.id)).toEqual(["alpha"]);
    expect(result.float.active).toBe("alpha");
    expect(result.float.x).toBe(40);
    expect(result.float.y).toBe(60);
  });

  it("leaves the dock untouched for a tab it does not hold", () => {
    const before = describeDock(dock());
    const torn = tearOff(dock(), Option.none(), "ghost", { x: 0, y: 0 }, app);

    expect(Option.isNone(torn)).toBe(true);
    expect(describeDock(dock())).toBe(before);
  });

  it("appends a second tab without moving the open window", () => {
    const first = tearOff(
      dock(),
      Option.none(),
      "alpha",
      { x: 120, y: 140 },
      app,
    );
    const opened = Option.getOrElse(first, () => {
      throw new Error("expected a tear-off");
    });
    const second = tearOff(
      opened.dock,
      Option.some(opened.float),
      "beta",
      { x: 800, y: 460 },
      app,
    );
    const appended = Option.getOrElse(second, () => {
      throw new Error("expected a second tear-off");
    });

    expect(appended.float.tabs.map((tab) => tab.id)).toEqual(["alpha", "beta"]);
    expect(appended.float.active).toBe("beta");
    expect(appended.float.x).toBe(120);
    expect(appended.float.y).toBe(140);
    expect(appended.dock.kind).toBe("group");
    expect(describeDock(appended.dock)).toBe("dock-empty=@");
  });
});

describe("clampFloat", () => {
  it("pins each axis to the app's far edge", () => {
    const clamped = clampFloat(app, windowAt(850, 460));

    expect(clamped.x).toBe(app.width - FLOAT_WIDTH);
    expect(clamped.y).toBe(app.height - FLOAT_HEIGHT);
  });

  it("pins a negative position to the origin", () => {
    const clamped = clampFloat(app, windowAt(-40, -10));

    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
  });

  it("does not move a window that is already inside", () => {
    const clamped = clampFloat(app, windowAt(200, 100));

    expect(clamped.x).toBe(200);
    expect(clamped.y).toBe(100);
  });
});

describe("dockFloat", () => {
  it("docks the active tab and prunes the emptied window", () => {
    const result = dockFloat(dock(), windowAt(100, 100), "main");

    expect(describeDock(result.dock)).toBe("main=beta,alpha@alpha");
    expect(Option.isNone(result.float)).toBe(true);
  });

  it("keeps the window open for the tabs that remain", () => {
    const twoTabs: FloatWindow = {
      ...windowAt(100, 100),
      tabs: [
        { id: "alpha", title: "Alpha" },
        { id: "beta", title: "Beta" },
      ],
      active: "alpha",
    };

    const result = dockFloat(dock(), twoTabs, "main");

    expect(describeDock(result.dock)).toBe("main=beta,alpha@alpha");
    expect(
      Option.match(result.float, {
        onNone: () => [],
        onSome: (window) => window.tabs.map((tab) => tab.id),
      }),
    ).toEqual(["beta"]);
  });

  it("loses nothing when the target group does not exist", () => {
    const result = dockFloat(dock(), windowAt(10, 10), "missing");

    expect(describeDock(result.dock)).toBe(describeDock(dock()));
    expect(
      Option.match(result.float, {
        onNone: () => [],
        onSome: (window) => window.tabs.map((tab) => tab.id),
      }),
    ).toEqual(["alpha"]);
  });
});

describe("the workspace codec", () => {
  it("round-trips the dock and the float position", () => {
    const saved = encodeWorkspace(dock(), Option.some(windowAt(320, 210)));
    const restored = decodeWorkspace(saved);

    expect(Option.isSome(restored)).toBe(true);
    const value = Option.getOrElse(restored, () => {
      throw new Error("expected a workspace");
    });
    expect(describeDock(value.dock)).toBe(describeDock(dock()));
    expect(
      Option.match(value.float, {
        onNone: () => "none",
        onSome: (window) => `${window.x},${window.y}`,
      }),
    ).toBe("320,210");
  });

  it("round-trips a workspace with no float as null", () => {
    const restored = decodeWorkspace(encodeWorkspace(dock(), Option.none()));

    expect(
      Option.match(restored, {
        onNone: () => "invalid",
        onSome: (value) => Option.isNone(value.float),
      }),
    ).toBe(true);
  });

  it("decodes a corrupt payload to None rather than throwing", () => {
    expect(Option.isNone(decodeWorkspace("{not json"))).toBe(true);
    expect(Option.isNone(decodeWorkspace('{"dock":{}}'))).toBe(true);
  });
});
