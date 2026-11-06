import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

const sourcesUnder = (relative: string): ReadonlyArray<string> => {
  const directory = fileURLToPath(new URL(relative, packageRoot));
  return Arr.flatMap(
    readdirSync(directory, { withFileTypes: true }),
    (entry) => {
      const path = `${relative}${entry.name}`;
      if (entry.isDirectory()) return sourcesUnder(`${path}/`);
      if (Str.includes(".test.")(entry.name)) return [];
      return /\.(mdx|md|tsx?)$/.test(entry.name) ? [path] : [];
    },
  );
};

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

const files: ReadonlyArray<string> = [
  ...sourcesUnder("docs/"),
  ...sourcesUnder("src/"),
  "../../.agents/slop/COMPONENTS.md",
  "../../docs/component-api.md",
];

const retracted = [
  "delivers its focus handler",
  "does deliver `onFocus`",
  "traversal delivers the event",
  "traversal delivers that event",
  "focuses=1",
  "opens on the traversal",
  "open-on-focus would work",
  "holds the clock too",
];

const measured = "without running its `onFocus`";

const offenders = Arr.flatMap(files, (file) =>
  Arr.filterMap(Str.split(read(file), "\n"), (line, index) =>
    Option.match(
      Arr.findFirst(retracted, (phrase) => Str.includes(phrase)(line)),
      {
        onNone: () => Result.failVoid,
        onSome: (phrase) =>
          Result.succeed(`${file}:${index + 1} repeats "${phrase}"`),
      },
    ),
  ),
);

describe("the focus a traversal delivers", () => {
  it("is not promised by an owned page, comment or inventory row", () => {
    expect(offenders).toEqual([]);
  });

  it("is stated in the API spec with the probes that measured it", () => {
    const section = read("../../docs/component-api.md");

    expect(section).toContain(measured);
    expect(section).toContain("tabs-lifecycle");
    expect(section).toContain("tooltip-lifecycle");
    expect(section).toContain("focuses=0");
    expect(section).toContain("keyboardRing");
  });

  it("reads the files it is meant to check", () => {
    expect(files.length).toBeGreaterThanOrEqual(60);
    expect(Arr.length(sourcesUnder("docs/"))).toBeGreaterThanOrEqual(40);
  });
});
