/**
 * The inventory check.
 *
 * This suite fails when a component is marked `done` without a native behaviour
 * test, when a docs page or example named by a record does not exist, when a
 * `COMPONENTS.md` row disagrees with the record's status or GPUix support, when a
 * finished Tier 2 row has no record, when two records claim the same name or
 * docs page, when one Tier 2 component has two rows (a stray `todo` copy beneath
 * the real one used to hide there), when a row's stated native test count
 * disagrees with the behaviour suite (plan 139), and when a record or a row
 * justifies a control with a package that shipped long ago. It is the automated
 * form of plan 117 §1.
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

/** Every inventory row in the file, whatever heading or column count it has. */
const allRows = (): ReadonlyArray<Row> => rowsBetween("## Design system", "");

/** The rows one name selects, so a renamed or duplicated row fails by name. */
const rowsNamed = (name: string): ReadonlyArray<Row> =>
  Arr.filter(allRows(), (row) => row.name === name);

/** Every cell of a row, because a three-column table carries its verdict in `support`. */
const rowText = (row: Row): string =>
  [row.status, row.support, row.notes].join(" ");

/** One `###` section of the playground README, from its heading to the next. */
const readmeSection = (heading: string): string => {
  const readme = readFileSync(
    fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
    "utf8",
  );
  const start = readme.indexOf(heading);
  if (start < 0) return "";
  const rest = readme.slice(start + heading.length);
  const end = rest.indexOf("\n### ");
  return end < 0 ? rest : rest.slice(0, end);
};

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

/**
 * A limitation is a promise about what the library does today.
 *
 * Three records still justified a control with "until `@gpuixui/primitives`
 * lands" after the package had shipped and two of those controls had moved onto
 * it — a reader was told to wait for a capability that already existed. The
 * remaining host fields stay host fields for a reason that outlives the
 * package: this package compiles shadcn's fixed metrics while the primitives'
 * fields are density-scaled (ADR 0006).
 */
describe("the records' limitations", () => {
  const stale = /until (?:@gpuixui\/)?primitives lands/;

  /** The limitations a record declares, or none when no record claims it. */
  const limitationsOf = (name: string): ReadonlyArray<string> =>
    Option.match(
      Arr.findFirst(inventory, (meta) => meta.name === name),
      {
        onNone: () => [],
        onSome: (meta) => meta.limitations,
      },
    );

  it("does not promise a package that has already shipped", () => {
    const problems = Arr.flatMap(inventory, (meta) =>
      Arr.filter(meta.limitations, (text) => stale.test(text)).map(
        (text) => `${meta.name}: ${text}`,
      ),
    );

    expect(problems).toEqual([]);
  });

  it("says why a control stays on the GPUix host", () => {
    Arr.forEach(["Inline validation", "Command menus"], (name) => {
      const limitations = limitationsOf(name);

      expect(
        Arr.some(
          limitations,
          (text) => text.includes("fixed") && text.includes("ADR 0006"),
        ),
        name,
      ).toBe(true);
      expect(
        Arr.some(limitations, (text) => text.includes("density-scaled")),
        name,
      ).toBe(true);
    });
  });

  it("does not promise a package that has already shipped, in a row either", () => {
    // A row is what the generated status strip and a consumer scanning the
    // inventory read, so the records' rule has to hold there too: `Command
    // menus` called its input "the host element until primitives lands" after
    // the package shipped and the seam it named had landed. The reason that
    // host stays is this package's fixed recipe against the primitives'
    // density-scaled chrome (ADR 0006), and a reader deserves that instead of a
    // wait for something already delivered.
    expect(
      Arr.filter(packageRows(), (row) => stale.test(row.notes)).map(
        (row) => row.name,
      ),
    ).toEqual([]);
  });

  it("names the live-region gap the alert really has", () => {
    expect(
      Arr.some(limitationsOf("Alerts"), (text) => text.includes("aria-live")),
    ).toBe(true);
  });

  it("calls the shared action an adapter, not a stand-in for the primitives", () => {
    const readme = readFileSync(
      fileURLToPath(new URL("README.md", packageRoot)),
      "utf8",
    );

    expect(readme).not.toContain("local stand-in for `@gpuixui/primitives`");
    expect(readme).toContain("over `@gpuixui/primitives`' action");
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
  ["Crop area", "crop-overlay"],
  ["Notification centre", "notification-centre-lifecycle"],
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

/**
 * The `crop-overlay` fixture's own numbers, read as source.
 *
 * The row teaches the mask, the press it must not take and the drag's two
 * bounds, so each figure is the fixture's rather than a retyped copy: a bar
 * re-measured at another size, a handle a pixel wider or a minimum that moved
 * fails the row that prints it.
 */
interface CropFixture {
  readonly checks: number;
  readonly min: number;
  readonly handle: number;
  readonly width: number;
  readonly height: number;
  readonly moves: number;
  readonly x: number;
  readonly y: number;
  readonly boxWidth: number;
  readonly boxHeight: number;
}

const cropFixture = (): CropFixture => {
  const read = (path: string): string =>
    readFileSync(fileURLToPath(new URL(path, repoRoot)), "utf8");
  const fixture = read("apps/playground/src/live/crop-overlay.ts");
  const probe = read("apps/playground/src/live/crop-overlay-probe.tsx");
  const number = (source: string, pattern: RegExp): number =>
    Number(pattern.exec(source)?.[1] ?? Number.NaN);
  const opening =
    /CROP_OPENING: CropRect = \{ x: (\d+), y: (\d+), width: (\d+), height: (\d+) \}/.exec(
      fixture,
    );
  return {
    checks: number(fixture, /\bCROP_CHECKS = (\d+);/),
    min: number(fixture, /\bCROP_MIN = (\d+);/),
    handle: number(fixture, /\bCROP_HANDLE = (\d+);/),
    width: number(fixture, /\bCROP_IMAGE_WIDTH = (\d+);/),
    height: number(fixture, /\bCROP_IMAGE_HEIGHT = (\d+);/),
    moves: number(probe, /\bDRAG_MOVES = (\d+);/),
    x: Number(opening?.[1] ?? Number.NaN),
    y: Number(opening?.[2] ?? Number.NaN),
    boxWidth: Number(opening?.[3] ?? Number.NaN),
    boxHeight: Number(opening?.[4] ?? Number.NaN),
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

  it("states the mask and the drag the crop fixture holds", () => {
    const crop = cropFixture();
    expect(
      [
        crop.checks,
        crop.min,
        crop.handle,
        crop.width,
        crop.height,
        crop.moves,
        crop.x,
        crop.y,
        crop.boxWidth,
        crop.boxHeight,
      ].every(Number.isFinite),
    ).toBe(true);

    expect(
      readmeSection("### `crop-overlay` — measured on 0.11.0 here"),
    ).toContain(`${crop.checks} checks, \`--only crop-overlay\``);

    const notes = Option.getOrElse(
      Option.map(
        Arr.findFirst(targetRows(), (row) => row.name === "Crop area"),
        (row) => row.notes,
      ),
      () => "",
    );
    expect(notes).not.toContain("unverified");
    expect(notes).toContain("`crop-overlay`");
    expect(notes).toContain(`${crop.checks} checks`);
    expect(notes).toContain("four positioned veil bars");
    expect(notes).toContain('`pointerEvents: "none"`');
    expect(notes).toContain(`${crop.handle}×${crop.handle}`);
    expect(notes).toContain(`${crop.moves} of ${crop.moves}`);
    expect(notes).toContain(`**${crop.min}**-point minimum`);
    expect(notes).toContain(
      `${crop.x},${crop.y},${crop.boxWidth},${crop.boxHeight}`,
    );
    expect(notes).toContain(
      `${crop.x},${crop.y},${crop.width - crop.x},${crop.height - crop.y}`,
    );
  });

  it("cites the clip a collapsing sidebar really paints", () => {
    const read = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, repoRoot)), "utf8");
    const fixture = read("apps/playground/src/live/sidebar-clip.ts");
    const probe = read("apps/playground/src/live/sidebar-clip-probe.tsx");
    const number = (source: string, pattern: RegExp): number =>
      Number(pattern.exec(source)?.[1] ?? Number.NaN);
    const checks = number(fixture, /\bSIDEBAR_CHECKS = (\d+);/);
    const open = number(fixture, /SIDEBAR_WIDTHS = \{ open: (\d+)/);
    const content = number(fixture, /\bSIDEBAR_CONTENT_WIDTH = (\d+);/);
    const markerX = number(fixture, /\bSIDEBAR_MARKER_X = (\d+);/);
    const margin = number(fixture, /\bSIDEBAR_TRAVEL_MARGIN = (\d+);/);
    const midMax = markerX - margin;
    expect(
      [checks, open, content, markerX, margin].every(Number.isFinite),
    ).toBe(true);
    // The clip is the box's own style, not a layout bound a layout read could see.
    expect(probe).toContain('overflow: "hidden"');

    const section = readmeSection(
      "### `sidebar-clip-lifecycle` — measured on 0.11.0 here",
    );
    expect(section).toContain(
      `${checks} checks, \`--only sidebar-clip-lifecycle\``,
    );

    const notes = Option.getOrElse(
      Option.map(
        Arr.findFirst(
          targetRows(),
          (row) => row.name === "Collapsible sidebars",
        ),
        (row) => row.notes,
      ),
      () => "",
    );
    Arr.forEach(
      [
        "`sidebar-clip-lifecycle`",
        `${checks} checks`,
        `${open}pt content`,
        `${content}`,
        `${midMax}`,
        'overflow: "hidden"',
        "`tabIndex={-1}`",
        "`marker=1`",
        "`main=1`",
        "`main=2`",
        "never reflows",
      ],
      (claim) => expect(notes, claim).toContain(claim),
    );
  });

  it("cites the frame surface a media card composes", () => {
    const read = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, repoRoot)), "utf8");
    const fixture = read("apps/playground/src/live/media-frame.ts");
    const number = (source: string, pattern: RegExp): number =>
      Number(pattern.exec(source)?.[1] ?? Number.NaN);
    const checks = number(fixture, /\bMEDIA_CHECKS = (\d+);/);
    const clip = number(fixture, /\bMEDIA_CLIP_MS = (\d+);/);
    const tick = number(fixture, /\bMEDIA_TICK_MS = (\d+);/);
    const poster = /MEDIA_POSTER = \{ width: (\d+), height: (\d+) \}/.exec(
      fixture,
    );
    const width = Number(poster?.[1] ?? Number.NaN);
    const height = Number(poster?.[2] ?? Number.NaN);
    expect([checks, clip, tick, width, height].every(Number.isFinite)).toBe(
      true,
    );

    const section = readmeSection(
      "### `media-frame-lifecycle` — measured on 0.11.0 here",
    );
    expect(section).toContain(
      `${checks} checks, \`--only media-frame-lifecycle\``,
    );
    // The typings are the evidence for "no playback surface", not a guess.
    expect(section).toContain("no `video` or `audio`");

    const row = Option.getOrElse(
      Arr.findFirst(
        targetRows(),
        (candidate) => candidate.name === "Video / audio player + waveform",
      ),
      () => {
        throw new Error("COMPONENTS.md: no media row");
      },
    );
    expect(row.support).toContain("not supported");
    Arr.forEach(
      [
        "`media-frame-lifecycle`",
        `${checks} checks`,
        "`video`/`audio`",
        "`setImagePixels`",
        `${width}×${height}`,
        `${tick} ms ticks`,
        "`content-surfaces`",
      ],
      (claim) => expect(rowText(row), claim).toContain(claim),
    );
  });

  it("cites the hover a filled child takes from its row", () => {
    const read = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, repoRoot)), "utf8");
    const fixture = read("apps/playground/src/live/hover-routing.ts");
    const nestings = /HOVER_NESTINGS = \[([^\]]*)\]/.exec(fixture);
    const shapes = Arr.filter(
      Arr.map((nestings?.[1] ?? "").split(","), (entry) =>
        entry.trim().replace(/"/g, ""),
      ),
      (entry) => entry !== "",
    );
    expect(shapes).toHaveLength(4);

    const section = readmeSection(
      "### `hover-routing-lifecycle` — measured on 0.11.0 here",
    );
    expect(section).toContain("56 checks, `--only hover-routing-lifecycle`");

    const page = read("packages/components/docs/list.mdx");
    const row = Option.getOrElse(
      Arr.head(rowsNamed("Lists / list items")),
      () => {
        throw new Error("COMPONENTS.md: no Lists row");
      },
    );
    Arr.forEach(
      [
        "`hover-routing-lifecycle`",
        "56 checks",
        'pointerEvents: "none"',
        "the press's own hit test",
        "the page teaches the four readings",
      ],
      (claim) => expect(rowText(row), claim).toContain(claim),
    );
    // The page teaches every shape the fixture paints, in its own table.
    Arr.forEach(
      [
        "## Hover",
        "`hover-routing-lifecycle`",
        "56 checks",
        'pointerEvents: "none"',
        "an unfilled `<text>` label",
        "a `<text>` label that paints a fill",
        "a `<div>` that paints a fill",
        'a filled `<div>` with `pointerEvents: "none"`',
      ],
      (claim) => expect(page, claim).toContain(claim),
    );
    expect(shapes).toEqual([
      "text-unfilled",
      "text-filled",
      "div-filled",
      "inert-div",
    ]);
  });

  it("states the anchored menu measured in a scrolled header", () => {
    const readme = readFileSync(
      fileURLToPath(new URL("apps/playground/README.md", repoRoot)),
      "utf8",
    );
    expect(readme).toContain(
      "### `header-menu-lifecycle` — measured on 0.11.0 here",
    );
    expect(readme).toContain("20 checks, `--only header-menu-lifecycle`");

    const notes = Option.getOrElse(
      Option.map(
        Arr.findFirst(
          targetRows(),
          (row) => row.name === "Column configuration",
        ),
        (row) => row.notes,
      ),
      () => "",
    );
    expect(notes).toContain("`header-menu-lifecycle`");
    expect(notes).toContain("20 checks");
    // The two rules a column menu is planned around.
    expect(notes).toContain("22px inside its cell");
    expect(notes).toContain("**before** the anchor");
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

  it("states the thumb a ScrollArea paints", () => {
    const section = readmeSection(
      "### `scrollbar-thumb` — measured on 0.11.0 here",
    );
    expect(section).toContain("72 checks, `--only scrollbar-thumb`");
    Arr.forEach(
      [
        "track * track / (track + maxScroll)",
        "at least 20",
        "**25**",
        "**50**",
        "**19**",
        "none at all",
        "flush against the trailing edge",
      ],
      (claim) => expect(section, claim).toContain(claim),
    );

    const rows = rowsNamed("Scrollable containers");
    expect(rows.length).toBe(2);
    Arr.forEach(rows, (row) =>
      expect(rowText(row), row.name).toContain("`scrollbar-thumb`"),
    );
    // The inventory row carries the readings a preview pane is planned around.
    expect(
      Arr.some(rows, (row) =>
        Arr.every(["**25**", "**20**", "no gutter"], (claim) =>
          rowText(row).includes(claim),
        ),
      ),
    ).toBe(true);
  });

  it("says a painted thumb takes no drag, and how a draggable bar is composed", () => {
    const section = readmeSection(
      "### `scrollbar-drag` — measured on 0.11.0 here",
    );
    expect(section).toContain("21 checks, `--only scrollbar-drag`");
    // The two reads that make the rule a measurement rather than an opinion:
    // the drags the overlay ignores, and the same drag on a real handle.
    Arr.forEach(["`x=0 y=0`", "`moves=8`", "`y = -100`"], (claim) =>
      expect(section, claim).toContain(claim),
    );

    const rows = rowsNamed("Scrollable containers");
    expect(rows.length).toBe(2);
    // The rule rides both records: which control the paint is, which routes
    // move the content, and the composition a draggable bar needs.
    Arr.forEach(rows, (row) =>
      Arr.forEach(
        [
          "`scrollbar-drag`",
          "affordance",
          "no pointer input",
          "`onScrollChange`",
          "`scrollTo`",
        ],
        (claim) =>
          expect(rowText(row), `${row.name}: ${claim}`).toContain(claim),
      ),
    );
  });

  it("states the notification centre's bound and the history it must own", () => {
    // The bug this guards: the row said "composition over toasts + panels", which
    // reads as a styling note, while the one fact a centre is planned around is
    // storage — the store keeps three cards and expires the oldest, so the panel
    // must record every title itself. Both the row and the page are held to the
    // store's own bound and the probe's readouts, so neither can drift from them.
    const read = (path: string): string =>
      readFileSync(fileURLToPath(new URL(path, repoRoot)), "utf8");
    const derive = (source: string, pattern: RegExp): number =>
      Number(pattern.exec(source)?.[1] ?? Number.NaN);
    const store = read("packages/components/src/toast/store.ts");
    const fixture = read("apps/playground/src/live/notification-centre.ts");
    const bound = derive(store, /const DEFAULT_MAX = (\d+);/);
    const gap = derive(fixture, /\bNOTIFICATION_GAP = (\d+);/);
    const checks = derive(fixture, /\bNOTIFICATION_CHECKS = (\d+);/);
    const transient = derive(fixture, /\bNOTIFICATION_TRANSIENT_MS = (\d+);/);
    expect([bound, gap, checks, transient].every(Number.isFinite)).toBe(true);
    expect(derive(fixture, /\bNOTIFICATION_MAX = (\d+);/)).toBe(bound);

    const section = readmeSection(
      "### `notification-centre-lifecycle` — measured on 0.11.0 here",
    );
    expect(section).toContain(
      `${checks} checks, \`--only notification-centre-lifecycle\``,
    );
    expect(section).toContain(`queued=${bound} ids=2,3,4`);

    const row = Option.getOrElse(
      Arr.findFirst(
        targetRows(),
        (candidate) => candidate.name === "Notification centre",
      ),
      () => {
        throw new Error("COMPONENTS.md: no Notification centre row");
      },
    );
    expect(row.status).not.toBe("todo");
    expect(row.support).not.toBe("?");
    expect(row.support).toContain("measured");
    Arr.forEach(
      [
        "`notification-centre-lifecycle`",
        `${checks} checks`,
        `${bound}** cards`,
        `${gap}px apart`,
        `queued=${bound} ids=2,3,4`,
        `${transient} ms transient`,
        "history is the app's",
        "In-window",
        "no notification API",
      ],
      (claim) => expect(rowText(row), claim).toContain(claim),
    );

    const page = read("packages/components/docs/toast.mdx");
    Arr.forEach(
      [
        "## Queue and history",
        `${bound} by default`,
        `${checks} checks`,
        "fourth push expires the oldest",
        "history is the app's",
        "no notification API",
      ],
      (claim) => expect(page, claim).toContain(claim),
    );
  });

  it("cites the roving-focus grid a window measured", () => {
    const section = readmeSection(
      "### `grid-focus-lifecycle` — measured on 0.11.0 here",
    );
    expect(section).toContain("20 checks, `--only grid-focus-lifecycle`");
    expect(section).toContain("**before** the zero-index stops");

    const rows = rowsNamed("Keyboard navigation");
    const row = Option.getOrElse(Arr.head(rows), () => {
      throw new Error("COMPONENTS.md: no Keyboard navigation row");
    });
    expect(row.support).not.toBe("?");
    expect(row.support).toContain("measured");
    Arr.forEach(
      [
        "`grid-focus-lifecycle`",
        "20 checks",
        "`focusElement`",
        "`gridfocus-r2c2`",
        "**ordered before**",
        "clamps",
      ],
      (claim) => expect(rowText(row), claim).toContain(claim),
    );
  });
});
