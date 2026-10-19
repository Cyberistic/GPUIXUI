/**
 * Tag-input rules.
 *
 * The bugs these guard: a whitespace-only token, a duplicate chip, a cap that
 * truncates existing tokens, and a removal that takes more than one match.
 */

import { describe, expect, it } from "vitest";
import { addTokens, editDraft, removeToken, splitDraft } from "./logic.js";

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

describe("editDraft", () => {
  it("keeps a single typed segment as the draft", () => {
    expect(editDraft("des")).toEqual({ add: [], draft: "des" });
  });

  it("commits before a typed comma and keeps the tail empty", () => {
    expect(editDraft("a,")).toEqual({ add: ["a"], draft: "" });
  });

  it("commits every token in a pasted list", () => {
    expect(editDraft("a,b")).toEqual({ add: ["a", "b"], draft: "" });
    expect(editDraft(" a , b ")).toEqual({ add: ["a", "b"], draft: "" });
  });

  it("does not add whitespace-only tokens from a paste", () => {
    expect(editDraft(" , ,a")).toEqual({ add: ["a"], draft: "" });
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

  it("truncates a fractional cap", () => {
    expect(addTokens(["a"], ["b"], { max: 1.5 })).toEqual(["a"]);
    expect(addTokens([], ["a", "b"], { max: 1.5 })).toEqual(["a"]);
  });

  it("treats a non-finite cap as no cap", () => {
    expect(addTokens(["a"], ["b"], { max: Number.NaN })).toEqual(["a", "b"]);
    expect(addTokens([], ["a"], { max: Number.POSITIVE_INFINITY })).toEqual([
      "a",
    ]);
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
