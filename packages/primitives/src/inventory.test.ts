/**
 * The Tier 1 inventory check.
 *
 * The `COMPONENTS.md` foundational table is the document a reader and the
 * release gate trust, and it had drifted to `todo` for every row while all
 * twenty-seven components were built, documented and runtime-verified. This
 * suite makes that drift impossible: each row has a record in `inventory.ts`,
 * the record names the source, docs page, example and tests that must exist,
 * and a `done` row without a test fails.
 *
 * `node:fs` is used here only because this is a test-time repository check, the
 * same boundary `components/src/inventory.test.ts` and `core/theme.test.ts`
 * already use.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as HashSet from "effect/HashSet";
import * as Option from "effect/Option";
import * as R from "effect/Record";
import { describe, expect, it } from "vitest";
import * as primitiveExports from "./index.js";
import { inventory, type PrimitiveMeta } from "./inventory.js";

const packageRoot = new URL("../", import.meta.url);
const repoRoot = new URL("../../../", import.meta.url);

const fileExists = (relative: string): boolean =>
  existsSync(fileURLToPath(new URL(relative, packageRoot)));

interface Row {
  readonly name: string;
  readonly status: string;
  readonly support: string;
  readonly notes: string;
}

/** The Tier 1 rows of `COMPONENTS.md`, parsed from its markdown table. */
const tier1Rows = (): ReadonlyArray<Row> => {
  const markdown = readFileSync(
    fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
    "utf8",
  );
  const start = markdown.indexOf("## Tier 1");
  const end = markdown.indexOf("## Tier 2");
  if (start < 0 || end < 0 || end <= start) return [];

  return Arr.flatMap(markdown.slice(start, end).split("\n"), (line) => {
    if (!line.startsWith("|")) return [];
    const cells = Arr.map(line.split("|").slice(1, -1), (cell) => cell.trim());
    if (cells.length < 3) return [];
    const name = cells[0] ?? "";
    if (name === "Component" || name.startsWith("---") || name === "")
      return [];
    return [
      {
        name,
        status: cells[1] ?? "",
        support: cells[2] ?? "",
        notes: cells[3] ?? "",
      },
    ];
  });
};

const duplicates = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.filter(values, (value, index) => values.indexOf(value) !== index);

const rowFor = (meta: PrimitiveMeta): Option.Option<Row> =>
  Arr.findFirst(tier1Rows(), (row) => row.name === meta.name);

/**
 * The value controls whose measurement is announced through `aria-valuetext`,
 * and the source that declares it.
 *
 * `@gpuix/native` 0.11.0 has no `aria-valuenow`/`min`/`max`, which is a real
 * gap — but it is not the same as "not announced", and three rows said exactly
 * that while each control declared `aria-valuetext` and the window suite read
 * the announced value back. A consumer reading the inventory has to know which
 * half is missing.
 */
const ANNOUNCED_VALUES: ReadonlyArray<{
  readonly name: string;
  readonly source: string;
}> = [
  { name: "Slider", source: "src/components/Slider.tsx" },
  { name: "Range slider", source: "src/components/Slider.tsx" },
  { name: "Meter", source: "src/components/Meter.tsx" },
];

/** Problems with one document's sentence about an announced value. */
const claimProblems = (name: string, text: string): ReadonlyArray<string> => [
  ...(text.includes("aria-valuetext")
    ? []
    : [`${name}: does not name aria-valuetext as the announced channel`]),
  ...(text.includes("not announced")
    ? [`${name}: says the value is not announced`]
    : []),
];

/**
 * Part names a record denies, e.g. "no compound RadioGroupItem".
 *
 * Only a capitalised word after "no" can be a part name: a limitation about a
 * missing role, prop or behaviour is lower-case (`no role`, `no aria-pressed`).
 */
const deniedParts = (text: string): ReadonlyArray<string> =>
  Arr.filter(
    Arr.map(
      [...text.matchAll(/\bno (?:compound |built-in )?([A-Z][A-Za-z0-9]+)\b/g)],
      (match) => match[1] ?? "",
    ),
    (name) => name.length > 0,
  );

const sourceOf = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

/** Every problem with one value control's record, row and source. */
const announceProblems = ({
  name,
  source,
}: {
  readonly name: string;
  readonly source: string;
}): ReadonlyArray<string> =>
  Option.match(
    Arr.findFirst(inventory, (meta) => meta.name === name),
    {
      onNone: () => [`${name}: no record`],
      onSome: (meta) => [
        ...(sourceOf(source).includes("aria-valuetext={")
          ? []
          : [`${name}: ${source} declares no aria-valuetext`]),
        ...claimProblems(name, meta.limitations.join(" ")),
        ...Option.match(rowFor(meta), {
          onNone: () => [`${name}: no COMPONENTS.md row`],
          onSome: (row) => claimProblems(name, row.notes),
        }),
      ],
    },
  );

/**
 * Problems with the tooltip record and row after the keyboard path was
 * re-measured in a window.
 *
 * The regression: the first `tooltip-lifecycle` run read the frame before
 * React's `onFocus` arrived, so both the record and the row taught that a `Tab`
 * traversal never opens the tip and hover was the only open path. The re-run
 * measured the activation, so neither document may carry the old limit.
 */
const tooltipProblems = (): ReadonlyArray<string> =>
  Option.match(
    Arr.findFirst(inventory, (meta) => meta.name === "Tooltips"),
    {
      onNone: () => ["Tooltips: no record"],
      onSome: (meta) => [
        ...Arr.filter(meta.limitations, (line) =>
          line.includes("does not open"),
        ).map(
          (line) =>
            `Tooltips: the record still teaches the retracted "${line}"`,
        ),
        ...Option.match(rowFor(meta), {
          onNone: () => ["Tooltips: no COMPONENTS.md row"],
          onSome: (row) => [
            ...(row.notes.includes("tooltip-lifecycle")
              ? []
              : ["Tooltips: the row cites no measured probe"]),
            ...(row.notes.includes("traversal opens")
              ? []
              : ["Tooltips: the row does not record the keyboard open path"]),
            ...(row.notes.includes("does not open")
              ? ["Tooltips: the row still teaches the retracted limit"]
              : []),
          ],
        }),
      ],
    },
  );

describe("Tier 1 inventory", () => {
  it("names files that exist", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Arr.filter(
        [...meta.source, meta.docs, meta.example, ...meta.tests],
        (path) => !fileExists(path),
      ).map((path) => `${meta.name}: missing ${path}`),
    );

    expect(problems).toEqual([]);
  });

  it("has at least one test for every row marked done", () => {
    const problems = Arr.filter(
      Arr.filter(inventory, (meta) => meta.status === "done"),
      (meta) => meta.tests.length === 0,
    ).map((meta) => `${meta.name}: done without a test`);

    expect(problems).toEqual([]);
  });

  it("names the channel a value control announces on", () => {
    // The bug guarded: the Slider, Range slider and Meter rows said "No
    // aria-valuenow/min/max, so the range is not announced" while each control
    // declares `aria-valuetext` and the window suite reads the announced value
    // back (`announced(runtime, "Volume")`). The bounds are what the runtime
    // cannot carry; the value is measured. A consumer had to know which half.
    const problems = Arr.flatMap(ANNOUNCED_VALUES, announceProblems);

    expect(problems).toEqual([]);
  });

  it("records the tooltip's measured keyboard path", () => {
    // Measured in a real window by the playground's `tooltip-lifecycle` probe,
    // re-run on 2026-10-22: the shipped wrapper opens on a `Tab` traversal
    // (14 checks), because the traversal runs React's `onFocus`.
    expect(tooltipProblems()).toEqual([]);
  });

  it("agrees with its COMPONENTS.md row", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Option.match(rowFor(meta), {
        onNone: () => [`${meta.name}: no COMPONENTS.md row`],
        onSome: (row) => [
          ...(row.status === meta.status
            ? []
            : [
                `${meta.name}: row says ${row.status}, record says ${meta.status}`,
              ]),
          ...(row.support === meta.gpuixSupport
            ? []
            : [
                `${meta.name}: row says support ${row.support}, record says ${meta.gpuixSupport}`,
              ]),
        ],
      }),
    );

    expect(problems).toEqual([]);
  });

  it("has a record for every Tier 1 row that is no longer todo", () => {
    const problems = Arr.filter(
      Arr.filter(tier1Rows(), (row) => row.status !== "todo"),
      (row) => !Arr.some(inventory, (meta) => meta.name === row.name),
    ).map((row) => `${row.name}: row is ${row.status} with no record`);

    expect(problems).toEqual([]);
  });

  it("covers every Tier 1 row exactly once", () => {
    const rows = Arr.map(tier1Rows(), (row) => row.name);

    expect(duplicates(rows)).toEqual([]);
    expect(Arr.length(inventory)).toBe(Arr.length(rows));
    expect(
      Arr.filter(inventory, (meta) => !Option.isSome(rowFor(meta))).map(
        (meta) => `${meta.name}: record with no row`,
      ),
    ).toEqual([]);
  });

  it("has no duplicate names or docs pages", () => {
    expect([
      ...duplicates(Arr.map(inventory, (meta) => meta.name)),
      ...duplicates(Arr.map(inventory, (meta) => meta.docs)),
    ]).toEqual([]);
  });

  it("records limitations as an explicit array", () => {
    expect(
      Arr.filter(inventory, (meta) => !Array.isArray(meta.limitations)).map(
        (meta) => `${meta.name}: limitations is not an array`,
      ),
    ).toEqual([]);
  });

  it("does not deny a part the package exports", () => {
    // The bug guarded: the Radio groups record said "Options are data: no
    // compound RadioGroupItem and no rich option content" while the part had
    // shipped, the page documented it and the COMPONENTS.md row described it —
    // so the record every suite reads told a caller a capability was missing.
    // A record may name an exported part only as something that exists.
    const exported = HashSet.fromIterable(R.keys(primitiveExports));
    const problems = Arr.flatMap(inventory, (meta) =>
      Arr.map(
        Arr.filter(deniedParts(Arr.join(meta.limitations, " ")), (name) =>
          HashSet.has(exported, name),
        ),
        (name) =>
          `${meta.name}: says there is no ${name}, and the package exports it`,
      ),
    );

    expect(problems).toEqual([]);
  });
});
