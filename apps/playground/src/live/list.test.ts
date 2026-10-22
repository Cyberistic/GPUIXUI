/**
 * Guards the row set the `list-lifecycle` probe asserts against.
 *
 * Three checks rest on the list's shape, not on the runtime: `down` from
 * `grace` must skip the disabled `alan` and reach `linus`; the letter `g` must
 * name exactly one row so the type-ahead jump is unambiguous; and the enabled
 * values are what `Cmd+A` must select. Reordering the rows, enabling `alan` or
 * giving another row a `g` would keep the probe green while it measured
 * something else.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { LIST_ROWS, TYPEAHEAD_LETTER } from "./list.js";

/** The enabled rows, in the order the arrow key walks them. */
const enabled = Arr.filter(LIST_ROWS, (row) => row.disabled !== true);

describe("the list-lifecycle row set", () => {
  it("puts a disabled row between grace and linus", () => {
    expect(Arr.map(enabled, (row) => row.value)).toEqual([
      "ada",
      "grace",
      "linus",
      "margaret",
    ]);
    expect(Arr.map(LIST_ROWS, (row) => row.value)).toEqual([
      "ada",
      "grace",
      "alan",
      "linus",
      "margaret",
    ]);
  });

  it("letters the type-ahead step to one row", () => {
    const matches = Arr.filter(LIST_ROWS, (row) =>
      Str.startsWith(TYPEAHEAD_LETTER)(Str.toLowerCase(row.title)),
    );
    expect(Arr.map(matches, (row) => row.value)).toEqual(["grace"]);
  });
});
