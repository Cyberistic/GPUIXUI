/**
 * Guards the docking layout's rules.
 *
 * The bugs these tests catch, in order:
 *
 * - a drop that ignores the edge region, so every move becomes a merge and a
 *   split can never be created;
 * - a prune that leaves an emptied pane in the tree (and a split with one
 *   side), which would make the surviving panes keep the collapsed geometry;
 * - a drop that removes the target group before wrapping it, so an edge drop
 *   silently does nothing;
 * - a restore that loses a nested divider size, or a decode that throws on a
 *   corrupt snapshot instead of returning `None`;
 * - geometry that forgets the divider, or a drop indicator that is the whole
 *   pane for every edge.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  INITIAL_DOCK,
  activate,
  decodeDock,
  describeDock,
  dropSize,
  dropTab,
  encodeDock,
  findGroup,
  groups,
  indicatorRect,
  rects,
  resize,
  zoneAt,
  type DockNode,
  type DropRequest,
} from "./dock.js";

const request = (overrides: Partial<DropRequest>): DropRequest => ({
  tabId: "search",
  target: "editor",
  edge: "right",
  newGroup: "editor-1",
  newSplit: "drop1",
  title: "Editor panel",
  size: 324,
  min: 120,
  max: 528,
  ...overrides,
});

/** The initial tree after `search` moved into `editor`'s strip. */
const MERGED: DockNode = dropTab(INITIAL_DOCK, request({ edge: "center" }));

describe("groups and describeDock", () => {
  it("lists groups in document order", () => {
    expect(groups(INITIAL_DOCK).map((group) => group.id)).toEqual([
      "left",
      "editor",
      "terminal",
    ]);
  });

  it("prints groups, actives and split sizes as one line", () => {
    expect(describeDock(INITIAL_DOCK)).toBe(
      "left=explorer,search,notes@explorer editor=main.ts@main.ts terminal=shell@shell main=h240 centre=v320",
    );
  });

  it("activates a member and ignores a non-member", () => {
    expect(describeDock(activate(INITIAL_DOCK, "left", "search"))).toContain(
      "left=explorer,search,notes@search",
    );
    expect(describeDock(activate(INITIAL_DOCK, "left", "shell"))).toContain(
      "left=explorer,search,notes@explorer",
    );
  });
});

describe("dropTab", () => {
  it("merges into the target's strip on a centre drop", () => {
    expect(describeDock(MERGED)).toBe(
      "left=explorer,notes@explorer editor=main.ts,search@search terminal=shell@shell main=h240 centre=v320",
    );
  });

  it("wraps the target in a horizontal split on a right drop", () => {
    const dropped = dropTab(INITIAL_DOCK, request({ edge: "right" }));
    expect(describeDock(dropped)).toBe(
      "left=explorer,notes@explorer editor=main.ts@main.ts editor-1=search@search terminal=shell@shell main=h240 centre=v320 drop1=h324",
    );
    expect(
      Option.map(findGroup(dropped, "editor-1"), (g) => g.tabs.length),
    ).toEqual(Option.some(1));
  });

  it("puts the new group first on a top drop", () => {
    const dropped = dropTab(
      INITIAL_DOCK,
      request({
        tabId: "shell",
        target: "editor",
        edge: "top",
        newGroup: "editor-2",
        newSplit: "drop2",
        size: 157,
        max: 194,
      }),
    );
    expect(describeDock(dropped)).toBe(
      "left=explorer,search,notes@explorer editor-2=shell@shell editor=main.ts@main.ts main=h240 drop2=v157",
    );
  });

  it("prunes an emptied source and collapses its split", () => {
    const dropped = dropTab(
      INITIAL_DOCK,
      request({
        tabId: "shell",
        target: "editor",
        edge: "top",
        newGroup: "editor-2",
        newSplit: "drop2",
        size: 157,
        max: 194,
      }),
    );
    expect(Option.isNone(findGroup(dropped, "terminal"))).toBe(true);
    expect(Option.isNone(findGroup(dropped, "centre"))).toBe(true);
  });

  it("refuses to split a group against itself", () => {
    const dropped = dropTab(
      INITIAL_DOCK,
      request({ tabId: "explorer", target: "left", edge: "right" }),
    );
    expect(describeDock(dropped)).toBe(describeDock(INITIAL_DOCK));
  });

  it("derives a half-pane split size from the target extent", () => {
    expect(dropSize(654)).toEqual({ size: 324, min: 96, max: 552 });
    expect(dropSize(320)).toEqual({ size: 157, min: 96, max: 218 });
  });
});

describe("resize", () => {
  it("clamps to the split's own bounds", () => {
    expect(describeDock(resize(INITIAL_DOCK, "main", 999))).toContain(
      "main=h360",
    );
    expect(describeDock(resize(INITIAL_DOCK, "main", -40))).toContain(
      "main=h160",
    );
    expect(describeDock(resize(INITIAL_DOCK, "centre", 999))).toContain(
      "centre=v400",
    );
  });

  it("leaves the other splits alone", () => {
    expect(describeDock(resize(INITIAL_DOCK, "main", 280))).toBe(
      "left=explorer,search,notes@explorer editor=main.ts@main.ts terminal=shell@shell main=h280 centre=v320",
    );
  });
});

describe("persistence", () => {
  it("round-trips a nested tree exactly", () => {
    const dropped = dropTab(
      INITIAL_DOCK,
      request({
        tabId: "search",
        target: "editor",
        edge: "right",
        newGroup: "editor-1",
        newSplit: "drop1",
        size: 324,
      }),
    );
    const restored = decodeDock(encodeDock(dropped));
    expect(Option.map(restored, describeDock)).toEqual(
      Option.some(describeDock(dropped)),
    );
  });

  it("rejects an unknown tag and a split with no children", () => {
    expect(Option.isNone(decodeDock('{"kind":"nope"}'))).toBe(true);
    expect(
      Option.isNone(
        decodeDock(
          '{"kind":"split","id":"x","orientation":"horizontal","size":1,"min":1,"max":2}',
        ),
      ),
    ).toBe(true);
  });
});

/** A rectangle the tree must contain; a missing one is a broken fixture. */
const required = <A>(value: A | undefined): A => {
  if (value === undefined) throw new Error("missing rectangle");
  return value;
};

describe("geometry", () => {
  const surface = { x: 0, y: 0, width: 900, height: 480 };

  it("reserves the divider between panes", () => {
    expect(rects(INITIAL_DOCK, surface)).toEqual({
      left: { x: 0, y: 0, width: 240, height: 480 },
      editor: { x: 246, y: 0, width: 654, height: 320 },
      terminal: { x: 246, y: 326, width: 654, height: 154 },
    });
  });

  it("maps the pointer to an edge, the centre, or nothing", () => {
    const editor = required(rects(INITIAL_DOCK, surface).editor);
    expect(zoneAt({ x: 896, y: 160 }, editor)).toEqual(Option.some("right"));
    expect(zoneAt({ x: 500, y: 316 }, editor)).toEqual(Option.some("bottom"));
    expect(zoneAt({ x: 573, y: 160 }, editor)).toEqual(Option.some("center"));
    expect(zoneAt({ x: 10, y: 10 }, editor)).toEqual(Option.none());
  });

  it("draws a thin bar for an edge and the whole pane for a centre", () => {
    const editor = required(rects(INITIAL_DOCK, surface).editor);
    expect(indicatorRect("right", editor)).toEqual({
      x: 650,
      y: 0,
      width: 4,
      height: 320,
    });
    expect(indicatorRect("bottom", editor)).toEqual({
      x: 0,
      y: 316,
      width: 654,
      height: 4,
    });
    expect(indicatorRect("center", editor)).toEqual({
      x: 0,
      y: 0,
      width: 654,
      height: 320,
    });
  });
});
