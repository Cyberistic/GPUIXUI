import { describe, expect, it } from "vitest";
import {
  flatten,
  nextEnabled,
  selectedLabel,
  type PreviewEntry,
} from "./select-preview";

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
    expect(flatten(entries).map((option) => option.value)).toEqual([
      "eu-west",
      "eu-central",
      "us-east",
      "legacy",
      "ap-south",
    ]);
  });

  it("skips a disabled row the arrows cross", () => {
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
