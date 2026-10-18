/**
 * Guards the replace rule (plan 333).
 *
 * The bugs these catch: an empty query splitting into characters, a
 * replacement re-scanned as input (`error` -> `error!` growing), a `$&` in the
 * replacement being interpreted, and an off-by-one in the count — each would
 * make the `replace-contract` probe report a rewrite it never performed.
 */
import { describe, expect, it } from "@effect/vitest";
import { replaceAll, replaceFirst } from "./replace-core.js";

const SOURCE = "The error handler logs an error.";

describe("replaceFirst", () => {
  it("rewrites only the first literal occurrence", () => {
    expect(replaceFirst(SOURCE, "error", "issue")).toEqual({
      text: "The issue handler logs an error.",
      count: 1,
    });
  });

  it("leaves a source with no match untouched", () => {
    expect(replaceFirst(SOURCE, "warning", "issue")).toEqual({
      text: SOURCE,
      count: 0,
    });
  });

  it("is inert for an empty query", () => {
    expect(replaceFirst(SOURCE, "", "x")).toEqual({ text: SOURCE, count: 0 });
  });

  it("treats a replacement as text, never as a pattern", () => {
    expect(replaceFirst(SOURCE, "error", "$&!")).toEqual({
      text: "The $&! handler logs an error.",
      count: 1,
    });
  });
});

describe("replaceAll", () => {
  it("rewrites every literal occurrence and counts them", () => {
    expect(replaceAll(SOURCE, "error", "issue")).toEqual({
      text: "The issue handler logs an issue.",
      count: 2,
    });
  });

  it("does not re-scan its own output", () => {
    expect(replaceAll(SOURCE, "error", "error!")).toEqual({
      text: "The error! handler logs an error!.",
      count: 2,
    });
  });

  it("matches inside a longer word, because the rule is literal", () => {
    expect(replaceAll("errors and error", "error", "issue")).toEqual({
      text: "issues and issue",
      count: 2,
    });
  });

  it("is inert for an empty query and for a missing match", () => {
    expect(replaceAll(SOURCE, "", "x")).toEqual({ text: SOURCE, count: 0 });
    expect(replaceAll(SOURCE, "nope", "x")).toEqual({ text: SOURCE, count: 0 });
  });
});
