/**
 * Guards the order/visibility model a configurable data grid depends on.
 *
 * The bugs these catch: a hidden column still taking width (so every later cell
 * is offset), showing a column at the wrong order slot, hiding the last column
 * and leaving an empty grid, a reorder that moves the wrong neighbour or
 * mutates the state it was given, and a pan bound that ignores the visible set.
 */
import { describe, expect, it } from "@effect/vitest";
import {
  contentWidthOf,
  describeConfig,
  initialConfig,
  isVisible,
  maxPanOf,
  moveBy,
  offsetIn,
  orderOf,
  resetConfig,
  toggle,
  visibleIds,
} from "./column-config-model.js";
import { initialWidths, setWidth } from "./column-resize-model.js";

const hiddenStatus = toggle(initialConfig, "status");
const reordered = moveBy(initialConfig, "notes", -1);

describe("initialConfig", () => {
  it("is the four declared columns in paint order", () => {
    expect(orderOf(initialConfig)).toEqual(["name", "status", "size", "notes"]);
    expect(visibleIds(initialConfig)).toEqual([
      "name",
      "status",
      "size",
      "notes",
    ]);
    expect(describeConfig(initialConfig)).toBe(
      "order=name,status,size,notes hidden=none visible=4",
    );
  });

  it("shows every known column and no unknown one", () => {
    expect(isVisible(initialConfig, "status")).toBe(true);
    expect(isVisible(initialConfig, "missing")).toBe(false);
  });
});

describe("toggle", () => {
  it("hides one column and keeps its order slot", () => {
    expect(visibleIds(hiddenStatus)).toEqual(["name", "size", "notes"]);
    expect(orderOf(hiddenStatus)).toEqual(["name", "status", "size", "notes"]);
    expect(describeConfig(hiddenStatus)).toBe(
      "order=name,status,size,notes hidden=status visible=3",
    );
  });

  it("shows a hidden column again", () => {
    expect(visibleIds(toggle(hiddenStatus, "status"))).toEqual([
      "name",
      "status",
      "size",
      "notes",
    ]);
    expect(describeConfig(toggle(hiddenStatus, "status"))).toBe(
      "order=name,status,size,notes hidden=none visible=4",
    );
  });

  it("is idempotent for an unknown id", () => {
    expect(toggle(initialConfig, "missing")).toBe(initialConfig);
  });

  it("refuses to hide the last visible column", () => {
    const one = ["name", "status", "size"].reduce(
      (config, id) => toggle(config, id),
      initialConfig,
    );
    expect(visibleIds(one)).toEqual(["notes"]);
    expect(toggle(one, "notes")).toBe(one);
    expect(describeConfig(toggle(one, "notes"))).toBe(
      "order=name,status,size,notes hidden=name,status,size visible=1",
    );
  });

  it("does not mutate the config it was given", () => {
    expect(orderOf(hiddenStatus)).toEqual(["name", "status", "size", "notes"]);
    expect(visibleIds(initialConfig)).toHaveLength(4);
  });
});

describe("moveBy", () => {
  it("swaps a column with its neighbour in the full order", () => {
    expect(orderOf(reordered)).toEqual(["name", "status", "notes", "size"]);
    expect(orderOf(moveBy(reordered, "name", 1))).toEqual([
      "status",
      "name",
      "notes",
      "size",
    ]);
  });

  it("clamps at the ends and ignores a zero delta", () => {
    expect(moveBy(initialConfig, "name", -1)).toBe(initialConfig);
    expect(moveBy(initialConfig, "notes", 1)).toBe(initialConfig);
    expect(moveBy(initialConfig, "status", 0)).toBe(initialConfig);
  });

  it("ignores an unknown id and does not mutate the order", () => {
    expect(moveBy(initialConfig, "missing", 1)).toBe(initialConfig);
    expect(orderOf(initialConfig)).toEqual(["name", "status", "size", "notes"]);
  });

  it("keeps a hidden neighbour's slot", () => {
    const moved = moveBy(toggle(initialConfig, "status"), "size", -1);
    expect(orderOf(moved)).toEqual(["name", "size", "status", "notes"]);
    expect(visibleIds(moved)).toEqual(["name", "size", "notes"]);
  });
});

describe("offsetIn", () => {
  it("places each cell after the visible widths before it", () => {
    expect(
      ["name", "status", "size", "notes"].map((id) =>
        offsetIn(initialConfig, initialWidths, id),
      ),
    ).toEqual([0, 200, 320, 410]);
  });

  it("skips a hidden column's width", () => {
    expect(offsetIn(hiddenStatus, initialWidths, "size")).toBe(200);
    expect(offsetIn(hiddenStatus, initialWidths, "notes")).toBe(290);
  });

  it("has no offset for a hidden or unknown column", () => {
    expect(offsetIn(hiddenStatus, initialWidths, "status")).toBe(0);
    expect(offsetIn(initialConfig, initialWidths, "missing")).toBe(0);
  });

  it("follows a reorder", () => {
    expect(offsetIn(reordered, initialWidths, "notes")).toBe(320);
    expect(offsetIn(reordered, initialWidths, "size")).toBe(470);
  });
});

describe("contentWidthOf", () => {
  it("sums the visible columns only", () => {
    expect(contentWidthOf(initialConfig, initialWidths)).toBe(560);
    expect(contentWidthOf(hiddenStatus, initialWidths)).toBe(440);
    expect(contentWidthOf(reordered, initialWidths)).toBe(560);
  });

  it("follows a widened column even while hidden", () => {
    const wide = setWidth(initialWidths, "status", 160);
    expect(contentWidthOf(hiddenStatus, wide)).toBe(440);
    expect(
      contentWidthOf(toggle(hiddenStatus, "status"), wide),
    ).toBe(600);
  });
});

describe("maxPanOf", () => {
  it("is the content that overflows the viewport, as a negative offset", () => {
    expect(maxPanOf(initialConfig, initialWidths, 360)).toBe(-200);
    expect(maxPanOf(initialConfig, initialWidths, 560)).toBe(0);
  });

  it("follows the visible set rather than the full one", () => {
    expect(maxPanOf(hiddenStatus, initialWidths, 360)).toBe(-80);
    expect(
      maxPanOf(toggle(initialConfig, "notes"), initialWidths, 360),
    ).toBe(-50);
  });
});

describe("resetConfig", () => {
  it("restores the order and clears every hidden id in a fresh object", () => {
    const changed = moveBy(toggle(initialConfig, "status"), "notes", -1);
    const reset = resetConfig();
    expect(orderOf(reset)).toEqual(["name", "status", "size", "notes"]);
    expect(visibleIds(reset)).toHaveLength(4);
    expect(reset).not.toBe(initialConfig);
    expect(orderOf(changed)).not.toEqual(orderOf(reset));
  });
});
