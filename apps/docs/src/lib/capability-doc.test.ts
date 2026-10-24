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

const modalFixture = read("apps/playground/src/live/modal-scroll.ts");
const runtimePage = read("apps/docs/content/docs/runtime.mdx");

/** One numeric constant the fixture exports. */
const fixtureNumber = (name: string): number => {
  const found = new RegExp(`export const ${name} = (-?\\d+)`).exec(
    modalFixture,
  );
  return Number(found?.[1] ?? Number.NaN);
};

/** A number as the record prints it: thousands separated by a space. */
const grouped = (value: number): string => {
  const text = String(Math.abs(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return value < 0 ? `-${text}` : text;
};

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

  it("records the wheel a modal contains, from its fixture", () => {
    // The probe measured that an `occlude` layer is a wall, which is the reason
    // a modal over a scrolling page needs no scroll lock. Every figure the
    // record prints is the fixture's own arithmetic, so a changed row count or
    // viewport fails here instead of leaving a stale measurement behind.
    const pageRows = fixtureNumber("MODAL_PAGE_ROWS");
    const rowHeight = fixtureNumber("MODAL_ROW_HEIGHT");
    const bodyRows = fixtureNumber("BODY_ROWS");
    const pageViewport = fixtureNumber("PAGE_VIEWPORT");
    const dialogViewport = fixtureNumber("DIALOG_VIEWPORT");
    const chrome = fixtureNumber("DIALOG_CHROME_HEIGHT");
    expect([
      pageRows,
      rowHeight,
      bodyRows,
      pageViewport,
      dialogViewport,
      chrome,
    ]).toEqual([40, 40, 30, 472, 456, 232]);

    const pageContent = pageRows * rowHeight;
    const dialogContent = bodyRows * rowHeight + chrome;
    const pageClamp = Math.min(0, pageViewport - pageContent);
    const dialogClamp = Math.min(0, dialogViewport - dialogContent);
    expect([pageContent, dialogContent, pageClamp, dialogClamp]).toEqual([
      1600, 1432, -1128, -976,
    ]);

    const row = rowFor("Modal scroll containment");
    expect(row?.verdict).toBe("supported");
    const evidence = row?.evidence ?? "";
    expect(evidence).toContain("`modal-scroll-lifecycle`");
    expect(evidence).toContain("src/live/modal-scroll.ts");
    expect(evidence).toContain(grouped(pageContent));
    expect(evidence).toContain(grouped(dialogContent));
    expect(evidence).toContain(`**${grouped(pageClamp)}**`);
    expect(evidence).toContain(`**${grouped(dialogClamp)}**`);
    expect(evidence).toContain("`occlude`");
    expect(evidence).toContain("`onScroll`");
    expect(row?.workaround).toContain("no scroll lock");

    // The page is a summary of the record, not a second copy: it names the
    // rule, the probe and the consequence a reader acts on.
    expect(runtimePage).toContain("`modal-scroll-lifecycle`");
    expect(runtimePage).toContain("no scroll lock");
    expect(runtimePage).toContain("occlude");
  });

  it("records the chrome the shipped shell parts paint, from the probe", () => {
    // The record's Application-menu row can only say "draw an in-window menu";
    // whether the shipped parts actually paint one was only in the playground's
    // README. The row is the durable claim, so it is held to the probe's own
    // section: a renamed probe, a changed check count or a limit the probe no
    // longer measures fails here.
    const row = rowFor("In-window application chrome");

    expect(row?.verdict).toBe("supported, with limits");
    const evidence = row?.evidence ?? "";
    expect(evidence).toContain("Composed, not provided");
    expect(evidence).toContain("`app-chrome-lifecycle`");
    expect(evidence).toContain("47 checks");
    expect(evidence).toContain("`Escape`");
    expect(evidence).toContain("overflow");
    expect(evidence).toContain("pointer move");
    expect(row?.workaround).toContain("`Enter`");

    const probe = read("apps/playground/README.md");
    const section = probe.slice(probe.indexOf("### `app-chrome-lifecycle`"));
    expect(section).not.toBe("");
    expect(section).toContain("47 checks");
    expect(section).toContain("Right");
    expect(section).toContain("disabled");
    expect(section).toContain("`escape`");
    expect(section).toContain("status bar");

    // The page is a summary of the record, not a second copy: it names the
    // probe, the parts and the one action a reader takes.
    const pageRow = runtimePage
      .split("\n")
      .find((line) => line.startsWith("| In-window application chrome"));
    expect(pageRow).toContain("`app-chrome-lifecycle`");
    expect(pageRow).toContain("47 checks");
    expect(pageRow).toContain("AppMenu");
    expect(pageRow).toContain("`Enter`");

    // §5 owes every cited probe a line.
    expect(doc.slice(doc.indexOf("## 5."))).toContain("`app-chrome-lifecycle`");
  });
});
