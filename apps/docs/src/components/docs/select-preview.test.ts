import { describe, expect, it } from "vitest";
import {
  flatten,
  nextEnabled,
  selectedLabel,
  type PreviewEntry,
} from "./select-preview";

/**
 * The select preview's row model.
 *
 * The preview repeats the runtime's arrow contract, so the arithmetic is the
 * part a reader cannot verify by looking at the drawing: a disabled row must be
 * skipped, the ends must wrap, and the opening key must land on the chosen row.
 * A preview that stops on a disabled row, or walks group captions as if they
 * were rows, teaches a keyboard the shipped component does not have.
 */

const entries: ReadonlyArray<PreviewEntry> = [
  {
    label: "Europe",
    options: [
      { value: "eu-west", label: "Europe — West" },
      { value: "eu-central", label: "Europe — Central" },
    ],
  },
  { value: "us-east", label: "United States — East" },
  {
    label: "Closed",
    options: [{ value: "legacy", label: "Legacy", disabled: true }],
  },
  { value: "ap-south", label: "Asia — South" },
];

describe("the select preview's row model", () => {
  it("flattens a group's rows in render order", () => {
    // The native component hands the runtime one flat list, so a group is a
    // painted heading rather than a level the arrows cross.
    expect(flatten(entries).map((option) => option.value)).toEqual([
      "eu-west",
      "eu-central",
      "us-east",
      "legacy",
      "ap-south",
    ]);
  });

  it("skips a disabled row the arrows cross", () => {
    // `legacy` sits between `us-east` and `ap-south`, so the downward move has
    // to pass over it — the very case a preview that walks the array misses.
    expect(nextEnabled(entries, "us-east", 1)).toBe("ap-south");
    expect(nextEnabled(entries, "ap-south", -1)).toBe("us-east");
  });

  it("wraps at either end", () => {
    expect(nextEnabled(entries, "ap-south", 1)).toBe("eu-west");
    expect(nextEnabled(entries, "eu-west", -1)).toBe("ap-south");
  });

  it("starts at the edge the opening key came from", () => {
    expect(nextEnabled(entries, null, 1)).toBe("eu-west");
    expect(nextEnabled(entries, null, -1)).toBe("ap-south");
  });

  it("highlights nothing when every row is disabled", () => {
    // An empty list of targets is not the first row: the arrows must not land
    // on a row that cannot be committed.
    expect(
      nextEnabled(
        [
          { value: "one", label: "One", disabled: true },
          { value: "two", label: "Two", disabled: true },
        ],
        null,
        1,
      ),
    ).toBeNull();
  });

  it("names the chosen row, and nothing when the value is absent", () => {
    expect(selectedLabel(entries, "eu-central")).toBe("Europe — Central");
    expect(selectedLabel(entries, "retired")).toBeNull();
  });
});
