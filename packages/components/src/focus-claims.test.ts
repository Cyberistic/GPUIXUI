/**
 * The focus-event claim the library's keyboard rules rest on.
 *
 * The bug this guards: the package taught that a window's `Tab` traversal
 * focuses an element **and runs its focus handler** — the API spec, six pages
 * that document a `focused` state, four inventory rows and the toast's clock
 * advice all rested on it, and this suite asserted the probe's `focuses=1`.
 * Re-measured on a clean build at HEAD, both live probes read the opposite:
 * `tabs-lifecycle` reports `focuses=0` while `focusedId` still names the
 * trigger, and `tooltip-lifecycle`'s tip does not open on the traversal. An
 * earlier run had read one, so the handler is not a channel a component may
 * depend on: the ring declared at rest is the cue, and every key path anchors on
 * the key's own element. This suite fails on any owned page, source comment or
 * inventory row that promises the handler, and holds the spec and the pages that
 * document `focused` to the measured rule.
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

/** The sentences that promise a traversal runs the element's focus handler. */
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

/** The measured rule every surface that documents `focused` must carry. */
const measured = "without running its `onFocus`";

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

  it("is repeated on every page that documents a focused state", () => {
    const silent = Arr.filter(
      focusedPages,
      (page) => !Str.includes(measured)(read(`docs/${page}.mdx`)),
    );

    expect(silent).toEqual([]);
  });

  it("keeps a toast's clock off the traversal, and a card's open off it", () => {
    const toast = read("docs/toast.mdx");

    expect(toast).toContain("A traversal does not hold the clock");
    expect(toast).toContain("duration: 0");
    expect(read("docs/preview-card.mdx")).toContain(
      "A `Tab` traversal opens nothing",
    );
  });

  it("reads the files it is meant to check", () => {
    expect(files.length).toBeGreaterThanOrEqual(60);
    expect(Arr.length(sourcesUnder("docs/"))).toBeGreaterThanOrEqual(40);
  });
});
