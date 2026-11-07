import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { REVIEWERS } from "./combobox.js";

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
