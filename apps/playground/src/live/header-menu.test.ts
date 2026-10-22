/**
 * Guards the header widths the `header-menu-lifecycle` probe asserts against.
 *
 * The probe compares an overlay's painted box with the trigger's before and
 * after a wheel. Those two numbers are the fixture's arithmetic, not a value
 * read back from the paint it is measuring: if the header's widths changed, the
 * probe would still compare a stale expectation with a fresh measurement and
 * blame the runtime. A column hidden *before* the trigger has to move it and one
 * hidden *after* it must not.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import {
  HEADER_COLUMNS,
  HEADER_FIRST_ITEM,
  HEADER_TRIGGER_WIDTH,
  headerCellId,
  headerContentWidth,
  headerTravel,
  headerTriggerCellX,
  toggleHidden,
} from "./header-menu.js";

describe("the header-menu fixture", () => {
  it("sums the visible columns plus the trigger cell", () => {
    expect(headerContentWidth([])).toBe(HEADER_TRIGGER_WIDTH + 440);
    expect(headerContentWidth(["status"])).toBe(HEADER_TRIGGER_WIDTH + 320);
    expect(headerContentWidth(["name", "size", "status"])).toBe(
      HEADER_TRIGGER_WIDTH,
    );
  });

  it("scrolls only as far as the columns beyond the frame", () => {
    expect(headerTravel([])).toBe(120);
    expect(headerTravel(["status"])).toBe(0);
    expect(headerTravel(["name", "size", "status"])).toBe(0);
  });

  it("moves the trigger with a column before it and not with one after", () => {
    expect(headerTriggerCellX([], 0)).toBe(200);
    expect(headerTriggerCellX([], -100)).toBe(100);
    expect(headerTriggerCellX(["status"], 0)).toBe(200);
    expect(headerTriggerCellX(["name"], 0)).toBe(0);
  });

  it("spells the hidden columns in header order and toggles them back", () => {
    expect(toggleHidden([], "status")).toEqual(["status"]);
    expect(toggleHidden(["status"], "size")).toEqual(["size", "status"]);
    expect(toggleHidden(["size", "status"], "size")).toEqual(["status"]);
    expect(
      Arr.map(HEADER_COLUMNS, (column) => headerCellId(column.id)),
    ).toEqual(["header-cell-name", "header-cell-size", "header-cell-status"]);
  });

  it("lists the last column's toggle first, so the arrow lands on it", () => {
    const last = Option.getOrElse(Arr.last(HEADER_COLUMNS), () => undefined);
    expect(last?.id).toBe("status");
    expect(HEADER_FIRST_ITEM).toBe("header-menu-item-status");
  });
});
