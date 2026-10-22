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
const headlessRegistry = read("../../../apps/playground/src/scenarios/registry.ts");

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
