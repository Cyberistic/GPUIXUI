/**
 * The README ships `FrozenTable`, and says so.
 *
 * The frozen column landed (the two-pane composition `data-grid-frozen-column`
 * measured), but the README's §Usage paragraph kept calling pinned columns "not
 * offered" and its status table kept the row at "composition, not shipped" —
 * two claims a consumer can act on, pointing away from code the package
 * exports.
 *
 * This guard derives the facts instead of repeating them: the status row's
 * verdict must match the package's own tree (the export, the source, the
 * example registration and the docs page), and the probe ids it cites must
 * exist in the playground's registries. A retracted sentence fails it by name,
 * and so does dropping any of the four artefacts it claims.
 *
 * `node:fs` is deliberate and test-only: this checks the repository's own
 * files from a plain vitest suite, the shape
 * `packages/motion/src/notice.test.ts` already uses. React is not involved, so
 * there is no Effect runtime to provide a `FileSystem` layer to.
 */

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

/** The status table's row for one surface, or a named absence. */
const statusRow = (name: string): Option.Option<string> =>
  Option.fromNullishOr(
    readme.split("\n").find((line) => line.startsWith(`| ${name}`)),
  );

/** A status row's text, failing the case by name when the row is gone. */
const rowText = (name: string): string =>
  Option.match(statusRow(name), {
    onNone: () => {
      throw new Error(`the status table has no ${name} row`);
    },
    onSome: (line) => line,
  });

/** The prop names a `Props` interface declares, in source order. */
const propsOf = (interfaceName: string): ReadonlyArray<string> => {
  const start = frozenSource.indexOf(`interface ${interfaceName}`);
  const body = frozenSource.slice(start, frozenSource.indexOf("}", start));
  return [...body.matchAll(/readonly (\w+)/g)].map(([, name]) => name ?? "");
};

describe("the data README's frozen column", () => {
  it("reports FrozenTable as shipped, not as a future composition", () => {
    const row = rowText("Pinned / frozen columns");
    expect(row).toContain("shipped");
    expect(row).toContain("FrozenTable");
    // The retracted wording: a reader was told the package does not offer it.
    expect(readme).not.toContain("not offered");
    expect(readme).not.toContain("composition, not shipped");
    // ...and the paragraph that owns the claim names the shipped component.
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
    // Every prop the README passes must be one the component accepts; the
    // snippet is copyable, so an invented prop is a broken example.
    const passed = [...snippet.matchAll(/^\s{2}(\w+)=/gm)].map(
      ([, name]) => name ?? "",
    );
    expect(passed.length).toBeGreaterThan(4);
    expect(passed.filter((name) => !declared.includes(name))).toEqual([]);
    // ...and the two that make the composition a frozen grid are named.
    expect(passed).toContain("frozenWidth");
    expect(passed).toContain("contentWidth");
  });
});

/** The table rows of the README — the runtime rules and the status table. */
const tableRows: ReadonlyArray<string> = readme
  .split("\n")
  .filter((line) => line.startsWith("| ") && line.endsWith(" |"));

/** The backticked tokens on those rows, in source order, once each. */
const citedTokens: ReadonlyArray<string> = Arr.dedupe(
  tableRows.flatMap((line) =>
    [...line.matchAll(/`([^`]+)`/g)].map(([, token]) => token ?? ""),
  ),
);

/** A probe id's shape: lowercase words joined by hyphens. */
const isProbeId = (token: string): boolean =>
  /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(token);

/** A public component, hook or module a status row may name. */
const isComponentName = (token: string): boolean =>
  /^(?:[A-Z]\w+|use[A-Z]\w*)$/.test(token);

describe("the README's citations", () => {
  it("names only probes the playground registers", () => {
    const cited = citedTokens.filter(isProbeId);
    // A floor: a parse that stopped reading the tables must not pass.
    expect(cited.length).toBeGreaterThanOrEqual(12);
    const registered = `${headlessRegistry}\n${liveRegistry}`;
    expect(cited.filter((id) => !registered.includes(`id: "${id}"`))).toEqual(
      [],
    );
    // The frozen row is one of them, from both halves of the suite.
    expect(cited).toContain("data-grid-frozen-column");
    expect(cited).toContain("frozen-column-lifecycle");
  });

  it("names only components the package root exports", () => {
    const named = citedTokens.filter(isComponentName);
    expect(named.length).toBeGreaterThanOrEqual(15);
    expect(
      named.filter((name) => !new RegExp(`\\b${name}\\b`).test(index)),
    ).toEqual([]);
    // ...and the usage snippets only call things the root (or a subpath the
    // README names) exports.
    expect(
      ["TableSortHeader", "ColumnMenu", "VirtualTable"].filter(
        (name) => !index.includes(name),
      ),
    ).toEqual([]);
  });
});
