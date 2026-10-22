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
 * The controls whose state is announced through `aria-valuetext`, and the
 * source that declares it.
 *
 * `@gpuix/native` 0.11.0 has no `aria-valuenow`/`min`/`max` and no
 * `aria-checked`/`aria-pressed`, which is a real gap — but it is not the same as
 * "not announced": every control below declares `aria-valuetext` and its window
 * suite reads the announced state back. Three value rows said "not announced"
 * while the channel was painted, and the Toggle row said "the visual state is
 * the only state" while the Switch row told a caller to pair it with a visible
 * `Label`, which does not name a control in this runtime. A consumer reading the
 * inventory has to know which half is missing.
 */
const ANNOUNCED_STATES: ReadonlyArray<{
  readonly name: string;
  readonly source: string;
}> = [
  { name: "Slider", source: "src/components/Slider.tsx" },
  { name: "Range slider", source: "src/components/Slider.tsx" },
  { name: "Meter", source: "src/components/Meter.tsx" },
  { name: "Radio groups", source: "src/components/RadioGroup.tsx" },
  { name: "Switches", source: "src/components/Switch.tsx" },
  { name: "Toggle", source: "src/components/Toggle.tsx" },
];

/** Problems with one document's sentence about an announced state. */
const claimProblems = (name: string, text: string): ReadonlyArray<string> => [
  ...(text.includes("aria-valuetext")
    ? []
    : [`${name}: does not name aria-valuetext as the announced channel`]),
  ...(text.includes("not announced")
    ? [`${name}: says the state is not announced`]
    : []),
  ...(text.includes("pair it with a visible label")
    ? [`${name}: names a visible Label as the control's name`]
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

/** Every problem with one state control's record, row and source. */
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
 * The regression runs in two directions. One window run read the frame before
 * React's `onFocus` arrived, and the documents were corrected to promise a
 * keyboard open path; three clean runs at HEAD then found the event never
 * arrives and the tip stays closed, so the promise is the defect now. Both
 * documents must record the window's gap, cite the probe, and keep the half a
 * `TestRenderer` does deliver rather than claiming a keyboard path a reader
 * with a pointer can never use.
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
        ...(Arr.some(meta.limitations, (line) =>
          line.includes("hover is the only open path"),
        )
          ? []
          : ["Tooltips: the record does not state the window's measured gap"]),
        ...Option.match(rowFor(meta), {
          onNone: () => ["Tooltips: no COMPONENTS.md row"],
          onSome: (row) => [
            ...(row.notes.includes("tooltip-lifecycle")
              ? []
              : ["Tooltips: the row cites no measured probe"]),
            ...(row.notes.includes("`Tab` traversal opens it too")
              ? ["Tooltips: the row still promises the retracted open path"]
              : []),
            ...(row.notes.includes("stays closed")
              ? []
              : ["Tooltips: the row does not record the window's closed tip"]),
          ],
        }),
      ],
    },
  );

/**
 * Problems with the OTP field's row after it narrowed the alphabet.
 *
 * The regression: the row said "digit-only input" while `normalizeOtp` keeps
 * every letter and digit — `A1B2` types in, and the page says so. The inventory
 * told a consumer that a code the field accepts is impossible.
 */
const otpAlphabetProblems = (): ReadonlyArray<string> =>
  Option.match(
    Arr.findFirst(inventory, (meta) => meta.name === "OTP Field"),
    {
      onNone: () => ["OTP Field: no record"],
      onSome: (meta) => [
        ...(sourceOf("src/core/otp.ts").includes("A-Za-z")
          ? []
          : ["OTP Field: src/core/otp.ts no longer keeps letters"]),
        ...Option.match(rowFor(meta), {
          onNone: () => ["OTP Field: no COMPONENTS.md row"],
          onSome: (row) => [
            ...(row.notes.includes("digit-only")
              ? [
                  "OTP Field: the row says digit-only, and the core keeps letters",
                ]
              : []),
            ...(row.notes.includes("letters and digits")
              ? []
              : [
                  "OTP Field: the row does not name the alphabet the field keeps",
                ]),
          ],
        }),
      ],
    },
  );

/**
 * Problems with the Switch record after the Toggle's busy paragraph was
 * retracted from its row.
 *
 * The regression: the Switches row carried a paragraph copied from the Toggle
 * row — "**A busy toggle** (`loading`) paints a spinner in the accent's
 * on-colour while pressed … refuses activation and keeps its tab stop" — while
 * `SwitchProps` declares no `loading`, the page says "No loading or pending
 * state; disable it while a request is in flight", and the row six words later
 * said "No pending state". A reader of the inventory was told to pass a prop
 * TypeScript rejects. The busy spinner is `Toggle`'s contract, so this holds the
 * two controls apart in both directions: the switch keeps no promise it cannot
 * paint, and the toggle keeps the one it does.
 */
const switchPendingProblems = (): ReadonlyArray<string> =>
  Option.match(
    Arr.findFirst(inventory, (meta) => meta.name === "Switches"),
    {
      onNone: () => ["Switches: no record"],
      onSome: (switches) => [
        ...(sourceOf("src/components/Switch.tsx").includes("readonly loading")
          ? ["Switches: the source declares a loading prop the documents deny"]
          : []),
        ...(Arr.some(switches.limitations, (line) =>
          line.includes("No pending state"),
        )
          ? []
          : ["Switches: the record does not state the missing pending state"]),
        ...(sourceOf(switches.docs).includes("No loading or pending state")
          ? []
          : [
              "Switches: the page does not teach disabling the switch in flight",
            ]),
        ...Option.match(rowFor(switches), {
          onNone: () => ["Switches: no COMPONENTS.md row"],
          onSome: (row) => [
            ...(row.notes.includes("busy toggle")
              ? ["Switches: the row promises the Toggle's busy state"]
              : []),
            ...(row.notes.includes("No pending state") &&
            row.notes.includes("in flight")
              ? []
              : [
                  "Switches: the row does not name disabling it while a request is in flight",
                ]),
          ],
        }),
        ...(sourceOf("src/components/Toggle.tsx").includes("readonly loading")
          ? []
          : ["Toggle: the source no longer declares its busy state"]),
        ...Option.match(
          Arr.findFirst(inventory, (meta) => meta.name === "Toggle"),
          {
            onNone: () => ["Toggle: no record"],
            onSome: (toggle) =>
              Option.match(rowFor(toggle), {
                onNone: () => ["Toggle: no COMPONENTS.md row"],
                onSome: (row) =>
                  row.notes.includes("busy toggle")
                    ? []
                    : ["Toggle: the row lost its busy state"],
              }),
          },
        ),
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

  it("names the channel a state control announces on", () => {
    // The bug guarded: the Slider, Range slider and Meter rows said "No
    // aria-valuenow/min/max, so the range is not announced" while each control
    // declares `aria-valuetext` and the window suite reads the announced value
    // back (`announced(runtime, "Volume")`), and the Toggle row said "the visual
    // state is the only state" while the Switch row sent a caller to a visible
    // `Label`, which paints text only. The channel is the half a reader needs.
    const problems = Arr.flatMap(ANNOUNCED_STATES, announceProblems);

    expect(problems).toEqual([]);
  });

  it("does not narrow the alphabet the OTP core keeps", () => {
    expect(otpAlphabetProblems()).toEqual([]);
  });

  it("keeps the switch's pending state honest", () => {
    // The busy spinner belongs to Toggle; a switch that saves over the network
    // is disabled while the request is in flight.
    expect(switchPendingProblems()).toEqual([]);
  });

  it("records the tooltip's measured keyboard path", () => {
    // Measured in a real window by the playground's `tooltip-lifecycle` probe,
    // three clean runs on 0.11.0 on 2026-10-22: the traversal focuses the
    // trigger and the tip stays closed (`focuses=0`), so the record and the row
    // must teach the pointer as the window's only open path.
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
