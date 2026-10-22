/**
 * The property record: the rows that describe one object, and the one-row edit.
 *
 * The bugs these guard:
 *
 * - an edit that changes more than the row it names, so a panel corrupts its
 *   neighbours;
 * - an edit that mutates the source record, so two panels reading the same
 *   object see each other's edits before a callback runs.
 */

import { describe, expect, it } from "vitest";
import { propertyRecord, setProperty, type PropertyRow } from "./logic.js";

const rows: ReadonlyArray<PropertyRow> = [
  { type: "text", key: "name", label: "Name", value: "cube" },
  { type: "number", key: "count", label: "Count", value: 3 },
  { type: "boolean", key: "active", label: "Active", value: true },
  {
    type: "select",
    key: "shape",
    label: "Shape",
    value: "box",
    options: [
      { value: "box", label: "Box" },
      { value: "sphere", label: "Sphere" },
    ],
  },
];

describe("propertyRecord", () => {
  it("folds the rows into one record", () => {
    expect(propertyRecord(rows)).toEqual({
      name: "cube",
      count: 3,
      active: true,
      shape: "box",
    });
  });

  it("reads an empty row set as an empty record", () => {
    expect(propertyRecord([])).toEqual({});
  });
});

describe("setProperty", () => {
  it("changes one row and leaves the others", () => {
    const record = propertyRecord(rows);
    expect(setProperty(record, "name", "pyramid")).toEqual({
      name: "pyramid",
      count: 3,
      active: true,
      shape: "box",
    });
    expect(setProperty(record, "active", false)).toEqual({
      name: "cube",
      count: 3,
      active: false,
      shape: "box",
    });
  });

  it("never mutates the record it edits", () => {
    const record = propertyRecord(rows);
    setProperty(record, "name", "pyramid");
    expect(record.name).toBe("cube");
    expect(propertyRecord(rows)).toEqual({
      name: "cube",
      count: 3,
      active: true,
      shape: "box",
    });
  });
});
