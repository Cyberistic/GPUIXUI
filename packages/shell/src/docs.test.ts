/**
 * Every shell page's `## API` table against the props its parts declare.
 *
 * The gap guarded: the shell pages name each part and its props in a
 * `Part | Renders | Props` map kept by hand, so a prop the component renamed
 * kept being taught, and nothing checked the map at all. Each name in the
 * Props column must be declared by a `*Props` interface the package ships (or
 * be the host surface every part inherits); the floor keeps a broken reader
 * from passing on an empty set.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const root = fileURLToPath(new URL("./", import.meta.url));

/** Every TypeScript source the package ships, read once. */
const sources = (): ReadonlyArray<string> =>
  (["app-menu", "status-bar", "toolbar", "behaviour"] as const).flatMap(
    (directory) =>
      readdirSync(`${root}${directory}`)
        .filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"))
        .map((name) => read(`./${directory}/${name}`)),
  );

/** The props every `*Props` interface in those sources declares. */
const declaredProps = (): ReadonlySet<string> => {
  const names = sources().flatMap((source) =>
    Arr.fromIterable(source.matchAll(/^ {2}readonly ([A-Za-z]+)\??:/gm)).map(
      (match) => match[1] ?? "",
    ),
  );
  return new Set(names);
};

/** The surface a part may inherit rather than declare. */
const INHERITED: ReadonlySet<string> = new Set([
  "aria-id",
  "children",
  "className",
  "onLayout",
  "ref",
  "style",
  "testId",
]);

/**
 * The names one Props cell documents.
 *
 * A cell writes an optional prop with a trailing `?` and a required one with
 * `(required)` beside it, so both are read away before the name is checked.
 */
const namesIn = (cell: string): ReadonlyArray<string> =>
  Arr.map(Arr.fromIterable(cell.matchAll(/`([A-Za-z][\w-]*)\??`/g)), (match) =>
    String(match[1]),
  );

const PAGES = [
  "../docs/app-menu.mdx",
  "../docs/status-bar.mdx",
  "../docs/toolbar.mdx",
] as const;

/** The props every part row on a page documents. */
const documentedProps = (page: string): ReadonlyArray<string> => {
  const start = page.indexOf("## API");
  if (start < 0) return [];
  const rest = page.slice(start);
  const end = rest.indexOf("\n## ", 1);
  const section = end < 0 ? rest : rest.slice(0, end);
  return Arr.flatMap(Str.split(section, "\n"), (line) =>
    Str.startsWith("| `")(line) ? namesIn(Str.split(line, "|")[3] ?? "") : [],
  );
};

describe.each(PAGES)("the $page page", (page) => {
  it("names only props a part declares", () => {
    const declared = declaredProps();
    const documented = documentedProps(read(page));

    // Floors: a reader that resolved nothing, or a page that lost its map,
    // cannot pass vacuously.
    expect(declared.size).toBeGreaterThan(10);
    expect(documented.length).toBeGreaterThan(3);
    expect(
      Arr.filter(
        documented,
        (name) => !declared.has(name) && !INHERITED.has(name),
      ),
    ).toEqual([]);
  });
});
