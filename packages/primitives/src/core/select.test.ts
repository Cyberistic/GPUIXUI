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
  selectOpen,
  selectOptions,
  selectRowCounts,
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
  it("closes a disabled select whatever the requested open says", () => {
    // The bug guarded (plan 346): disabling a select while its controlled
    // `open` stayed true painted a list the runtime refused to choose from.
    expect(selectOpen(true, true)).toBe(false);
    expect(selectOpen(true, false)).toBe(true);
    expect(selectOpen(false, false)).toBe(false);
  });
});
