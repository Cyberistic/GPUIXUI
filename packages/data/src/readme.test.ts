import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const readme = read("../README.md");
const index = read("./index.ts");
const frozenSource = read("./table/frozen.tsx");
const exampleRegistry = read("../examples/index.ts");
const frozenExample = read("../examples/frozen-table.example.tsx");
const frozenPage = read("../docs/frozen-columns.mdx");
const liveRegistry = read("../../../apps/playground/src/live/registry.ts");
const headlessRegistry = read(
  "../../../apps/playground/src/scenarios/registry.ts",
);

const statusRow = (name: string): Option.Option<string> =>
  Option.fromNullishOr(
    readme.split("\n").find((line) => line.startsWith(`| ${name}`)),
  );

const rowText = (name: string): string =>
  Option.match(statusRow(name), {
    onNone: () => {
      throw new Error(`the status table has no ${name} row`);
    },
    onSome: (line) => line,
  });

const propsOf = (interfaceName: string): ReadonlyArray<string> => {
  const start = frozenSource.indexOf(`interface ${interfaceName}`);
  const open = frozenSource.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let at = open; at < frozenSource.length; at += 1) {
    const character = frozenSource[at];
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) {
      end = at;
      break;
    }
  }
  const body = frozenSource.slice(open, end);
  return [...body.matchAll(/readonly (\w+)/g)].map(([, name]) => name ?? "");
};

describe("the data README's frozen column", () => {
  it("reports FrozenTable as shipped, not as a future composition", () => {
    const row = rowText("Pinned / frozen columns");
    expect(row).toContain("shipped");
    expect(row).toContain("FrozenTable");

    expect(readme).not.toContain("not offered");
    expect(readme).not.toContain("composition, not shipped");

    const paragraph = readme.slice(
      readme.indexOf("A **pinned column**"),
      readme.indexOf("```tsx", readme.indexOf("A **pinned column**")),
    );
    expect(paragraph).toContain("`FrozenTable`");
  });

  it("holds the claim to the artefacts the package ships", () => {
    expect(index).toMatch(
      /export \{ FrozenTable \} from "\.\/table\/frozen\.js"/,
    );
    expect(frozenSource).toContain("export const FrozenTable");
    expect(frozenExample).toContain("export const FrozenTableExample");
    expect(exampleRegistry).toContain('"frozen-table": FrozenTableExample');
    expect(frozenPage).toContain("title: Frozen columns");
    expect(readme).toContain("docs/frozen-columns.mdx");
  });

  it("cites probes the playground registers", () => {
    const row = rowText("Pinned / frozen columns");
    for (const id of ["data-grid-frozen-column", "frozen-column-lifecycle"]) {
      expect(row).toContain(id);
      expect(`${headlessRegistry}\n${liveRegistry}`).toContain(`id: "${id}"`);
    }
  });

  it("passes only props the component declares, in its own usage snippet", () => {
    const declared = propsOf("FrozenTableProps");
    expect(declared.length).toBeGreaterThan(4);
    const open = readme.indexOf("<FrozenTable");
    const snippet = readme.slice(open, readme.indexOf("/>", open));

    const passed = [...snippet.matchAll(/^\s{2}(\w+)=/gm)].map(
      ([, name]) => name ?? "",
    );
    expect(passed.length).toBeGreaterThan(4);
    expect(passed.filter((name) => !declared.includes(name))).toEqual([]);

    expect(passed).toContain("frozenWidth");
    expect(passed).toContain("contentWidth");
  });
});

const tableRows: ReadonlyArray<string> = readme
  .split("\n")
  .filter((line) => line.startsWith("| ") && line.endsWith(" |"));

const citedTokens: ReadonlyArray<string> = Arr.dedupe(
  tableRows.flatMap((line) =>
    [...line.matchAll(/`([^`]+)`/g)].map(([, token]) => token ?? ""),
  ),
);

const isProbeId = (token: string): boolean =>
  /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(token);

const isComponentName = (token: string): boolean =>
  /^(?:[A-Z]\w+|use[A-Z]\w*)$/.test(token);

describe("the README's citations", () => {
  it("names only probes the playground registers", () => {
    const cited = citedTokens.filter(isProbeId);

    expect(cited.length).toBeGreaterThanOrEqual(12);
    const registered = `${headlessRegistry}\n${liveRegistry}`;
    expect(cited.filter((id) => !registered.includes(`id: "${id}"`))).toEqual(
      [],
    );

    expect(cited).toContain("data-grid-frozen-column");
    expect(cited).toContain("frozen-column-lifecycle");
  });

  it("names only components the package root exports", () => {
    const named = citedTokens.filter(isComponentName);
    expect(named.length).toBeGreaterThanOrEqual(15);
    expect(
      named.filter((name) => !new RegExp(`\\b${name}\\b`).test(index)),
    ).toEqual([]);

    expect(
      ["TableSortHeader", "ColumnMenu", "VirtualTable"].filter(
        (name) => !index.includes(name),
      ),
    ).toEqual([]);
  });
});
