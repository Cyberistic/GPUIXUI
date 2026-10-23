/**
 * The `MultiStepForm` page against the two shapes it declares.
 *
 * The bug guarded: the props table is the only place a consumer learns what the
 * wizard takes, and a step's own fields were taught by the example alone — the
 * page never said that `id` and `title` are required, that a `gate` answers
 * `Option<string>`, or that only the current step's `content` is mounted. A
 * prop or step field added to the type later would be documented nowhere, the
 * same drift the package's Tier 2 pages are already held against.
 *
 * The check is exact in both directions for each shape: a declared field must
 * have a row and a row must name a declared field.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), "utf8");

/**
 * The surface `MultiStepFormProps` inherits rather than declares, which the
 * page may document beside the props its own interface carries.
 */
const INHERITED: ReadonlySet<string> = new Set([
  "aria-id",
  "children",
  "onLayout",
  "ref",
  "style",
  "testId",
]);

/** The body of one interface, however its `extends` list is wrapped. */
const interfaceBody = (source: string, type: string): string => {
  const header = source.indexOf(`export interface ${type}`);
  if (header < 0) return "";
  const open = source.indexOf("{", header);
  const end = source.indexOf("\n}", open);
  return open < 0 || end < 0 ? "" : source.slice(open + 1, end);
};

/** The fields one interface declares, from its own body. */
const declaredFields = (source: string, type: string): ReadonlyArray<string> =>
  Arr.map(
    Arr.fromIterable(
      interfaceBody(source, type).matchAll(/^ {2}readonly ([A-Za-z]+)\??:/gm),
    ),
    (match) => match[1] ?? "",
  );

/** Every name a row's first cell documents, in backticks. */
const namesIn = (cell: string): ReadonlyArray<string> =>
  Arr.map(Arr.fromIterable(cell.matchAll(/`([A-Za-z][\w-]*)`/g)), (match) =>
    String(match[1]),
  );

/** The names a page's named section documents in its table. */
const documentedIn = (page: string, heading: string): ReadonlyArray<string> => {
  const start = page.indexOf(`## ${heading}`);
  if (start < 0) return [];
  const rest = page.slice(start);
  const end = rest.indexOf("\n## ", 1);
  const section = end < 0 ? rest : rest.slice(0, end);
  return Arr.flatMap(Str.split(section, "\n"), (line) =>
    Str.startsWith("| `")(line)
      ? namesIn(Str.split(line, "|")[1] ?? "")
      : [],
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
    // A step's own fields plus the gate contract it extends.
    const declared = [
      ...declaredFields(source(), "MultiStep"),
      ...declaredFields(read("./wizard/logic.ts"), "StepGate"),
    ];
    const documented = documentedIn(page(), "Steps");

    // A page with no `## Steps` table resolves nothing and must not pass.
    expect(declared.length).toBeGreaterThan(4);
    expect(Arr.filter(declared, (name) => !documented.includes(name))).toEqual(
      [],
    );
    expect(Arr.filter(documented, (name) => !declared.includes(name))).toEqual(
      [],
    );
  });
});
