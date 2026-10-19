/**
 * Mention token rules.
 *
 * The bugs these guard: an email address treated as a mention, a query that
 * survives whitespace, a token replaced from the wrong position, prefix matches
 * ranked behind substrings, and a cap that reorders names.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { applyMention, mentionQuery, rankMentions } from "./logic.js";

describe("mentionQuery", () => {
  it("opens an empty query on a trailing @", () => {
    expect(mentionQuery("@")).toEqual(Option.some({ start: 0, query: "" }));
  });

  it("opens after whitespace", () => {
    expect(mentionQuery("hi @")).toEqual(Option.some({ start: 3, query: "" }));
  });

  it("carries the typed query", () => {
    expect(mentionQuery("hi @an")).toEqual(
      Option.some({ start: 3, query: "an" }),
    );
  });

  it("ignores an @ inside a word", () => {
    expect(mentionQuery("email@example")).toEqual(Option.none());
  });

  it("closes once whitespace follows", () => {
    expect(mentionQuery("@a b")).toEqual(Option.none());
  });

  it("uses the last token", () => {
    expect(mentionQuery("@a @b")).toEqual(
      Option.some({ start: 3, query: "b" }),
    );
  });
});

describe("applyMention", () => {
  it("replaces only the token and appends a space", () => {
    expect(applyMention("hi @an", 3, "ana")).toBe("hi @ana ");
  });

  it("replaces from the start", () => {
    expect(applyMention("@a", 0, "ana")).toBe("@ana ");
  });
});

describe("rankMentions", () => {
  it("puts prefix matches before substring matches", () => {
    expect(rankMentions(["ana", "joana", "anna"], "an", 6)).toEqual([
      "ana",
      "anna",
      "joana",
    ]);
  });

  it("is case-insensitive", () => {
    expect(rankMentions(["Ana", "Bo"], "an", 6)).toEqual(["Ana"]);
  });

  it("keeps declaration order within a tier", () => {
    expect(rankMentions(["zoe", "anna", "ana"], "an", 6)).toEqual([
      "anna",
      "ana",
    ]);
  });

  it("caps the visible list", () => {
    expect(rankMentions(["ana", "anna", "joana"], "", 2)).toEqual([
      "ana",
      "anna",
    ]);
  });

  it("shows every match when the cap is not a number", () => {
    expect(rankMentions(["ana", "anna", "joana"], "an", Number.NaN)).toEqual([
      "ana",
      "anna",
      "joana",
    ]);
  });
});
