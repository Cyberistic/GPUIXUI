import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const ships = (relative: string): boolean =>
  existsSync(fileURLToPath(new URL(`../../${relative}`, import.meta.url)));

const SOURCE = read("./search-replace.tsx");

const recordStart = (): number => {
  const start = SOURCE.indexOf("export const searchReplaceMeta");
  if (start < 0) {
    throw new Error("meta: the SearchReplace record is gone");
  }
  return start;
};

const record = (): string => SOURCE.slice(recordStart());

describe("the SearchReplace record", () => {
  it("does not deny the toggles the bar ships", () => {
    const meta = record();

    expect(meta).not.toContain("no whole-word");
    expect(meta).not.toContain("no case toggle");
    expect(meta).not.toContain("case-sensitive scan");

    expect(meta).toContain("no regex");
  });

  it("names both toggles the bar feeds the matcher", () => {
    const bar = SOURCE.slice(0, recordStart());

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

    expect(named.length).toBeGreaterThanOrEqual(3);
    expect(Arr.filter(named, (path) => !ships(path))).toEqual([]);
  });
});
