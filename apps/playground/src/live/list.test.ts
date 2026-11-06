import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { LIST_ROWS, TYPEAHEAD_LETTER } from "./list.js";

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
