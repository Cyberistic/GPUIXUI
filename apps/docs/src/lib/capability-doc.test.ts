import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The capability record, held to the code that encodes it.
 *
 * `docs/gpuix-capabilities.md` is what component plans and `COMPONENTS.md`
 * cite. A row can drift from `@gpuixui/runtime`'s `capabilities` matrix, and a
 * probe citation can name a probe no playground registry declares. Both are
 * read from disk here. The site's runtime page is a summary of this record; it
 * is not a second copy to keep in sync.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const doc = read("docs/gpuix-capabilities.md");
const matrixSource = read("packages/runtime/src/capabilities.ts");

const verdicts = [
  "supported, with limits",
  "not supported in the published API",
  "not supported",
  "unverified",
  "supported",
] as const;

interface LimitRow {
  readonly label: string;
  readonly verdict: string;
  readonly evidence: string;
  readonly workaround: string;
}

const cells = (line: string): ReadonlyArray<string> =>
  line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());

const limits = (source: string): ReadonlyArray<LimitRow> => {
  const start = source.indexOf("## 3. The limits");
  const end = source.indexOf("\n## ", start + 1);
  return source
    .slice(start, end === -1 ? undefined : end)
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .slice(2)
    .map(cells)
    .flatMap(([label, verdict, evidence, workaround]) =>
      label === undefined ||
      verdict === undefined ||
      evidence === undefined ||
      workaround === undefined
        ? []
        : [{ label, verdict, evidence, workaround }],
    );
};

const rows = limits(doc);

/** The record row whose label starts with `label`, or `undefined`. */
const rowFor = (label: string): LimitRow | undefined =>
  rows.find((row) => row.label.startsWith(label));

/** The matrix entries, read the way the module declares them. */
const matrix = ((): ReadonlyArray<{
  readonly key: string;
  readonly supported: boolean;
}> => {
  const entries: Array<{ key: string; supported: boolean }> = [];
  let key: string | undefined;
  for (const line of matrixSource.split("\n")) {
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
})();

/** The record's label for each matrix key. */
const labels: Readonly<Record<string, string>> = {
  transform: "Per-element `transform`",
  gridSpan: "Grid span",
  canvas: "Custom paint",
  imeComposition: "IME composition",
  globalShortcut: "Global / system shortcut",
  tray: "Tray / menu bar / status item",
  nativeView: "Native view / webview / embedded browser",
  terminal: "Terminal rendering",
  headlessDialog: "Headless dialog",
  tabNavigation: "Tab / Shift+Tab focus traversal",
};

/** The probe ids the playground's headless, live and terminal registries declare. */
const registeredProbes = (): ReadonlySet<string> => {
  const ids = (path: string) =>
    [...read(path).matchAll(/\n\s*id: "([^"]+)",/g)].map(
      (match) => match[1] ?? "",
    );
  return new Set([
    ...ids("apps/playground/src/scenarios/registry.ts"),
    ...ids("apps/playground/src/live/registry.ts"),
    ...ids("apps/playground/src/terminal/run.ts"),
  ]);
};

/** Every backticked token a row writes. */
const rowTokens = (): ReadonlyArray<string> =>
  rows
    .flatMap((row) => [row.evidence, row.workaround])
    .flatMap((cell) => [...cell.matchAll(/`([^`]+)`/g)])
    .map((match) => match[1] ?? "");

describe("docs/gpuix-capabilities.md", () => {
  it("parses every limit row with a known verdict", () => {
    expect(rows.length).toBeGreaterThanOrEqual(40);
    const unknown = rows
      .map((row) => row.verdict)
      .filter((verdict) => !verdicts.includes(verdict as never));
    expect(unknown).toEqual([]);
    // The table's first cell names a capability, not a column header.
    expect(rows.filter((row) => row.label === "Capability")).toEqual([]);
  });

  it("agrees with the runtime matrix it is encoded from", () => {
    expect(matrix.length).toBeGreaterThanOrEqual(10);
    const wrong = matrix.flatMap((entry) => {
      const label = labels[entry.key];
      if (label === undefined)
        return [`matrix key \`${entry.key}\` has no row`];
      const row = rowFor(label);
      if (row === undefined) return [`the record has no "${label}" row`];
      const saysSupported = row.verdict.startsWith("supported");
      return saysSupported === entry.supported
        ? []
        : [
            `${label}: the record says "${row.verdict}", the matrix says ${String(entry.supported)}`,
          ];
    });
    expect(wrong).toEqual([]);
  });

  it("names registered probes across the rows that cite one", () => {
    const registered = registeredProbes();
    expect(registered.size).toBeGreaterThanOrEqual(40);
    const citing = rows.filter((row) =>
      [...row.evidence.matchAll(/`([^`]+)`/g)].some((match) =>
        registered.has(match[1] ?? ""),
      ),
    );
    // The measured rows are the record's evidence; a scan that stopped
    // matching cannot pass on an empty set.
    expect(citing.length).toBeGreaterThanOrEqual(30);
  });

  it("cites no probe-shaped id the registry does not declare", () => {
    const registered = registeredProbes();
    const unknown = rowTokens().filter(
      (token) => token.endsWith("-lifecycle") && !registered.has(token),
    );
    expect(unknown).toEqual([]);
  });

  it("owes every cited probe a line in §5", () => {
    const keeping = doc.slice(doc.indexOf("## 5. Keeping this document true"));
    expect(keeping).not.toBe("");
    const registered = registeredProbes();
    const cited = rowTokens().filter((token) => registered.has(token));
    expect(cited.length).toBeGreaterThanOrEqual(15);
    expect(
      Array.from(new Set(cited)).filter((id) => !keeping.includes(id)),
    ).toEqual([]);
  });
});
