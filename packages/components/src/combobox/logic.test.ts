/**
 * Combobox ranking, selection and the create row.
 *
 * The bugs these guard: ranking sorted substring matches before prefix matches,
 * so typing `ca` highlighted `Vacation` above `Calendar`; a tie reordered the
 * caller's list, so the highlighted row jumped between renders; a blank query
 * filtered everything out instead of showing the full list; toggling a value
 * that was already selected added it a second time; and a create row that
 * offered itself over a real match, or lost the query's spaces in the round trip.
 */

import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import {
  createRowQuery,
  createRowValue,
  filterOptions,
  isCreateRow,
  labelOf,
  offersCreate,
  optionsOf,
  selectedLabel,
  selectionOf,
  toggledSelection,
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

  it("reads a blank label as absence, and trims the one it keeps", () => {
    // A label decoded from a table is often whitespace where it has no name;
    // the value is then the only name the trigger and the row have.
    expect(labelOf(option("a", "   "))).toBe("a");
    expect(labelOf(option("a", " Alpha "))).toBe("Alpha");
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

describe("the create row", () => {
  it("round-trips a query, including spaces and quotes", () => {
    const value = createRowValue('Release "beta" 2');
    expect(createRowQuery(value)).toBe('Release "beta" 2');
    expect(isCreateRow(value)).toBe(true);
  });

  it("does not mistake a caller value for the create row", () => {
    expect(isCreateRow("c1")).toBe(false);
    expect(createRowQuery(createRowValue("zzz"))).toBe("zzz");
  });

  it("is offered only for a non-blank query with no match", () => {
    expect(offersCreate([], "zzz", true)).toBe(true);
    expect(offersCreate([], "   ", true)).toBe(false);
    expect(offersCreate(filterOptions(catalogue, "ca"), "ca", true)).toBe(
      false,
    );
    expect(offersCreate([], "zzz", false)).toBe(false);
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

describe("optionsOf", () => {
  it("reads the options a store kept", () => {
    expect(
      optionsOf([
        { value: "a", label: "Alpha", description: "First", disabled: true },
      ]),
    ).toEqual([
      { value: "a", label: "Alpha", description: "First", disabled: true },
    ]);
  });

  it("reads an absent slot, a lost label and a lost flag as their defaults", () => {
    // JSON writes `null` where a saved record carried nothing: the label is
    // absence (the value names the row), the description is not painted and the
    // row is selectable.
    expect(
      optionsOf([
        { value: "a", label: null, description: null, disabled: null },
        { value: "b" },
      ]),
    ).toEqual([
      { value: "a", label: "a", disabled: false },
      { value: "b", label: "b", disabled: false },
    ]);
  });

  it("answers no rows for a value that is not a list", () => {
    expect(optionsOf(null)).toEqual([]);
    expect(optionsOf(undefined)).toEqual([]);
    expect(optionsOf("a")).toEqual([]);
    expect(optionsOf({ value: "a" })).toEqual([]);
  });

  it("drops an entry it cannot address, keeping the rows beside it", () => {
    expect(
      optionsOf([null, { value: "a", label: "Alpha" }, { label: "No value" }]),
    ).toEqual([{ value: "a", label: "Alpha", disabled: false }]);
  });
});

describe("selectionOf", () => {
  it("reads one value or a stored set", () => {
    expect(selectionOf("a")).toEqual(Option.some("a"));
    expect(selectionOf(["a", "b"])).toEqual(Option.some(["a", "b"]));
  });

  it("reads an absent selection as no selection, never a crash", () => {
    // A store writes `null` for the field it never set; the component spread
    // and indexed that value before it painted.
    expect(selectionOf(null)).toEqual(Option.none());
    expect(selectionOf(undefined)).toEqual(Option.none());
    expect(selectionOf(3)).toEqual(Option.none());
  });

  it("keeps the values a stored set carries and drops the holes", () => {
    expect(selectionOf(["a", null, "b"])).toEqual(Option.some(["a", "b"]));
  });
});
