/**
 * The select list's data model.
 *
 * The bug this guards: a group heading that leaks into the keyboard order, an
 * empty group that paints a title over blank space, or a trigger label lookup
 * that only sees the first group. The renderer, the `items` prop and the height
 * estimate all read these helpers, so a wrong order here reaches the paint.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import {
  isSelectGroup,
  selectHasChoices,
  selectOpen,
  selectOptions,
  selectRowCounts,
  selectValueText,
  type SelectEntry,
} from "./select.js";

const flat: ReadonlyArray<SelectEntry> = [
  { value: "alpha", label: "Alpha" },
  { value: "beta", label: "Beta" },
];

const grouped: ReadonlyArray<SelectEntry> = [
  { label: "Europe", options: [{ value: "eu", label: "Europe West" }] },
  { value: "us", label: "United States" },
  {
    label: "Empty",
    options: [],
  },
  {
    label: "Asia",
    options: [
      { value: "ap", label: "Asia South" },
      { value: "ap-east", label: "Asia East", disabled: true },
    ],
  },
];

describe("select entries", () => {
  it("reads a flat list as itself, with no headings", () => {
    expect(selectOptions(flat)).toStrictEqual(flat);
    expect(selectRowCounts(flat)).toStrictEqual({ options: 2, headings: 0 });
  });

  it("keeps grouped options in paint order and drops the headings", () => {
    expect(selectOptions(grouped).map((option) => option.value)).toStrictEqual([
      "eu",
      "us",
      "ap",
      "ap-east",
    ]);
    expect(selectRowCounts(grouped)).toStrictEqual({ options: 4, headings: 2 });
  });

  it("gives an empty group neither a heading nor rows", () => {
    const counts = selectRowCounts([{ label: "Empty", options: [] }]);
    expect(counts).toStrictEqual({ options: 0, headings: 0 });
    expect(selectOptions([{ label: "Empty", options: [] }])).toStrictEqual([]);
  });

  it("does not count a heading whose name says nothing", () => {
    // The bug guarded (plan 579): a group with a computed blank heading still
    // counted and painted one, so the list was one caption row taller than the
    // placement estimate and the heading was an empty line. A blank name is
    // absence, like every other blank string in the package (plans 026, 577).
    expect(
      selectRowCounts([
        { label: "   ", options: [{ value: "eu", label: "Europe West" }] },
      ]),
    ).toStrictEqual({ options: 1, headings: 0 });
  });

  it("distinguishes a group from an option by its options list", () => {
    expect(isSelectGroup({ label: "Europe", options: [] })).toBe(true);
    expect(isSelectGroup({ value: "eu", label: "Europe West" })).toBe(false);
  });

  it("keeps a disabled option's flag through the flatten", () => {
    expect(
      Arr.filter(selectOptions(grouped), (option) => option.disabled === true),
    ).toStrictEqual([{ value: "ap-east", label: "Asia East", disabled: true }]);
  });
});

describe("select open state", () => {
  it("closes a disabled or read-only select whatever the requested open says", () => {
    // The bug guarded (plans 346, 797): disabling a select while its controlled
    // `open` stayed true painted a list the runtime refused to choose from,
    // and a read-only field must not offer a list it will never commit.
    expect(selectOpen(true, true)).toBe(false);
    expect(selectOpen(true, false, true)).toBe(false);
    expect(selectOpen(true, true, true)).toBe(false);
    expect(selectOpen(true, false)).toBe(true);
    expect(selectOpen(true, false, false)).toBe(true);
    expect(selectOpen(false, false)).toBe(false);
  });

  it("has no choices when every entry is absent or an empty group", () => {
    // The bug guarded (plan 745): an empty list painted a listbox with no rows
    // — a dead menu. A group is its options; a disabled option is still a row
    // the list can show, so it counts.
    expect(selectHasChoices([])).toBe(false);
    expect(selectHasChoices([{ label: "Empty", options: [] }])).toBe(false);
    expect(selectHasChoices([{ label: "Empty", options: [] }, ...flat])).toBe(
      true,
    );
    expect(
      selectHasChoices([
        { label: "Europe", options: [{ value: "eu", label: "Europe West" }] },
      ]),
    ).toBe(true);
    expect(
      selectHasChoices([{ value: "off", label: "Off", disabled: true }]),
    ).toBe(true);
  });
});

describe("select announced value", () => {
  it("trims a real chosen label, like the option row's own name", () => {
    // The bug guarded (plan 635): the trigger wrote `selectedLabel ??
    // placeholder` raw, so a padded option label was announced with its
    // padding while the same row's `aria-label` was trimmed.
    expect(selectValueText("  Apple  ", "Pick one")).toBe("Apple");
  });

  it("trims a real placeholder", () => {
    expect(selectValueText(undefined, "  Pick one  ")).toBe("Pick one");
  });

  it("treats a blank chosen label as no label, and falls back", () => {
    expect(selectValueText("   ", "Pick one")).toBe("Pick one");
  });

  it("announces nothing when neither the label nor the placeholder says anything", () => {
    expect(selectValueText("", "   ")).toBeUndefined();
    expect(selectValueText(undefined, undefined)).toBeUndefined();
  });
});
