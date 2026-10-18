/**
 * The blank-name rule: a caller's label is a name only when it says something.
 *
 * The bug this file guards (plan 026): plans 396 and 399 fixed a blank label on
 * `Button`/`Toggle`/`ScrollArea`/`Icon`, but every other named surface still
 * passed the raw string into `aria-label`. A computed empty label therefore
 * published an empty name, a padded one published its padding, and `Spinner`'s
 * documented "Loading" default was erased by `label="   "`.
 *
 * Each component's own element-tree suite carries its blank and padded case;
 * this file pins the one rule they all share, so a new surface has a single
 * place to learn what "blank" means.
 */

import { describe, expect, it } from "vitest";
import { ariaName, ariaNameOr } from "./internal.js";

describe("ariaName", () => {
  it("treats an absent, empty or whitespace-only label as absent", () => {
    expect(ariaName(undefined)).toBeUndefined();
    expect(ariaName("")).toBeUndefined();
    expect(ariaName("   ")).toBeUndefined();
  });

  it("trims a label that says something", () => {
    expect(ariaName("Save")).toBe("Save");
    expect(ariaName("  Save  ")).toBe("Save");
  });
});

describe("ariaNameOr", () => {
  it("keeps a documented default when the caller's label is blank", () => {
    expect(ariaNameOr(undefined, "Loading")).toBe("Loading");
    expect(ariaNameOr("", "Loading")).toBe("Loading");
    expect(ariaNameOr("   ", "Loading")).toBe("Loading");
  });

  it("prefers a real label, trimmed", () => {
    expect(ariaNameOr("  Saving  ", "Loading")).toBe("Saving");
  });
});
