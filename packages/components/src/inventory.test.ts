import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { glyphMaxCells } from "./glyph/logic.js";
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

const TEST_CASE = /^ {2}it\(/;

const countBehaviourTests = (relative: string): number =>
  Arr.length(
    Arr.filter(
      readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8").split(
        "\n",
      ),
      (line) => TEST_CASE.test(line),
    ),
  );

const rowsBetween = (
  startHeading: string,
  endHeading: string,
): ReadonlyArray<Row> => {
  const markdown = readFileSync(
    fileURLToPath(new URL(".agents/slop/COMPONENTS.md", repoRoot)),
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

const tier1Rows = (): ReadonlyArray<Row> =>
  rowsBetween("## Tier 1", "## Tier 2");

const animatedRows = (): ReadonlyArray<Row> =>
  rowsBetween("## Animated primitives (plan 600)", "## Effects");

const targetRows = (): ReadonlyArray<Row> =>
  rowsBetween("## Tier 3", "## Animated primitives (plan 600)");

const allRows = (): ReadonlyArray<Row> => rowsBetween("## Design system", "");

const rowsNamed = (name: string): ReadonlyArray<Row> =>
  Arr.filter(allRows(), (row) => row.name === name);

const rowText = (row: Row): string =>
  [row.status, row.support, row.notes].join(" ");

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

const packageRows = (): ReadonlyArray<Row> => [
  ...tier2Rows(),
  ...animatedRows(),
];

const tier5Rows = (): ReadonlyArray<Row> =>
  rowsBetween("## Tier 5 — specialised", "## Animated primitives (plan 600)");

const recordRows = (): ReadonlyArray<Row> => [
  ...tier1Rows(),
  ...packageRows(),
  ...tier5Rows(),
];

const owesRecord = (row: Row): boolean =>
  row.status !== "todo" && row.status !== "done (composed)";

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

  it("agrees with its .agents/slop/COMPONENTS.md row", () => {
    const rows = recordRows();
    const problems = Arr.flatMap(inventory, (meta) => {
      const row = Arr.findFirst(
        rows,
        (candidate) => candidate.name === meta.name,
      );
      return Option.match(row, {
        onNone: () => [`${meta.name}: no .agents/slop/COMPONENTS.md row`],
        onSome: (found) => {
          if (found.status !== meta.status) {
            return [
              `${meta.name}: row says ${found.status}, record says ${meta.status}`,
            ];
          }

          const verdict = found.support.replace(/\s\(.*\)$/, "");
          if (verdict !== meta.gpuixSupport) {
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
      Arr.filter(packageRows(), owesRecord),
      (row) => !Arr.some(inventory, (meta) => meta.name === row.name),
    ).map(
      (row) => `${row.name}: row is ${row.status} with no inventory record`,
    );

    expect(problems).toEqual([]);
  });

  it("asks a composed row for no record it cannot have", () => {
    const row = (name: string, status: string): Row => ({
      name,
      status,
      support: "yes",
      notes: "",
    });

    expect(owesRecord(row("Auth", "done (composed)"))).toBe(false);
    expect(owesRecord(row("Button", "done"))).toBe(true);
    expect(owesRecord(row("Toggle", "wip"))).toBe(true);
    expect(owesRecord(row("Calendar", "todo"))).toBe(false);
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

  it("states the real native test count where a row claims one", () => {
    const rows = recordRows();
    const problems = Arr.flatMap(
      Arr.filter(inventory, (meta: ComponentMeta) => meta.status === "done"),
      (meta: ComponentMeta) => {
        const row = Arr.findFirst(
          rows,
          (candidate) => candidate.name === meta.name,
        );
        return Option.match(row, {
          onNone: () => [`${meta.name}: no .agents/slop/COMPONENTS.md row`],
          onSome: (found) => {
            const claimed = Option.flatMap(
              Option.fromNullishOr(
                /(\d+) native behaviour tests/.exec(found.notes),
              ),
              (match) => Option.fromNullishOr(match[1]),
            );
            const actual = countBehaviourTests(meta.testFile);
            return Option.match(claimed, {
              onNone: () => [],
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

  it("records the node cap a glyph wall keeps", () => {
    const row = rowsNamed("Glyph");
    expect(row).toHaveLength(1);

    expect(row[0]?.notes ?? "").toContain(
      `\`glyphMaxCells\` (${glyphMaxCells})`,
    );
  });

  it("records one blocked capability for every partial row", () => {
    const partialRows = Arr.filter(
      allRows(),
      (row: Row) => row.support === "partial",
    );
    const problems = Arr.flatMap(partialRows, (row: Row) => {
      const blocked =
        /^blocked by .+ \((?:#\d+|unfiled)(?:, #\d+)?\) — .+$/.exec(row.notes);
      return blocked === null
        ? [`${row.name}: partial row has no one-line blocked note`]
        : [];
    });

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

describe("the records' limitations", () => {
  const stale = /until (?:@gpuixui\/)?primitives lands/;

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
    const limitations = Option.match(
      Arr.findFirst(inventory, (meta) => meta.name === "Tabs"),
      { onNone: () => [], onSome: (meta) => meta.limitations },
    );
    const claimed = Option.getOrUndefined(
      Arr.findFirst(limitations, (text) => text.includes("selected surface")),
    );

    expect(claimed).toContain("slides");
    expect(claimed).toContain("transform");
    expect(Arr.some(limitations, (text) => text.includes("jumps"))).toBe(false);
  });
});

const CITATIONS: ReadonlyArray<readonly [string, string]> = [
  ["Charts", "chart-raster"],
  ["Resizable split panes", "nested-scroll-lifecycle"],
  ["Docking layouts", "nested-scroll-lifecycle"],
  ["Workspace layouts", "workspace-restore"],
  ["Workspace layouts", "second-window-lifecycle"],
  ["Persistent panel state", "workspace-restore"],
  ["Detachable / movable tabs", "second-window-lifecycle"],
  ["Drag and drop", "second-window-lifecycle"],
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

const radioChecks = (): number =>
  Number(
    /\bRADIO_CHECKS = (\d+);/.exec(
      readFileSync(
        fileURLToPath(
          new URL("apps/playground/src/live/radio-group.ts", repoRoot),
        ),
        "utf8",
      ),
    )?.[1] ?? Number.NaN,
  );

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
    const notesOf = (name: string): string =>
      Option.getOrElse(
        Option.map(
          Arr.findFirst(rows, (row) => row.name === name),
          (row) => row.notes,
        ),
        () => "",
      );

    Arr.forEach(["Image preview"], (name) => {
      const notes = notesOf(name);
      expect(notes, name).toContain("`image-fit`");
      expect(notes, name).toContain("161 checks");

      expect(notes, name).toContain("`cover`");
      expect(notes, name).toContain("`none`");
      expect(notes, name).toContain("`contain`");
    });
    expect(notesOf("Crop area")).toContain("`image-fit`");
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
    expect(notes).toContain("blocked by");

    const capabilities = readFileSync(
      fileURLToPath(new URL("docs/gpuix-capabilities.md", repoRoot)),
      "utf8",
    );
    Arr.forEach(
      [
        `${crop.checks} checks`,
        "four positioned veil bars",
        '`pointerEvents: "none"`',
        `${crop.handle}×${crop.handle}`,
        `${crop.moves} of ${crop.moves}`,
        `**${crop.min}**-point minimum`,
        `${crop.x},${crop.y},${crop.boxWidth},${crop.boxHeight}`,
        `${crop.x},${crop.y},${crop.width - crop.x},${crop.height - crop.y}`,
      ],
      (claim) => expect(capabilities, claim).toContain(claim),
    );
  });

  it("cites the disc, the ring and the skip the radio probe measured", () => {
    const checks = radioChecks();
    expect(Number.isFinite(checks)).toBe(true);
    expect(
      readmeSection("### `radio-group-lifecycle` — measured on 0.11.0 here"),
    ).toContain(`${checks} checks, \`--only radio-group-lifecycle\``);

    const notes = Option.getOrElse(
      Option.map(
        Arr.findFirst(tier1Rows(), (row) => row.name === "Radio groups"),
        (row) => row.notes,
      ),
      () => "",
    );
    expect(notes).toContain("`radio-group-lifecycle`");
    expect(notes).toContain(`${checks} checks`);
  });

  it("records the drop a file upload composes", () => {
    const found = Option.getOrElse(
      Arr.findFirst(allRows(), (row) => row.name === "File upload"),
      () => expect.fail("the File upload row is missing"),
    );
    const section = readmeSection("## File drops");
    const registry = readFileSync(
      fileURLToPath(
        new URL("apps/playground/src/scenarios/registry.ts", repoRoot),
      ),
      "utf8",
    );

    expect(found.support).not.toBe("?");
    expect(found.support).toContain("drop");
    expect(found.notes).toContain("`file-drop`");
    expect(found.notes).toContain("paths=/tmp/alpha.txt,/tmp/beta.txt");
    expect(section).toContain("nativeSimulateFileDrop");
    expect(section).toContain("paths=/tmp/alpha.txt,/tmp/beta.txt");
    expect(registry).toContain('id: "file-drop"');
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

  const readmeChecks = (heading: string, probe: string): number =>
    Number(
      new RegExp(`(\\d+) checks, \`--only ${probe}\``).exec(
        readmeSection(heading),
      )?.[1] ?? Number.NaN,
    );

  const oneRow = (name: string): Row => {
    const rows = rowsNamed(name);
    if (rows.length !== 1) {
      throw new Error(
        `.agents/slop/COMPONENTS.md: ${rows.length} rows named ${name}`,
      );
    }
    return Option.getOrElse(Arr.head(rows), () => {
      throw new Error(`.agents/slop/COMPONENTS.md: no row named ${name}`);
    });
  };

  const pageText = (file: string): string =>
    readFileSync(fileURLToPath(new URL(`docs/${file}`, packageRoot)), "utf8");

  const missingClaims = (
    label: string,
    text: string,
    claims: ReadonlyArray<string>,
  ): ReadonlyArray<string> =>
    Arr.flatMap(claims, (claim) =>
      text.includes(claim) ? [] : [`${label} does not cite ${claim}`],
    );

  it("cites the edge, veil and press the drawer probe measured", () => {
    const heading = "### `drawer-lifecycle` — measured on 0.11.0 here";
    const probe = "drawer-lifecycle";
    const checks = readmeChecks(heading, probe);
    expect(Number.isFinite(checks)).toBe(true);
    expect(readmeSection(heading)).toContain(
      `${checks} checks, \`--only ${probe}\``,
    );

    const claims = [
      `\`${probe}\` (${checks} checks`,
      "500,0,400,520",
      "0,100,900,420",
      "returns the focus to the opener",
    ];
    expect(
      missingClaims(
        ".agents/slop/COMPONENTS.md's Drawer row",
        rowText(oneRow("Drawer")),
        claims,
      ),
    ).toEqual([]);

    expect(rowText(oneRow("Drawer"))).toContain("no swipe-to-dismiss");
  });

  it("cites the paint and the frame the carousel probe measured", () => {
    const heading = "### `carousel-lifecycle` — measured on 0.11.0 here";
    const probe = "carousel-lifecycle";
    const checks = readmeChecks(heading, probe);
    expect(Number.isFinite(checks)).toBe(true);
    expect(readmeSection(heading)).toContain(
      `${checks} checks, \`--only ${probe}\``,
    );

    const claims = [
      `\`${probe}\` (${checks} checks`,
      "122 → 162 → 102",
      "18×6",
      "6×6",
    ];
    expect(
      missingClaims(
        ".agents/slop/COMPONENTS.md's Carousel row",
        rowText(oneRow("Carousel")),
        claims,
      ),
    ).toEqual([]);
  });

  it("cites the magnification and the corner the image-zoom probe measured", () => {
    const heading = "### `image-zoom-lifecycle` — measured on 0.11.0 here";
    const probe = "image-zoom-lifecycle";
    const checks = readmeChecks(heading, probe);
    expect(Number.isFinite(checks)).toBe(true);
    expect(readmeSection(heading)).toContain(
      `${checks} checks, \`--only ${probe}\``,
    );

    const claims = [
      `\`${probe}\` (${checks} checks`,
      "384×256 at −36,−72",
      "30×30 → 48×48",
    ];
    expect(
      missingClaims(
        ".agents/slop/COMPONENTS.md's Image zoom row",
        rowText(oneRow("Image zoom")),
        claims,
      ),
    ).toEqual([]);
  });

  it("cites the area press and the refused edge the color-picker probe measured", () => {
    const heading = "### `color-picker-lifecycle` — measured on 0.11.0 here";
    const probe = "color-picker-lifecycle";
    const checks = readmeChecks(heading, probe);
    expect(Number.isFinite(checks)).toBe(true);
    expect(readmeSection(heading)).toContain(
      `${checks} checks, \`--only ${probe}\``,
    );

    const claims = [
      `\`${probe}\` (${checks} checks`,
      "area press commits the colour under the pointer",
      "`#FF00AA`",
      "refused=0",
      "tabIndex: -1",
    ];
    expect(
      missingClaims(
        ".agents/slop/COMPONENTS.md's Color picker row",
        rowText(oneRow("Color picker")),
        claims,
      ),
    ).toEqual([]);
    expect(
      missingClaims("color-picker.mdx", pageText("color-picker.mdx"), claims),
    ).toEqual([]);

    expect(pageText("color-picker.mdx")).toContain(
      "src/behaviour/color-picker.test.tsx",
    );

    expect(rowText(oneRow("Color picker"))).toContain("Color picker hex value");
  });

  it("cites the shipped player's own paint in its row and its page", () => {
    const heading = "### `media-player-lifecycle` — measured on 0.11.0 here";
    const probe = "media-player-lifecycle";
    const checks = readmeChecks(heading, probe);
    expect(Number.isFinite(checks)).toBe(true);
    expect(readmeSection(heading)).toContain(
      `${checks} checks, \`--only ${probe}\``,
    );

    const claims = [
      `\`${probe}\` (${checks} checks`,
      "512×288",
      "496×4",
      "0:00 / 0:04",
    ];
    expect(
      missingClaims(
        ".agents/slop/COMPONENTS.md's player row",
        rowText(oneRow("Video / audio player + waveform")),
        claims,
      ),
    ).toEqual([]);
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

    expect(section).toContain("no `video` or `audio`");

    const row = Option.getOrElse(
      Arr.findFirst(
        targetRows(),
        (candidate) => candidate.name === "Video / audio player + waveform",
      ),
      () => {
        throw new Error(".agents/slop/COMPONENTS.md: no media row");
      },
    );
    expect(row.support).toContain("partial");
    Arr.forEach(
      [
        "`media-frame-lifecycle`",
        `${checks} checks`,
        "`video`/`audio`",
        "`setImagePixels`",
        `${width}×${height}`,
        `${tick} ms ticks`,
        "`content-surfaces`",
        "`MediaPlayer`",
        "`src/behaviour/media-player.test.tsx`",
        "`packages/media/docs/media-player.mdx`",
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

    const row = Option.getOrElse(
      Arr.head(rowsNamed("Lists / list items")),
      () => {
        throw new Error(".agents/slop/COMPONENTS.md: no Lists row");
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

    const capabilities = readFileSync(
      fileURLToPath(new URL("docs/gpuix-capabilities.md", repoRoot)),
      "utf8",
    );
    Arr.forEach(
      ["**25**px", "**20**px", "**19**px", "trailing edge"],
      (claim) => expect(capabilities, claim).toContain(claim),
    );
  });

  it("says a painted thumb takes no drag, and how a draggable bar is composed", () => {
    const section = readmeSection(
      "### `scrollbar-drag` — measured on 0.11.0 here",
    );
    expect(section).toContain("21 checks, `--only scrollbar-drag`");

    Arr.forEach(["`x=0 y=0`", "`moves=8`", "`y = -100`"], (claim) =>
      expect(section, claim).toContain(claim),
    );

    const rows = rowsNamed("Scrollable containers");
    expect(rows.length).toBe(2);

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
        throw new Error(
          ".agents/slop/COMPONENTS.md: no Notification centre row",
        );
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
  });

  it("cites the roving-focus grid a window measured", () => {
    const section = readmeSection(
      "### `grid-focus-lifecycle` — measured on 0.11.0 here",
    );
    expect(section).toContain("20 checks, `--only grid-focus-lifecycle`");
    expect(section).toContain("**before** the zero-index stops");

    const rows = rowsNamed("Keyboard navigation");
    const row = Option.getOrElse(Arr.head(rows), () => {
      throw new Error(".agents/slop/COMPONENTS.md: no Keyboard navigation row");
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
