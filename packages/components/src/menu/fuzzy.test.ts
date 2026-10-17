/**
 * The command palette's ranked subsequence matcher.
 *
 * The bugs these guard: a substring rule that rejected initials; a scorer that
 * let a mid-word run outrank a word start; a global score sort that interleaved
 * groups and repeated headings; a tie that reordered the list; an empty query
 * that changed the palette's order; and a filter that reported the wrong
 * declaration index.
 */

import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  fuzzyMatches,
  fuzzyScore,
  rankByGroup,
  type FuzzyMatch,
} from "./fuzzy.js";

/** A score, or `-1` for "no match", so comparisons read as numbers. */
const score = (query: string, text: string): number =>
  Option.getOrElse(fuzzyScore(query, text), () => -1);

interface Entry {
  readonly id: string;
  readonly label: string;
  readonly group?: string;
}

const entries: ReadonlyArray<Entry> = [
  { id: "open", label: "Open file", group: "File" },
  { id: "reopen", label: "Reopen file", group: "File" },
  { id: "goto", label: "Go to line", group: "Navigation" },
  { id: "save", label: "Save", group: "File" },
  { id: "about", label: "About" },
];

const textOf = (entry: Entry): string => entry.label;
const groupOf = (entry: Entry): string | undefined => entry.group;
const ids = (found: ReadonlyArray<FuzzyMatch<Entry>>): ReadonlyArray<string> =>
  found.map((match) => match.item.id);

describe("command menu fuzzy matching", () => {
  it("matches everything with zero for an empty query", () => {
    expect(score("", "Open file")).toBe(0);
    expect(score("   ", "Open file")).toBe(0);
  });

  it("ignores case and trims the query", () => {
    expect(score(" Open ", "open file")).toBeGreaterThan(0);
    expect(score("OPEN", "Open file")).toBeGreaterThan(0);
  });

  it("ranks a word start above a mid-word run", () => {
    expect(score("open", "Open file")).toBeGreaterThan(
      score("open", "Reopen file"),
    );
  });

  it("treats a separator as a word start", () => {
    expect(score("of", "Open file")).toBeGreaterThan(score("of", "Proofread"));
  });

  it("matches a non-contiguous subsequence and rejects a non-subsequence", () => {
    expect(score("opfl", "Open file")).toBeGreaterThan(0);
    expect(Option.isNone(fuzzyScore("zzz", "Open file"))).toBe(true);
  });

  it("rejects a query longer than the label", () => {
    expect(Option.isNone(fuzzyScore("openfilex", "Open file"))).toBe(true);
  });

  it("consumes a distinct character for each repeated query letter", () => {
    expect(score("oo", "Open tool")).toBeGreaterThan(0);
    expect(Option.isNone(fuzzyScore("oo", "Open file"))).toBe(true);
  });

  it("keeps declaration order and the original index", () => {
    const found = fuzzyMatches(entries, "o", textOf);

    expect(ids(found)).toEqual(["open", "reopen", "goto", "about"]);
    expect(found.map((match) => match.index)).toEqual([0, 1, 2, 4]);
  });

  it("keeps groups in first-appearance order", () => {
    const found = fuzzyMatches(entries, "o", textOf);

    expect(rankByGroup(found, groupOf).map((entry) => entry.id)).toEqual([
      "open",
      "reopen",
      "goto",
      "about",
    ]);
  });

  it("ranks inside a group by score", () => {
    const file = entries.slice(0, 2);
    const found = fuzzyMatches(file, "open", textOf);

    expect(rankByGroup(found, groupOf).map((entry) => entry.id)).toEqual([
      "open",
      "reopen",
    ]);
  });

  it("breaks score ties by declaration order", () => {
    const tied: ReadonlyArray<Entry> = [
      { id: "folder", label: "Open folder", group: "File" },
      { id: "file", label: "Open file", group: "File" },
    ];
    const found = fuzzyMatches(tied, "open", textOf);

    expect(rankByGroup(found, groupOf).map((entry) => entry.id)).toEqual([
      "folder",
      "file",
    ]);
  });

  it("drops a group with no match and keeps ungrouped rows together", () => {
    const found = fuzzyMatches(entries, "a", textOf);
    const ranked = rankByGroup(found, groupOf).map((entry) => entry.id);

    expect(ranked).not.toContain("goto");
    expect(ranked).toEqual(["save", "about"]);
  });
});
