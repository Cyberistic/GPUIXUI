/**
 * Guards the option set the `combobox-lifecycle` probe asserts against.
 *
 * Two probe checks depend on this list's shape, not on the runtime: three
 * ArrowDowns must land on `linus` because the third row is disabled, and the
 * query `ala` must match only the disabled row so "Enter cannot choose it" is
 * about the disabled rule rather than about an empty list. Reordering the
 * options, enabling `alan`, or renaming a label would keep the probe green
 * while it stopped measuring either.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { REVIEWERS } from "./combobox.js";

/** The enabled rows, in the order the arrow key walks them. */
const enabled = Arr.filter(REVIEWERS, (option) => option.disabled !== true);

describe("the combobox-lifecycle option set", () => {
  it("puts a disabled row between the second and third enabled rows", () => {
    expect(Arr.map(enabled, (option) => option.value)).toEqual([
      "ada",
      "grace",
      "linus",
      "margaret",
    ]);
    expect(Arr.map(REVIEWERS, (option) => option.value)).toEqual([
      "ada",
      "grace",
      "alan",
      "linus",
      "margaret",
    ]);
  });

  it("gives the disabled row a query no enabled row matches", () => {
    const matches = Arr.filter(REVIEWERS, (option) =>
      Str.includes("ala")(Str.toLowerCase(option.label)),
    );
    expect(Arr.map(matches, (option) => option.value)).toEqual(["alan"]);
  });
});
