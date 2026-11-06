import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const root = fileURLToPath(new URL("./", import.meta.url));

const sources = (): ReadonlyArray<string> =>
  (["app-menu", "status-bar", "toolbar", "behaviour"] as const).flatMap(
    (directory) =>
      readdirSync(`${root}${directory}`)
        .filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"))
        .map((name) => read(`./${directory}/${name}`)),
  );

const declaredProps = (): ReadonlySet<string> => {
  const names = sources().flatMap((source) =>
    Arr.fromIterable(source.matchAll(/^ {2}readonly ([A-Za-z]+)\??:/gm)).map(
      (match) => match[1] ?? "",
    ),
  );
  return new Set(names);
};

const INHERITED: ReadonlySet<string> = new Set([
  "aria-id",
  "children",
  "className",
  "onLayout",
  "ref",
  "style",
  "testId",
]);

const namesIn = (cell: string): ReadonlyArray<string> =>
  Arr.map(Arr.fromIterable(cell.matchAll(/`([A-Za-z][\w-]*)\??`/g)), (match) =>
    String(match[1]),
  );

const PAGES = [
  "../docs/app-menu.mdx",
  "../docs/status-bar.mdx",
  "../docs/toolbar.mdx",
] as const;

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
