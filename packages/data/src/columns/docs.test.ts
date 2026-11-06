import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const page = read("../../docs/column-configuration.mdx");
const menu = read("./menu.tsx");
const divider = read("./divider.tsx");
const controller = read("./use-columns.ts");

const declaredProps = (source: string, name: string): ReadonlyArray<string> => {
  const body = new RegExp(
    `export interface ${name} \\{([\\s\\S]*?)\\n\\}`,
  ).exec(source)?.[1];
  if (body === undefined) throw new Error(`no ${name} interface`);
  return [...body.matchAll(/^ {2}readonly (\w+)\??:/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
};

const documentedProps = (
  source: string,
  heading: string,
): ReadonlyArray<string> => {
  const section = new RegExp(
    `^### \`${heading}\`\\n([\\s\\S]*?)(?=^#{2,3} |$(?![\\s\\S]))`,
    "m",
  ).exec(source)?.[1];
  if (section === undefined) throw new Error(`no ${heading} section`);
  return Arr.dedupe(
    [...section.matchAll(/^\| (.+?) \|/gm)].flatMap((row) =>
      [...(row[1] ?? "").matchAll(/`([^`]+)`/g)].flatMap((cell) =>
        (cell[1] ?? "").split(" / ").map((name) => name.trim()),
      ),
    ),
  );
};

const undocumented = (
  source: string,
  name: string,
  heading: string,
): ReadonlyArray<string> => {
  const declared = declaredProps(source, name);
  const documented = documentedProps(page, heading);
  return Arr.dedupe([
    ...Arr.filter(declared, (prop) => !documented.includes(prop)),
    ...Arr.filter(documented, (prop) => !declared.includes(prop)),
  ]);
};

describe("the column page's API tables", () => {
  it("documents every prop ColumnMenu declares", () => {
    expect(declaredProps(menu, "ColumnMenuProps").length).toBeGreaterThan(5);
    expect(undocumented(menu, "ColumnMenuProps", "ColumnMenu")).toEqual([]);
  });

  it("documents every prop TableColumnDivider declares", () => {
    expect(
      declaredProps(divider, "TableColumnDividerProps").length,
    ).toBeGreaterThan(5);
    expect(
      undocumented(divider, "TableColumnDividerProps", "TableColumnDivider"),
    ).toEqual([]);
  });

  it("documents every field the column controller answers", () => {
    expect(
      declaredProps(controller, "ColumnController").length,
    ).toBeGreaterThan(10);
    expect(undocumented(controller, "ColumnController", "useColumns")).toEqual(
      [],
    );
  });

  it("names the divider from the column's own words", () => {
    const example = read("../../examples/table.example.tsx");
    const readme = read("../../README.md");
    expect(example).toContain("columnName(column.label, column.id)");
    expect(example).not.toContain("Resize the ${column.label");
    expect(page).toContain("columnName(column.label, column.id)");
    expect(page).not.toContain("Resize the ${column.label");
    expect(readme).toContain("columnName(column.label, column.id)");
    expect(readme).not.toContain("Resize the ${column.label");
  });

  it("teaches the configuration the controller restores", () => {
    const logic = read("./logic.ts");
    expect(logic).toContain("export const columnConfig");
    expect(logic).toContain("export const restoreColumns");
    expect(controller).toContain("restoreColumns(columns, stored)");
    expect(page).toContain("## Saving and restoring");
    expect(page).toContain("columnConfig");
    expect(page).toContain("restoreColumns");
    expect(page).toContain("`stored`");
  });
});
