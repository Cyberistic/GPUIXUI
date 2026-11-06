import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

const INHERITED: ReadonlySet<string> = new Set([
  "aria-id",
  "children",
  "onLayout",
  "ref",
  "style",
  "testId",
]);

const interfaceBody = (source: string, type: string): string => {
  const header = source.indexOf(`export interface ${type}`);
  if (header < 0) return "";
  const open = source.indexOf("{", header);
  const end = source.indexOf("\n}", open);
  return open < 0 || end < 0 ? "" : source.slice(open + 1, end);
};

const declaredFields = (source: string, type: string): ReadonlyArray<string> =>
  Arr.map(
    Arr.fromIterable(
      interfaceBody(source, type).matchAll(/^ {2}readonly ([A-Za-z]+)\??:/gm),
    ),
    (match) => match[1] ?? "",
  );

const namesIn = (cell: string): ReadonlyArray<string> =>
  Arr.map(Arr.fromIterable(cell.matchAll(/`([A-Za-z][\w-]*)`/g)), (match) =>
    String(match[1]),
  );

const documentedIn = (page: string, heading: string): ReadonlyArray<string> => {
  const start = page.indexOf(`## ${heading}`);
  if (start < 0) return [];
  const rest = page.slice(start);
  const end = rest.indexOf("\n## ", 1);
  const section = end < 0 ? rest : rest.slice(0, end);
  return Arr.flatMap(Str.split(section, "\n"), (line) =>
    Str.startsWith("| `")(line) ? namesIn(Str.split(line, "|")[1] ?? "") : [],
  );
};

const source = (): string => read("./multi-step-form.tsx");
const page = (): string => read("../docs/multi-step-form.mdx");

describe("the MultiStepForm page", () => {
  it("documents every prop its type declares, and nothing else", () => {
    const declared = declaredFields(source(), "MultiStepFormProps");
    const documented = documentedIn(page(), "API");

    expect(declared.length).toBeGreaterThan(9);
    expect(Arr.filter(declared, (name) => !documented.includes(name))).toEqual(
      [],
    );
    expect(
      Arr.filter(
        documented,
        (name) => !declared.includes(name) && !INHERITED.has(name),
      ),
    ).toEqual([]);
  });

  it("documents every field a step declares, and nothing else", () => {
    const declared = [
      ...declaredFields(source(), "MultiStep"),
      ...declaredFields(read("./wizard/logic.ts"), "StepGate"),
    ];
    const documented = documentedIn(page(), "Steps");

    expect(declared.length).toBeGreaterThan(4);
    expect(Arr.filter(declared, (name) => !documented.includes(name))).toEqual(
      [],
    );
    expect(Arr.filter(documented, (name) => !declared.includes(name))).toEqual(
      [],
    );
  });
});
