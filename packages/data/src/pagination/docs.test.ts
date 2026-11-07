import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../../", import.meta.url);

const readSource = (file: string): string =>
  readFileSync(new URL(file, packageRoot), "utf8");

const page = readSource("docs/virtualization.mdx");

const sectionOf = (text: string): string => {
  const start = text.indexOf("## Paging versus windowing");
  if (start === -1) return "";
  const end = text.indexOf("\n## ", start + 1);
  return end === -1 ? text.slice(start) : text.slice(start, end);
};

const section = sectionOf(page);

const interfaceBody = (source: string, name: string): string => {
  const start = source.indexOf(`export interface ${name}`);
  const end = source.indexOf("\n}\n", start);
  return start === -1 || end === -1 ? "" : source.slice(start, end);
};

const members = (body: string): ReadonlyArray<string> => [
  ...new Set(
    [...body.matchAll(/^\s+readonly (\w+)\??:/gm)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
  ),
];

const exported = (source: string): ReadonlyArray<string> => [
  ...new Set(
    [...source.matchAll(/^export (?:const|type) (\w+)/gm)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
  ),
];

const table = readSource("src/use-table.ts");
const controller = members(interfaceBody(table, "TableController"));
const options = members(interfaceBody(table, "UseTableOptions"));
const rules = exported(readSource("src/pagination/logic.ts"));

const paged = controller.filter((name) =>
  /^(?:rows|keys|kept|selectedCount|allSelected|someSelected|pageIndex|pageCount|pageSize|setPageIndex|setPageSize|nextPage|previousPage)$/.test(
    name,
  ),
);

const tableNames = (text: string): ReadonlyArray<string> =>
  text
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| Member"))
    .flatMap((line) =>
      [...line.matchAll(/`([A-Za-z]+)`/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      ),
    );

describe("the paging section", () => {
  it("documents every member the controller pages by", () => {
    const rows = tableNames(section);
    expect(paged.length).toBeGreaterThanOrEqual(12);
    expect(paged.filter((name) => !rows.includes(name))).toEqual([]);
  });

  it("names every exported page rule", () => {
    expect(rules.length).toBeGreaterThanOrEqual(8);
    expect(rules.filter((name) => !section.includes(name))).toEqual([]);
  });

  it("documents the page-size option the controller takes", () => {
    expect(options).toContain("pageSize");
    expect(section).toContain("`pageSize` (option)");
  });

  it("names only members the controller or its options declare", () => {
    const documented = [...section.matchAll(/^\| `([A-Za-z/ ]+)`/gm)].flatMap(
      (match) =>
        (match[1] ?? "")
          .split("/")
          .map((name) => name.trim())
          .filter((name) => name.length > 0),
    );
    const declared = [...controller, ...options];
    expect(documented).not.toEqual([]);
    expect(
      documented.filter(
        (name) =>
          !declared.includes(name) &&
          !rules.includes(name) &&
          !["API", "none"].includes(name),
      ),
    ).toEqual([]);
  });

  it("cites the suites and the example it measures", () => {
    const cited = [
      "src/pagination/logic.test.ts",
      "src/behaviour/table-pagination.test.tsx",
      "src/behaviour/pagination-example.test.tsx",
      "examples/table-pagination.example.tsx",
    ];
    expect(
      cited.filter((file) => !existsSync(new URL(file, packageRoot))),
    ).toEqual([]);
    expect(section).toContain("pagination/logic.test.ts");
    expect(section).toContain("behaviour/table-pagination");
    expect(section).toContain("behaviour/pagination-example");
    expect(section).toContain("examples/table-pagination.example.tsx");
  });
});
