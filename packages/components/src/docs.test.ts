/**
 * The package's page contract.
 *
 * Fifteen of the thirty-nine Tier 2 pages shipped no prop documentation at all —
 * no `## API` heading and no table — although `docs/component-api.md` is the
 * shared spec and MISSION requires API docs on every component page. The docs
 * site only rendered the gap, so nothing failed. This suite holds every page to
 * the minimum a consumer who copies the component needs: frontmatter, a runnable
 * import, and an `## API` section whose table names parts and their props.
 *
 * `node:fs` is a test-time repository read, the boundary `inventory.test.ts` and
 * `docs-counts.test.ts` already use.
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const docsDir = new URL("../docs/", import.meta.url);
const pages = Arr.filter(readdirSync(docsDir), Str.endsWith(".mdx"));

const read = (page: string): string =>
  readFileSync(fileURLToPath(new URL(page, docsDir)), "utf8");

/** The text under one `## ` heading, `None` when the page has no such heading. */
const section = (source: string, heading: string): string | undefined => {
  const start = source.indexOf(`\n${heading}\n`);
  if (start < 0) return undefined;
  const rest = source.slice(start + heading.length + 2);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
};

/** The header and body rows of the first table in a section. */
const table = (
  source: string,
):
  | {
      readonly cells: number;
      readonly rows: ReadonlyArray<string>;
    }
  | undefined => {
  const lines = source.split("\n");
  const headerIndex = lines.findIndex(
    (line, index) =>
      line.startsWith("|") &&
      /\/?\s*(Part|Prop)/i.test(line) &&
      (lines[index + 1] ?? "").startsWith("|"),
  );
  if (headerIndex < 0) return undefined;

  const cells = cellsOf(lines[headerIndex] ?? "");
  const rows = Arr.takeWhile(Arr.drop(lines, headerIndex + 2), (line) =>
    line.startsWith("|"),
  );
  return { cells: Arr.length(cells), rows };
};

/** The cells of one table line; an escaped `\|` is text, not a column. */
const cellsOf = (line: string): ReadonlyArray<string> =>
  Arr.map(line.split(/(?<!\\)\|/).slice(1, -1), (cell) => cell.trim());

describe("component pages", () => {
  it("has a page for every component and a title and description on each", () => {
    const problems = Arr.flatMap(pages, (page) => {
      const source = read(page);
      const missing = Arr.filter(
        ["title:", "description:"],
        (field) =>
          !source.startsWith(`---\n`) || !source.includes(`\n${field} `),
      );
      return missing.length === 0
        ? []
        : [`${page}: frontmatter lacks ${Arr.join(missing, ", ")}`];
    });

    expect(problems).toEqual([]);
  });

  it("shows an import a reader can copy", () => {
    const problems = Arr.filter(
      pages,
      (page) => !read(page).includes("@gpuixui/components"),
    ).map((page) => `${page}: no @gpuixui/components import`);

    expect(problems).toEqual([]);
  });

  it("documents the parts and props of every component", () => {
    const problems = Arr.flatMap(pages, (page) => {
      const api = section(read(page), "## API");
      if (api === undefined) return [`${page}: no ## API section`];

      const found = table(api);
      if (found === undefined) {
        return [`${page}: ## API has no table headed Part or Prop`];
      }
      if (found.rows.length === 0) {
        return [`${page}: ## API table has no rows`];
      }

      return Arr.flatMap(found.rows, (row) => {
        const cells = cellsOf(row);
        const named = (cells[0] ?? "").includes("`");
        if (cells.length !== found.cells) {
          return [
            `${page}: API row has ${cells.length} cells, the header has ${found.cells}`,
          ];
        }
        return named ? [] : [`${page}: API row does not name a part or prop`];
      });
    });

    expect(problems).toEqual([]);
  });

  it("reads the pages it is meant to check", () => {
    expect(pages.length).toBeGreaterThanOrEqual(39);
  });
});
