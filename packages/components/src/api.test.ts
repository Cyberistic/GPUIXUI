/**
 * The public API contract in `docs/component-api.md` §8, checked against code.
 *
 * The bug these guard: §8 is the spec a consumer reads, and §9 claims every
 * shipped Tier 2 component exports the parts its row names — but nothing read
 * the table against the package. A renamed part, or a row promising a part
 * nobody wrote, shipped silently.
 *
 * Both directions are checked: every part a row names is an exported function,
 * and every exported function in a component's family is named by some row. The
 * reverse check uses the row's root part as the family prefix, so a part that
 * shares no prefix with its root (KeyboardShortcuts' `Keycap`) is covered only
 * by the forward direction; the forward direction is exact.
 *
 * `node:fs` is a test-time repository read, as in `inventory.test.ts`; no
 * component runtime imports it.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import * as api from "./index.js";
import { inventory } from "./inventory.js";

const repoRoot = new URL("../../../", import.meta.url);

/** The contract document, read once per test that needs a section of it. */
const contract = (): string =>
  readFileSync(
    fileURLToPath(new URL("docs/component-api.md", repoRoot)),
    "utf8",
  );

/** A `##` section's text, from its heading to the next one. */
const section = (heading: string): string => {
  const markdown = contract();
  const start = markdown.indexOf(heading);
  if (start < 0) return "";
  const next = markdown.indexOf("\n## ", start + heading.length);
  return next < 0 ? markdown.slice(start) : markdown.slice(start, next);
};

/** The Tier 2 table of §8: implemented parts, not the planned shape table. */
const tier2Table = (): string => {
  const tier2 = section("## 8. Parts by component");
  const start = tier2.indexOf("### Tier 2 — composition and feedback");
  const end = tier2.indexOf("**Planned Tier 2 additions**");
  if (start < 0 || end <= start) return "";
  return tier2.slice(start, end);
};

/** One row's component name and the parts it names in backticks. */
const rowOf = (
  line: string,
): Result.Result<
  { readonly name: string; readonly parts: ReadonlyArray<string> },
  void
> => {
  if (!Str.startsWith("|")(line)) return Result.failVoid;
  const cells = Arr.map(line.split("|").slice(1, -1), Str.trim);
  const name = cells[0];
  const partsCell = cells[1];
  if (name === undefined || partsCell === undefined) return Result.failVoid;
  if (name === "" || name === "Component" || Str.startsWith("---")(name)) {
    return Result.failVoid;
  }
  const parts = Arr.map(
    Arr.fromIterable(partsCell.matchAll(/`([A-Z][A-Za-z0-9]*)`/g)),
    (match) => String(match[1]),
  );
  return Result.succeed({ name, parts });
};

const rows: ReadonlyArray<{
  readonly name: string;
  readonly parts: ReadonlyArray<string>;
}> = Arr.filterMap(tier2Table().split("\n"), rowOf);

const partsOf = (name: string): Option.Option<ReadonlyArray<string>> =>
  Option.map(
    Arr.findFirst(rows, (row) => row.name === name),
    (row) => row.parts,
  );

const documented: ReadonlySet<string> = new Set(
  Arr.flatMap(rows, (row) => row.parts),
);

const exports = Arr.fromIterable(Object.entries(api));

const isExportedPart = (name: string): boolean =>
  Arr.some(
    exports,
    ([key, value]) => key === name && typeof value === "function",
  );

describe("component API contract", () => {
  it("names the boolean change callback beside the value one", () => {
    const controlled = section("## 2. Controlled and uncontrolled");
    expect(controlled).toContain("onValueChange");
    expect(controlled).toContain("onCheckedChange");
    expect(contract()).toContain(
      "| `.on_checked_change(f)` | `onCheckedChange` |",
    );
  });

  it("has a §8 parts row for every shipped component", () => {
    expect(tier2Table()).not.toBe("");
    const missing = Arr.filter(inventory, (meta) =>
      Option.isNone(partsOf(meta.name)),
    ).map((meta) => meta.name);

    expect(missing).toEqual([]);
  });

  it("exports every part its §8 row names", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Option.match(partsOf(meta.name), {
        onNone: () => [`${meta.name}: no §8 parts row`],
        onSome: (parts) =>
          Arr.filter(parts, (part) => !isExportedPart(part)).map(
            (part) =>
              `${meta.name}: §8 names ${part}, which the package does not export`,
          ),
      }),
    );

    expect(problems).toEqual([]);
  });

  it("names every exported part of a family in some §8 row", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Option.match(Option.flatMap(partsOf(meta.name), Arr.head), {
        onNone: () => [],
        onSome: (root) =>
          Arr.filter(
            Arr.map(exports, ([name]) => name),
            (name) =>
              Str.startsWith(root)(name) &&
              Str.isNonEmpty(name) &&
              isExportedPart(name) &&
              !documented.has(name),
          ).map((name) => `${meta.name}: exports ${name} with no §8 entry`),
      }),
    );

    expect(problems).toEqual([]);
  });
});
