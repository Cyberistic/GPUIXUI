import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pipe } from "effect";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const docsDir = new URL("../docs/", import.meta.url);
const pages = Arr.filter(readdirSync(docsDir), Str.endsWith(".mdx"));

const read = (page: string): string =>
  readFileSync(fileURLToPath(new URL(page, docsDir)), "utf8");

const section = (source: string, heading: string): string | undefined => {
  const start = source.indexOf(`\n${heading}\n`);
  if (start < 0) return undefined;
  const rest = source.slice(start + heading.length + 2);
  const end = rest.indexOf("\n## ");
  return end < 0 ? rest : rest.slice(0, end);
};

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

const cellsOf = (line: string): ReadonlyArray<string> =>
  Arr.map(line.split(/(?<!\\)\|/).slice(1, -1), (cell) => cell.trim());

const YAML_RESERVED = /^[`@*&[\]{}>|%#]/;

const frontmatter = (source: string): string =>
  /^---\n([\s\S]*?)\n---\n/.exec(source)?.[1] ?? "";

const prose = (source: string): string =>
  source
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "");

const mdxProblems = (page: string, source: string): ReadonlyArray<string> => {
  const head = frontmatter(source);

  const missing =
    /^title: .+/m.test(head) && /^description: .+/m.test(head)
      ? []
      : [`${page}: no title or description`];

  const unquoted = Arr.flatMap(head.split("\n"), (line) => {
    const [, value = ""] = /^[a-z]+:\s*(.*)$/.exec(line) ?? [];
    const quoted = value.startsWith('"') || value.startsWith("'");
    return YAML_RESERVED.test(value) && !quoted ? [`${page}: ${value}`] : [];
  });

  const jsx = Arr.map(
    Arr.filter(
      prose(source).split("\n"),
      (line) => /<[A-Za-z/]/.test(line) && !line.includes("<ComponentPreview"),
    ),
    (line) => `${page}: ${line.trim()}`,
  );

  return [...missing, ...unquoted, ...jsx];
};

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

  it("compiles as MDX for the site that mounts it", () => {
    const problems = Arr.flatMap(pages, (page) =>
      mdxProblems(page, read(page)),
    );

    expect(problems).toEqual([]);
  });

  it("reads the pages it is meant to check", () => {
    expect(pages.length).toBeGreaterThanOrEqual(39);
  });
});

const capabilityRecord = readFileSync(
  fileURLToPath(
    new URL("../../../docs/gpuix-capabilities.md", import.meta.url),
  ),
  "utf8",
);

describe("the announcement an alert page may promise", () => {
  it("rests on the record's verdict, not on a screen reader's behaviour", () => {
    const verdict = pipe(
      Arr.findFirst(capabilityRecord.split("\n"), (line) =>
        line.startsWith("| Live regions"),
      ),
      Option.match({
        onNone: () => "",
        onSome: (row) => row,
      }),
    );

    expect(
      verdict,
      "docs/gpuix-capabilities.md no longer records Live regions as unsupported",
    ).toContain("not supported");
    expect(verdict).toContain("aria-live");
  });
});
