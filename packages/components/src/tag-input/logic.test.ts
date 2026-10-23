/**
 * Tag-input rules.
 *
 * The bugs these guard: a whitespace-only token, a duplicate chip, a cap that
 * truncates existing tokens or admits one token more than it names, an
 * unreadable cap that hides the field, and a removal that takes more than one
 * match.
 */

import { describe, expect, it } from "vitest";
import { addTokens, removeToken, splitDraft } from "./logic.js";

describe("splitDraft", () => {
  it("trims and drops empty tokens", () => {
    expect(splitDraft(" a , ,b ")).toEqual(["a", "b"]);
  });

  it("splits a pasted list", () => {
    expect(splitDraft("a,b")).toEqual(["a", "b"]);
  });

  it("returns nothing for an empty draft", () => {
    expect(splitDraft("")).toEqual([]);
  });
});

describe("addTokens", () => {
  it("appends in order", () => {
    expect(addTokens(["a"], ["b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("refuses duplicates by default", () => {
    expect(addTokens(["a"], ["a", "b"])).toEqual(["a", "b"]);
  });

  it("keeps duplicates when asked", () => {
    expect(addTokens(["a"], ["a"], { allowDuplicates: true })).toEqual([
      "a",
      "a",
    ]);
  });

  it("stops at the cap without truncating what is there", () => {
    expect(addTokens(["a", "b"], ["c", "d"], { max: 3 })).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(addTokens(["a", "b"], ["c"], { max: 2 })).toEqual(["a", "b"]);
  });

  it("floors a maximum that names part of a token", () => {
    // A cap is often a budget over a measured width (`width / chipWidth`), and
    // a maximum is a whole count: 2.7 admits two tokens, not three.
    expect(addTokens([], ["a", "b", "c", "d"], { max: 2.7 })).toEqual([
      "a",
      "b",
    ]);
  });

  it("reads a maximum it cannot measure as no cap", () => {
    // An unreadable cap is not an observation: the field keeps accepting, the
    // way it does with no `max` at all, rather than refusing every token.
    expect(addTokens([], ["a", "b"], { max: Number.NaN })).toEqual(["a", "b"]);
    expect(
      addTokens([], ["a", "b"], { max: Number.POSITIVE_INFINITY }),
    ).toEqual(["a", "b"]);
  });

  it("returns an equivalent list when nothing can be added", () => {
    expect(addTokens(["a"], [])).toEqual(["a"]);
    expect(addTokens([], ["a"], { max: 0 })).toEqual([]);
  });
});

describe("removeToken", () => {
  it("removes the first exact match only", () => {
    expect(removeToken(["a", "b", "a"], "a")).toEqual(["b", "a"]);
  });

  it("is a no-op for an absent token", () => {
    expect(removeToken(["a"], "b")).toEqual(["a"]);
  });
});
