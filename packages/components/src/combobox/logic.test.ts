/**
 * Combobox ranking and selection.
 *
 * The bugs these guard: ranking sorted substring matches before prefix matches,
 * so typing `ca` highlighted `Vacation` above `Calendar`; a tie reordered the
 * caller's list, so the highlighted row jumped between renders; a blank query
 * filtered everything out instead of showing the full list; and toggling a
 * value that was already selected added it a second time. Grouping adds one
 * more: a global sort pulled a later group's better match above an earlier
 * group, splitting (or reordering) the sections the caller declared.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  canCreate,
  createValue,
  filterOptions,
  groupOfOption,
  labelOf,
  optionRuns,
  parseCreateValue,
  rowRuns,
  selectedLabel,
  toggledSelection,
  visibleOptions,
  type ComboboxOption,
} from "./logic.js";

const option = (
  value: string,
  label = value,
  description?: string,
): ComboboxOption =>
  description === undefined ? { value, label } : { value, label, description };

const values = (
  options: ReadonlyArray<ComboboxOption>,
): ReadonlyArray<string> => options.map((entry) => entry.value);

const catalogue: ReadonlyArray<ComboboxOption> = [
  option("v1", "Vacation"),
  option("c1", "Calendar"),
  option("c2", "Camera roll", "Photos taken on a camera"),
  option("n1", "New event"),
  option("s1", "Switch account", undefined),
];

describe("labelOf", () => {
  it("uses the label, falling back to the value", () => {
    expect(labelOf(option("a", "Alpha"))).toBe("Alpha");
    expect(labelOf(option("a", ""))).toBe("a");
  });
});

describe("filterOptions", () => {
  it("returns every option for an empty or blank query", () => {
    expect(filterOptions(catalogue, "")).toEqual(catalogue);
    expect(filterOptions(catalogue, "   ")).toEqual(catalogue);
  });

  it("ranks an exact prefix above a word prefix above a substring", () => {
    expect(values(filterOptions(catalogue, "ca"))).toEqual(["c1", "c2", "v1"]);
  });

  it("keeps the caller's order for equally ranked options", () => {
    const ties: ReadonlyArray<ComboboxOption> = [
      option("b", "Beta release"),
      option("a", "Alpha release"),
      option("c", "Canary release"),
    ];
    expect(values(filterOptions(ties, "release"))).toEqual(["b", "a", "c"]);
  });

  it("matches case-insensitively", () => {
    expect(values(filterOptions(catalogue, "CALENDAR"))).toEqual(["c1"]);
  });

  it("matches a description after every label match", () => {
    expect(values(filterOptions(catalogue, "photos"))).toEqual(["c2"]);
  });

  it("keeps a disabled option so it stays visible", () => {
    const options: ReadonlyArray<ComboboxOption> = [
      { ...option("off", "Offline mode"), disabled: true },
      option("on", "Online mode"),
    ];
    expect(values(filterOptions(options, "mode"))).toEqual(["off", "on"]);
  });

  it("is empty when nothing matches", () => {
    expect(filterOptions(catalogue, "zzz")).toEqual([]);
  });
});

describe("grouping", () => {
  const grouped: ReadonlyArray<ComboboxOption> = [
    { value: "vacation", label: "Vacation", group: "Work" },
    { value: "calendar", label: "Calendar", group: "Work" },
    { value: "camera", label: "Camera roll", group: "Devices" },
    { value: "desk", label: "Desk booking", group: "Devices" },
  ];

  it("treats an absent or blank group as ungrouped", () => {
    expect(groupOfOption(option("a"))).toEqual(Option.none());
    expect(groupOfOption({ ...option("a"), group: "   " })).toEqual(
      Option.none(),
    );
    expect(groupOfOption({ ...option("a"), group: "Work" })).toEqual(
      Option.some("Work"),
    );
  });

  it("splits options into maximal contiguous runs and keeps their start", () => {
    const runs = optionRuns([
      { ...option("a", "Apple"), group: "Fruits" },
      { ...option("b", "Banana"), group: "Fruits" },
      { ...option("c", "Carrot"), group: "Vegetables" },
      { ...option("d", "Date"), group: "Fruits" },
    ]);

    expect(runs.map((run) => Option.getOrUndefined(run.group))).toEqual([
      "Fruits",
      "Vegetables",
      "Fruits",
    ]);
    expect(runs.map((run) => run.from)).toEqual([0, 2, 3]);
    expect(runs.map((run) => values(run.options))).toEqual([
      ["a", "b"],
      ["c"],
      ["d"],
    ]);
  });

  it("ranks inside a run, so a better match in a later group cannot jump it", () => {
    expect(values(filterOptions(grouped, "ca"))).toEqual([
      "calendar",
      "vacation",
      "camera",
    ]);
  });

  it("drops a group whose every option misses the query", () => {
    expect(values(filterOptions(grouped, "desk"))).toEqual(["desk"]);
  });

  it("keeps declaration order for an empty query", () => {
    expect(filterOptions(grouped, "")).toBe(grouped);
  });

  it("groups the rows and leaves the create row ungrouped", () => {
    const runs = rowRuns(
      ["vacation", "calendar", createValue("Design")],
      (value) =>
        value === "vacation" || value === "calendar"
          ? Option.some("Work")
          : Option.none(),
    );

    expect(runs.map((run) => Option.getOrUndefined(run.group))).toEqual([
      "Work",
      undefined,
    ]);
    expect(runs.map((run) => run.values)).toEqual([
      ["vacation", "calendar"],
      [createValue("Design")],
    ]);
  });
});

describe("visibleOptions", () => {
  it("filters when the caller asks for filtering", () => {
    expect(values(visibleOptions(catalogue, "ca", true))).toEqual([
      "c1",
      "c2",
      "v1",
    ]);
  });

  it("passes the caller's rows through untouched when filtering is off", () => {
    expect(visibleOptions(catalogue, "zzz", false)).toEqual(catalogue);
  });
});

describe("toggledSelection", () => {
  it("adds an unselected value", () => {
    expect(toggledSelection([], "a")).toEqual(["a"]);
    expect(toggledSelection(["a"], "b")).toEqual(["a", "b"]);
  });

  it("removes a selected value without disturbing the rest", () => {
    expect(toggledSelection(["a", "b", "c"], "b")).toEqual(["a", "c"]);
  });

  it("never holds the same value twice", () => {
    const once = toggledSelection([], "a");
    expect(toggledSelection(once, "a")).toEqual([]);
  });
});

describe("selectedLabel", () => {
  it("names the selected value", () => {
    expect(selectedLabel(catalogue, Option.some("c2"))).toEqual(
      Option.some("Camera roll"),
    );
  });

  it("is none when nothing is selected or the value is unknown", () => {
    expect(selectedLabel(catalogue, Option.none())).toEqual(Option.none());
    expect(selectedLabel(catalogue, Option.some("nope"))).toEqual(
      Option.none(),
    );
  });
});

describe("canCreate", () => {
  it("offers creation for a new non-blank query", () => {
    expect(canCreate(catalogue, "Design")).toBe(true);
    expect(canCreate(catalogue, "Cal")).toBe(true);
    expect(canCreate(catalogue, "photos taken")).toBe(true);
  });

  it("refuses a query that already names an option", () => {
    expect(canCreate(catalogue, "Calendar")).toBe(false);
    expect(canCreate(catalogue, "calendar")).toBe(false);
    expect(canCreate(catalogue, "  CALENDAR  ")).toBe(false);
    expect(canCreate(catalogue, "c1")).toBe(false);
  });

  it("is false for a blank query and true for any text with no options", () => {
    expect(canCreate(catalogue, "")).toBe(false);
    expect(canCreate(catalogue, "   ")).toBe(false);
    expect(canCreate([], "anything")).toBe(true);
  });
});

describe("createValue", () => {
  it("round-trips the typed query", () => {
    expect(parseCreateValue(createValue("Design"))).toEqual(
      Option.some("Design"),
    );
  });

  it("does not mistake a real value for the sentinel", () => {
    expect(parseCreateValue("design")).toEqual(Option.none());
    expect(parseCreateValue("")).toEqual(Option.none());
  });

  it("keeps the sentinel distinct from the query", () => {
    expect(createValue("Design")).not.toBe("Design");
  });
});
