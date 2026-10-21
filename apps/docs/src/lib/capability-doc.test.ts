import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The capability record, held to the code that encodes it.
 *
 * `docs/gpuix-capabilities.md` is what component plans and `COMPONENTS.md` cite
 * (TODO → Phase E), and `/docs/runtime` is the page it publishes. Two things can
 * drift silently: a row can call a capability supported while
 * `@gpuixui/runtime`'s `capabilities` matrix refuses it, and the measured gaps
 * can leave the site without the probe that measured them. This guard reads
 * both files from disk, so a new matrix key without a row fails by name and a
 * dropped probe citation fails on the page that owes it.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const doc = read("docs/gpuix-capabilities.md");
const runtimePage = read("apps/docs/content/docs/runtime.mdx");
const matrixSource = read("packages/runtime/src/capabilities.ts");

/** The verdict vocabulary, longest token first so a prefix cannot win. */
const verdicts = [
  "supported, with limits",
  "not supported",
  "unverified",
  "supported",
] as const;

type Verdict = (typeof verdicts)[number];

/** One row of the limits table. */
interface LimitRow {
  readonly label: string;
  readonly verdict: Verdict;
  readonly evidence: string;
  readonly workaround: string;
}

const cells = (line: string): ReadonlyArray<string> =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

const verdictOf = (cell: string): Verdict | undefined =>
  verdicts.find((verdict) => cell.startsWith(verdict));

/** The rows under "## 3. The limits", plus any the parser could not read. */
const parseLimits = (
  markdown: string,
): { rows: ReadonlyArray<LimitRow>; malformed: ReadonlyArray<string> } => {
  const start = markdown.indexOf("\n## 3. The limits");
  const end = markdown.indexOf("\n## ", start + 1);
  const section =
    start === -1 ? "" : markdown.slice(start, end === -1 ? undefined : end);

  const rows: LimitRow[] = [];
  const malformed: string[] = [];
  let inTable = false;

  section.split("\n").forEach((line, index) => {
    if (/^\|\s*Capability\s*\|/.test(line)) {
      inTable = true;
      return;
    }
    if (!inTable || !line.startsWith("|")) return;
    if (/^\|[\s:|-]+\|$/.test(line)) return;

    const row = cells(line);
    const [label, verdictCell, evidence, workaround] = row;
    const verdict =
      verdictCell === undefined ? undefined : verdictOf(verdictCell);
    if (
      row.length !== 4 ||
      label === undefined ||
      evidence === undefined ||
      workaround === undefined ||
      verdict === undefined
    ) {
      malformed.push(
        `line ${index + 1}: expected 4 cells and a verdict, found ${row.length}`,
      );
      return;
    }
    rows.push({ label, verdict, evidence, workaround });
  });

  return { rows, malformed };
};

const { rows, malformed } = parseLimits(doc);

/** The one row whose label mentions `phrase`, or `undefined`. */
const rowFor = (phrase: string): LimitRow | undefined =>
  rows.filter((row) => row.label.includes(phrase)).at(0);

/** The matrix entries, read the way the module declares them. */
const parseMatrix = (
  source: string,
): ReadonlyArray<{ readonly key: string; readonly supported: boolean }> => {
  const entries: Array<{ key: string; supported: boolean }> = [];
  let key: string | undefined;

  for (const line of source.split("\n")) {
    const opened = /^ {2}(\w+): \{/.exec(line);
    if (opened?.[1] !== undefined) key = opened[1];
    if (line.startsWith("} as const")) key = undefined;

    const declared = /supported: (true|false)/.exec(line);
    if (declared?.[1] !== undefined && key !== undefined) {
      entries.push({ key, supported: declared[1] === "true" });
      key = undefined;
    }
  }

  return entries;
};

const matrix = parseMatrix(matrixSource);

/**
 * Each matrix key and the phrase its row's label carries. The row is what a
 * reader sees; the key is what the code narrows on, and the two must be the same
 * capability.
 */
const rowLabels: ReadonlyArray<readonly [string, string]> = [
  ["transform", "Per-element `transform`"],
  ["gridSpan", "Grid span"],
  ["canvas", "Canvas drawing"],
  ["imeComposition", "IME composition"],
  ["globalShortcut", "Global / system shortcut"],
  ["tray", "Tray / menu bar"],
  ["nativeView", "Native view"],
  ["terminal", "Terminal rendering"],
  ["headlessDialog", "Headless dialog"],
  ["tabNavigation", "Tab / Shift+Tab focus traversal"],
];

const pinnedRuntime = (): string => {
  const manifest: unknown = JSON.parse(read("package.json"));
  const workspaces =
    typeof manifest === "object" &&
    manifest !== null &&
    "workspaces" in manifest
      ? manifest.workspaces
      : undefined;
  const catalog =
    typeof workspaces === "object" &&
    workspaces !== null &&
    "catalog" in workspaces
      ? workspaces.catalog
      : undefined;
  const pin =
    typeof catalog === "object" &&
    catalog !== null &&
    "@gpuix/native" in catalog
      ? catalog["@gpuix/native"]
      : undefined;
  return typeof pin === "string" ? pin : "";
};

describe("docs/gpuix-capabilities.md", () => {
  it("parses every row of the limits table", () => {
    expect(malformed).toEqual([]);
    expect(rows.length).toBeGreaterThanOrEqual(25);
  });

  it("names the workspace's pinned runtime", () => {
    const pin = pinnedRuntime();
    expect(pin).toMatch(/^\d+\.\d+\.\d+$/);
    expect(doc).toContain(`**${pin}**`);
    expect(doc).toContain("Apache-2.0");
  });

  it("reads every entry of the runtime's capability matrix", () => {
    expect(matrix.length).toBeGreaterThanOrEqual(10);
    expect(matrix.map((entry) => entry.key)).toContain("transform");
  });

  it("gives a row, with the code's own verdict, to every matrix entry", () => {
    for (const entry of matrix) {
      const phrase = rowLabels.find(([key]) => key === entry.key)?.[1];
      expect(
        phrase,
        `matrix key \`${entry.key}\` has no row label`,
      ).toBeDefined();

      const row = rowFor(phrase ?? "");
      expect(row, `no limits row mentions "${phrase}"`).toBeDefined();

      const refused = entry.supported
        ? ["supported", "supported, with limits"]
        : ["not supported"];
      expect(
        refused,
        `\`${entry.key}\` is supported: ${entry.supported} in the matrix, but its row says "${row?.verdict}"`,
      ).toContain(row?.verdict);
    }
  });

  it("maps no key the matrix dropped", () => {
    const keys = matrix.map((entry) => entry.key);
    expect(rowLabels.filter(([key]) => !keys.includes(key))).toEqual([]);
  });

  it("records the two gaps a window measured, with the probe that measured them", () => {
    const sticky = rowFor("Sticky positioning");
    expect(sticky?.verdict).toBe("not supported");
    expect(sticky?.evidence).toContain("data-grid-fixed-header");

    const caret = rowFor("Caret and selection");
    expect(caret?.verdict).toBe("not supported");
    expect(caret?.evidence).toContain("editor-surface");
    expect(caret?.workaround).toContain("<textarea>");
  });

  it("leaves the uncertain rows uncertain", () => {
    const unverified = rows.filter((row) => row.verdict === "unverified");
    expect(unverified.length).toBeGreaterThanOrEqual(3);
  });

  it("publishes the measured gaps on /docs/runtime", () => {
    expect(runtimePage).toContain("## Measured in a window");
    expect(runtimePage).toContain("data-grid-fixed-header");
    expect(runtimePage).toContain("editor-surface");
    expect(runtimePage).toContain("docs/gpuix-capabilities.md");
    expect(runtimePage).toContain("outside");
  });

  it("publishes the same matrix the code narrows on", () => {
    // The page says its table cannot go stale because `@gpuixui/runtime`
    // encodes the matrix. That is only true if a guard reads the page: the
    // table is written by hand, so a flipped verdict would be a confident lie.
    const start = runtimePage.indexOf("## The matrix");
    const end = runtimePage.indexOf("\n## ", start + 1);
    const section = start === -1 ? "" : runtimePage.slice(start, end);

    const rows = section
      .split("\n")
      .filter((line) => line.startsWith("|") && !/^\|[\s:|-]+\|$/.test(line))
      .filter((line) => !/^\|\s*Capability\s*\|/.test(line))
      .map((line) => cells(line));

    const pageLabels: ReadonlyArray<readonly [string, string]> = [
      ["terminal", "Terminal rendering"],
      ["headlessDialog", "Headless `Dialog`"],
      ["tabNavigation", "Tab / Shift+Tab focus"],
      ["transform", "`transform`"],
      ["gridSpan", "Grid span"],
      ["canvas", "Canvas drawing"],
      ["imeComposition", "IME composition"],
      ["globalShortcut", "Global shortcut"],
      ["tray", "Tray / menu bar"],
      ["nativeView", "Native view"],
    ];

    const wrong = matrix.flatMap((entry) => {
      const label = pageLabels.find(([key]) => key === entry.key)?.[1];
      if (label === undefined)
        return [`matrix key \`${entry.key}\` has no page label`];
      const row = rows.find((cells) => (cells[0] ?? "").startsWith(label));
      if (row === undefined) return [`the page has no "${label}" row`];

      const expected = entry.supported ? "Supported" : "Not supported";
      const workaround = row[2] ?? "";
      const problems = [
        ...(row[1] === expected
          ? []
          : [`"${label}" says "${row[1]}", the matrix says "${expected}"`]),
        ...(entry.supported || workaround.length > 0
          ? []
          : [`"${label}" refuses the capability without a workaround`]),
      ];
      return problems;
    });

    expect(wrong).toEqual([]);
    expect(rows).toHaveLength(matrix.length);
  });
});
