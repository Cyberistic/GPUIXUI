/**
 * The focus-event claim the library's keyboard rules rest on.
 *
 * The bug this guards: four Tier 2 inventory rows, six component pages and the
 * shared API spec taught that a window's `Tab` traversal focuses an element
 * **without delivering its focus handler**, and Preview Card explained its
 * open-on-press policy with the same claim. The playground's probe had read the
 * frame before the event landed; re-measured on 0.11.0, `tabs-lifecycle` reads
 * `focuses=1` and `tooltip-lifecycle` opens its tip on the traversal, so the
 * event arrives. The retracted absolute is now a false statement in a library
 * whose keyboard advice a consumer follows, so this suite fails on any owned
 * page, source comment or inventory row that repeats it, and holds the spec and
 * the six `focused` pages to the measured rule.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

/** Every readable file under `relative`, recursively, minus test suites. */
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
  "../../COMPONENTS.md",
  "../../docs/component-api.md",
];

/** The sentences that claim the runtime does not deliver a focus event. */
const retracted = [
  "without delivering",
  "delivers no focus",
  "delivers no such event",
  "does not deliver that event",
  "does not deliver the event",
  "without running its focus handler",
  "without running its handler",
  "reports no focus event",
];

/** `file:line — phrase`, so a failure names what to fix. */
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

/** The six pages that list a `focused` state in their `StateStyle` table. */
const focusedPages = [
  "accordion",
  "collapsible",
  "field",
  "search-input",
  "tabs",
  "time-picker",
] as const;

describe("the focus a traversal delivers", () => {
  it("is not denied by an owned page, comment or inventory row", () => {
    expect(offenders).toEqual([]);
  });

  it("is stated once in the API spec, with the probe it was measured by", () => {
    const section = read("../../docs/component-api.md");

    expect(section).toContain("delivers its focus handler");
    expect(section).toContain("tabs-lifecycle");
    expect(section).toContain("focuses=1");
  });

  it("is repeated on every page that documents a focused state", () => {
    const silent = Arr.filter(
      focusedPages,
      (page) =>
        !Str.includes("traversal delivers")(read(`docs/${page}.mdx`)) &&
        !Str.includes("delivers the event")(read(`docs/${page}.mdx`)),
    );

    expect(silent).toEqual([]);
  });

  it("names the hold a traversal gives a toast, and the press a card needs", () => {
    expect(read("docs/toast.mdx")).toContain(
      "A `Tab` traversal delivers that event",
    );
    expect(read("docs/preview-card.mdx")).toContain("it is a policy choice");
  });

  it("reads the files it is meant to check", () => {
    expect(files.length).toBeGreaterThanOrEqual(60);
    expect(Arr.length(sourcesUnder("docs/"))).toBeGreaterThanOrEqual(40);
  });
});
