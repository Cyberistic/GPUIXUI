/**
 * The `SearchReplace` inventory record against the bar it describes.
 *
 * The bug guarded: the bar gained `Aa` (match case) and `W` (whole word)
 * toggles, and its exported record still read "a literal, case-sensitive scan
 * — no regex, no whole-word, no case toggle" — a consumer reading the record
 * was told two controls the component ships do not exist. Nothing held the
 * record to the component, because the package's docs suite reads pages.
 *
 * The record is read as source rather than imported: the bar is a renderer
 * module, and the unit suite is a Node project with no host (the behaviour
 * config renders it). `node:fs` is a test-time repository read, the boundary
 * `packages/components/src/inventory.test.ts` and this package's `docs.test.ts`
 * already use.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

/** A file beside this test, read as text. */
const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/** Whether a path the record names exists in the package. */
const ships = (relative: string): boolean =>
  existsSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)));

const SOURCE = read("./search-replace.tsx");

/** Where the record starts; a missing record is a broken suite, not a pass. */
const recordStart = (): number => {
  const start = SOURCE.indexOf("export const searchReplaceMeta");
  if (start < 0) {
    throw new Error("meta: the SearchReplace record is gone");
  }
  return start;
};

/** The record's source, without the component above it. */
const record = (): string => SOURCE.slice(recordStart());

describe("the SearchReplace record", () => {
  it("does not deny the toggles the bar ships", () => {
    const meta = record();

    expect(meta).not.toContain("no whole-word");
    expect(meta).not.toContain("no case toggle");
    expect(meta).not.toContain("case-sensitive scan");
    // The one matching limit that is still true stays documented.
    expect(meta).toContain("no regex");
  });

  it("names both toggles the bar feeds the matcher", () => {
    const bar = SOURCE.slice(0, recordStart());

    // The premise: the controls and their options are on the shipped path.
    expect(bar).toContain('label="Match case"');
    expect(bar).toContain('label="Match whole word"');
    expect(bar).toContain("caseSensitive: matchCase");
    expect(bar).toContain("wholeWord");

    const meta = record();
    expect(meta).toContain("match case");
    expect(meta).toContain("whole word");
  });

  it("names files the package ships", () => {
    const named = Arr.fromIterable(
      record().matchAll(/(?:docs|example|testFile): "([^"]+)"/g),
    ).map((match) => match[1] ?? "");

    // A floor: the record names its page, example and test.
    expect(named.length).toBeGreaterThanOrEqual(3);
    expect(Arr.filter(named, (path) => !ships(path))).toEqual([]);
  });
});
