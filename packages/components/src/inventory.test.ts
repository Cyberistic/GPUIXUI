/**
 * The inventory check.
 *
 * This suite fails when a component is marked `done` without a native behaviour
 * test, when a docs page or example named by a record does not exist, when a
 * `COMPONENTS.md` row disagrees with the record's status or GPUix support, when a
 * finished Tier 2 row has no record, when two records claim the same name or
 * docs page, when one Tier 2 component has two rows (a stray `todo` copy beneath
 * the real one used to hide there), and when a row's stated native test count
 * disagrees with the behaviour suite (plan 139). It is the automated form of
 * plan 117 §1.
 *
 * The date picker landed in plan 119, so every Tier 2 row now has a record.
 * `node:fs` is used here only because this is a test-time repository check —
 * plan 117 §3 authorises it, and nothing in the component runtime imports it.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { inventory, type ComponentMeta } from "./inventory.js";

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

/** One case in a behaviour suite: the suite convention is two spaces and `it(`. */
const TEST_CASE = /^ {2}it\(/;

/** The cases a behaviour suite declares, by that convention. */
const countBehaviourTests = (relative: string): number =>
  Arr.length(
    Arr.filter(
      readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8").split(
        "\n",
      ),
      (line) => TEST_CASE.test(line),
    ),
  );

/** The Tier 2 rows of `COMPONENTS.md`, parsed from its markdown table. */
const rowsBetween = (
  startHeading: string,
  endHeading: string,
): ReadonlyArray<Row> => {
  const markdown = readFileSync(
    fileURLToPath(new URL("COMPONENTS.md", repoRoot)),
    "utf8",
  );
  const start = markdown.indexOf(startHeading);
  if (start < 0) return [];
  const rest = markdown.slice(start + startHeading.length);
  const end = endHeading === "" ? -1 : rest.indexOf(endHeading);
  return Arr.flatMap(
    (end < 0 ? rest : rest.slice(0, end)).split("\n"),
    (line) => {
      if (!line.startsWith("|")) return [];
      const cells = Arr.map(line.split("|").slice(1, -1), (cell) =>
        cell.trim(),
      );
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
    },
  );
};

const tier2Rows = (): ReadonlyArray<Row> =>
  rowsBetween("## Tier 2", "## Tier 3");

/** The animated primitives plan 600 lands, held to the same contract. */
const animatedRows = (): ReadonlyArray<Row> =>
  rowsBetween("## Animated primitives (plan 600)", "");

/** The Tier 3–5 target rows, which no component here implements yet. */
const targetRows = (): ReadonlyArray<Row> =>
  rowsBetween("## Tier 3", "## Animated primitives (plan 600)");

/** Every `COMPONENTS.md` row that belongs to this package's inventory. */
const packageRows = (): ReadonlyArray<Row> => [
  ...tier2Rows(),
  ...animatedRows(),
];

const duplicates = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Arr.filter(values, (value, index) => values.indexOf(value) !== index);

describe("inventory", () => {
  it("names files that exist", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Arr.filter(
        [meta.docs, meta.example, meta.testFile],
        (path) => !fileExists(path),
      ).map((path) => `${meta.name}: missing ${path}`),
    );

    expect(problems).toEqual([]);
  });

  it("has a behaviour test for every component marked done", () => {
    const problems = Arr.filter(
      Arr.filter(inventory, (meta) => meta.status === "done"),
      (meta) =>
        !meta.testFile.startsWith("src/behaviour/") ||
        !meta.testFile.endsWith(".test.tsx"),
    ).map((meta) => `${meta.name}: done without a behaviour test`);

    expect(problems).toEqual([]);
  });

  it("agrees with its COMPONENTS.md row", () => {
    const rows = packageRows();
    const problems = Arr.flatMap(inventory, (meta) => {
      const row = Arr.findFirst(
        rows,
        (candidate) => candidate.name === meta.name,
      );
      return Option.match(row, {
        onNone: () => [`${meta.name}: no COMPONENTS.md row`],
        onSome: (found) => {
          if (found.status !== meta.status) {
            return [
              `${meta.name}: row says ${found.status}, record says ${meta.status}`,
            ];
          }
          if (found.support !== meta.gpuixSupport) {
            return [
              `${meta.name}: row says support ${found.support}, record says ${meta.gpuixSupport}`,
            ];
          }
          return [];
        },
      });
    });

    expect(problems).toEqual([]);
  });

  it("has a record for every package row that is no longer todo", () => {
    const problems = Arr.filter(
      Arr.filter(packageRows(), (row) => row.status !== "todo"),
      (row) => !Arr.some(inventory, (meta) => meta.name === row.name),
    ).map(
      (row) => `${row.name}: row is ${row.status} with no inventory record`,
    );

    expect(problems).toEqual([]);
  });

  it("has no duplicate names, docs pages or examples", () => {
    expect([
      ...duplicates(inventory.map((meta) => meta.name)),
      ...duplicates(inventory.map((meta) => meta.docs)),
      ...duplicates(inventory.map((meta) => meta.example)),
    ]).toEqual([]);
  });

  it("has no duplicate package row names", () => {
    const names = Arr.map(packageRows(), (row) => row.name);

    expect(duplicates(names)).toEqual([]);
  });

  it("states the real native test count in every package row", () => {
    const rows = packageRows();
    const problems = Arr.flatMap(
      Arr.filter(inventory, (meta: ComponentMeta) => meta.status === "done"),
      (meta: ComponentMeta) => {
        const row = Arr.findFirst(
          rows,
          (candidate) => candidate.name === meta.name,
        );
        return Option.match(row, {
          onNone: () => [`${meta.name}: no COMPONENTS.md row`],
          onSome: (found) => {
            const claimed = Option.flatMap(
              Option.fromNullishOr(
                /(\d+) native behaviour tests/.exec(found.notes),
              ),
              (match) => Option.fromNullishOr(match[1]),
            );
            const actual = countBehaviourTests(meta.testFile);
            return Option.match(claimed, {
              onNone: () => [
                `${meta.name}: row does not state a native test count`,
              ],
              onSome: (count) =>
                count === String(actual)
                  ? []
                  : [`${meta.name}: row says ${count}, suite has ${actual}`],
            });
          },
        });
      },
    );

    expect(problems).toEqual([]);
  });

  it("records limitations as an explicit array", () => {
    const problems = Arr.filter(
      inventory,
      (meta) => !Array.isArray(meta.limitations),
    ).map((meta) => `${meta.name}: limitations is not an array`);

    expect(problems).toEqual([]);
  });
});

describe("component API contract", () => {
  const contract = (): string =>
    readFileSync(
      fileURLToPath(new URL("docs/component-api.md", repoRoot)),
      "utf8",
    );

  it("documents the six rules and the controlled/uncontrolled names", () => {
    const markdown = contract();
    Arr.forEach(
      [
        "## 1. Compound parts",
        "## 2. Controlled and uncontrolled",
        "## 3. State-aware styling",
        "## 4. Keyboard",
        "## 5. Accessibility",
        "## 6. Translation table",
      ],
      (heading) => expect(markdown).toContain(heading),
    );
    expect(markdown).toContain(
      "| `.value(v)` / `.default_value(v)` | `value` / `defaultValue` |",
    );
    expect(markdown).toContain("| `.on_value_change(f)` | `onValueChange` |");
  });

  it("lists every implemented component in the parts tables", () => {
    const markdown = contract();
    const missing = Arr.filter(
      inventory,
      (meta) => !markdown.includes(`| ${meta.name} |`),
    ).map((meta) => meta.name);

    expect(missing).toEqual([]);
  });

  it("records the slide the tab pill paints, not a jump", () => {
    // The record and the source header used to say the pill "jumps between
    // tabs instead of sliding" while `tabs-indicator` is a motion target
    // retargeted from the box on screen, so a reader was told the opposite of
    // the code. The limit that remains is the runtime's absent `transform`.
    const limitations = Option.match(
      Arr.findFirst(inventory, (meta) => meta.name === "Tabs"),
      { onNone: () => [], onSome: (meta) => meta.limitations },
    );
    const claimed = Option.getOrUndefined(
      Arr.findFirst(limitations, (text) => text.includes("selected surface")),
    );
    const header = readFileSync(
      fileURLToPath(new URL("src/tabs.tsx", packageRoot)),
      "utf8",
    );
    const intro = header.slice(0, header.indexOf("import type"));

    expect(claimed).toContain("slides");
    expect(claimed).toContain("transform");
    expect(Arr.some(limitations, (text) => text.includes("jumps"))).toBe(false);
    expect(intro).toContain("slides");
    expect(intro).not.toContain("jumps between");
  });
});

/**
 * The Tier 3–5 rows the playground's probes measured must name the probe.
 *
 * Those tiers are targets this package has not built, so the row is a future
 * plan's only pointer from a capability to the frame that measured it. A row
 * that claims "measured" without the probe cannot be checked, and an invented
 * probe id reads exactly like a measured one — the docs lane pages render these
 * rows, so a reader has nowhere else to go.
 */
const CITATIONS: ReadonlyArray<readonly [string, string]> = [
  ["Charts", "chart-raster"],
  ["Resizable split panes", "nested-scroll-lifecycle"],
  ["Docking layouts", "nested-scroll-lifecycle"],
  ["Workspace layouts", "workspace-restore"],
  ["Persistent panel state", "workspace-restore"],
  ["Toolbars", "window-chrome"],
  ["Status bars", "window-chrome"],
  ["Column configuration", "table-columns-lifecycle"],
  ["Resizable columns", "column-resize-lifecycle"],
  ["Filtering controls", "table-filter-lifecycle"],
  ["Multi-pane editing layouts", "multi-pane-editor"],
  ["Code editor integration", "editor-overlay"],
];

/** The `column-resize` fixture's direct numbers, read as source. */
const columnDrag = (): Readonly<Record<string, number>> => {
  const source = readFileSync(
    fileURLToPath(
      new URL("apps/playground/src/live/column-resize.ts", repoRoot),
    ),
    "utf8",
  );
  const number = (key: string): number =>
    Number(
      new RegExp(`\\b${key}: (\\d+),`).exec(source)?.[1] ??
        new RegExp(`\\b${key} = (\\d+);`).exec(source)?.[1] ??
        Number.NaN,
    );
  return {
    opened: number("name"),
    min: number("min"),
    divider: number("divider"),
    control: number("control"),
    dragSteps: number("DRAG_STEPS"),
    controlMoves: number("CONTROL_MOVES"),
  };
};

/** The live probe ids the playground registers, read from its own registry. */
const probeIds = (): ReadonlyArray<string> => {
  const source = readFileSync(
    fileURLToPath(new URL("apps/playground/src/live/registry.ts", repoRoot)),
    "utf8",
  );
  return Arr.flatMap(
    Arr.fromIterable(Str.matchAll(/id: "([a-z0-9-]+)"/g)(source)),
    (match) => (match[1] === undefined ? [] : [match[1]]),
  );
};

describe("the measured target rows", () => {
  it("cites a probe the playground registers", () => {
    const ids = probeIds();
    const problems = Arr.flatMap(CITATIONS, ([row, probe]) =>
      Arr.some(ids, (id) => id === probe)
        ? []
        : [`${row}: cites ${probe}, which no live probe registers`],
    );

    expect(problems).toEqual([]);
  });

  it("names the probe in the row it measured", () => {
    const rows = targetRows();
    const problems = Arr.flatMap(CITATIONS, ([name, probe]) =>
      Option.match(
        Arr.findFirst(rows, (row) => row.name === name),
        {
          onNone: () => [`${name}: no row in the target tiers`],
          onSome: (row) =>
            row.notes.includes(probe)
              ? []
              : [`${name}: the row does not cite ${probe}`],
        },
      ),
    );

    expect(problems).toEqual([]);
  });

  it("states the numbers the column-drag fixture holds", () => {
    const drag = columnDrag();
    expect(
      [
        drag.opened,
        drag.min,
        drag.divider,
        drag.control,
        drag.dragSteps,
        drag.controlMoves,
      ].every(Number.isFinite),
    ).toBe(true);

    const notes = Option.getOrElse(
      Option.map(
        Arr.findFirst(targetRows(), (row) => row.name === "Resizable columns"),
        (row) => row.notes,
      ),
      () => "",
    );
    expect(notes).toContain(`${drag.opened} → `);
    expect(notes).toContain(`${drag.divider}px divider`);
    expect(notes).toContain(`${drag.dragSteps} of ${drag.dragSteps}`);
    expect(notes).toContain(`clamps at **${drag.min}**`);
    expect(notes).toContain(`${drag.controlMoves} of ${drag.dragSteps}`);
    expect(notes).toContain(`stays **${drag.control}**`);
    expect(notes).toContain("onMouseDown");
  });

  it("states the paint inside an image's box", () => {
    const readme = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    expect(readme).toContain("### `image-fit` — measured on 0.11.0 here");
    expect(readme).toContain("161 checks, `--only image-fit`");

    const rows = targetRows();
    Arr.forEach(["Image preview", "Crop area"], (name) => {
      const notes = Option.getOrElse(
        Option.map(
          Arr.findFirst(rows, (row) => row.name === name),
          (row) => row.notes,
        ),
        () => "",
      );
      expect(notes, name).toContain("`image-fit`");
      expect(notes, name).toContain("161 checks");
      // The placements a crop or a preview has to plan around.
      expect(notes, name).toContain("`cover`");
      expect(notes, name).toContain("`none`");
      expect(notes, name).toContain("`contain`");
    });
  });

  it("states a verdict instead of a question mark", () => {
    const rows = targetRows();
    const problems = Arr.flatMap(CITATIONS, ([name]) =>
      Option.match(
        Arr.findFirst(rows, (row) => row.name === name),
        {
          onNone: () => [],
          onSome: (row) =>
            row.support === "?"
              ? [`${name}: still reads "?", although a probe measured it`]
              : [],
        },
      ),
    );

    expect(problems).toEqual([]);
  });
});
