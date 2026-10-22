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

/** The rows of one `/docs/runtime` table, as cells. */
const sectionRows = (heading: string): ReadonlyArray<ReadonlyArray<string>> => {
  const start = runtimePage.indexOf(heading);
  const end = runtimePage.indexOf("\n## ", start + 1);
  return runtimePage
    .slice(start, end === -1 ? undefined : end)
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|[\s:|-]+\|$/.test(line))
    .map(cells);
};

/** The measured row whose label starts with `label`, or `undefined`. */
const measuredRow = (label: string) =>
  sectionRows("## Measured in a window").find((row) =>
    (row[0] ?? "").startsWith(label),
  );

/** The offscreen row whose label starts with `label`, or `undefined`. */
const offscreenRow = (label: string) =>
  sectionRows("## Measured offscreen").find((row) =>
    (row[0] ?? "").startsWith(label),
  );

/**
 * The probe ids the page cites as `(`id`)` in its two measured sections.
 *
 * The citation shape is what keeps a hyphenated value in prose (`wrow-60`) out
 * of the list: a probe is named in parentheses, not mentioned in a sentence.
 */
const citedProbes = (): ReadonlyArray<string> => {
  const ids = (heading: string) =>
    sectionRows(heading)
      .flatMap((row) => row)
      .flatMap((cell) => [...cell.matchAll(/\(`([a-z][a-z0-9-]*)`\)/g)])
      .map((match) => match[1] ?? "");
  return Array.from(
    new Set([
      ...ids("## Measured in a window"),
      ...ids("## Measured offscreen"),
    ]),
  );
};

/** The probe ids the playground's headless and live registries declare. */
const registeredProbes = (): ReadonlySet<string> => {
  const ids = (path: string) =>
    [...read(path).matchAll(/\n\s*id: "([^"]+)",/g)].map(
      (match) => match[1] ?? "",
    );
  return new Set([
    ...ids("apps/playground/src/scenarios/registry.ts"),
    ...ids("apps/playground/src/live/registry.ts"),
  ]);
};

/** The typings-gap row whose label starts with `label`, or `undefined`. */
const typingsRow = (label: string) =>
  sectionRows("## Not in the typings").find((row) =>
    (row[0] ?? "").startsWith(label),
  );

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

  it("records the focus-event limit a window measured on the events row", () => {
    // `onFocus` is declared and the events row called it supported while a
    // `Tab` traversal moved focus without ever running the handler: a tooltip
    // that opens on focus stayed closed and Tabs' own counter stayed at 0.
    // Both probes paint, so the row carries their evidence.
    const events = rowFor("Pointer, keyboard and focus events");
    expect(events?.verdict).toBe("supported, with limits");
    expect(events?.evidence).toContain("tooltip-lifecycle");
    expect(events?.evidence).toContain("tabs-lifecycle");
  });

  it("records what each scroll event reports, with the probe that measured it", () => {
    // The events row listed `onScroll` and `onScrollChange` side by side as if
    // they carried the same number. A window measured that they do not: the
    // wheel input is not the distance travelled, so a scrollbar built on
    // `deltaY` jumps past the position it painted.
    const scroll = rowFor("Scroll events");
    expect(scroll?.verdict).toBe("supported, with limits");
    expect(scroll?.evidence).toContain("scroll-lifecycle");
    expect(scroll?.evidence).toContain("onScrollChange");
    expect(scroll?.evidence).toContain("getScrollOffset");
    expect(scroll?.workaround).toContain("onScrollChange");
  });

  it("records the pointer-capture rule a window measured, with the probe behind it", () => {
    // The Slider's page, the range slider's and two COMPONENTS.md rows said a
    // drag that leaves the track stops, and this record said nothing at all, so
    // a splitter or a drag handle had no contract to build on. `pointer-capture`
    // measured the rule: the runtime arms capture only for an element that
    // listens to both mouseDown and mouseMove, and the shipped Slider follows a
    // drag the pointer finishes 120px off its track.
    const capture = rowFor("Pointer capture");
    expect(capture?.verdict).toBe("supported, with limits");
    expect(capture?.evidence).toContain("pointer-capture");
    expect(capture?.evidence).toContain("onMouseDown");
    expect(capture?.evidence).toContain("onMouseMove");
    expect(capture?.workaround).toContain("onMouseMove");
  });

  it("publishes the pointer-capture rule on /docs/runtime", () => {
    const capture = measuredRow("Pointer capture");
    expect(
      capture,
      "the page's measured table has no pointer-capture row",
    ).toBeDefined();
    expect(capture?.[1]).toContain("onMouseMove");
    expect(capture?.[1]).toContain("pointer-capture");
    expect(capture?.[2]).toContain("onMouseMove");
  });

  it("records what a chart or an image can draw, with the probe that measured it", () => {
    // `<svg>` is in `ElementType` and `setImagePixels` is on the renderer, so the
    // typings made both look like general-purpose drawing. `content-surfaces`
    // measured that an SVG paints as one tint and that a pixel buffer only
    // reaches the frame from a layout effect — the two facts a chart or an image
    // preview is built on.
    const svg = rowFor("Inline SVG painting");
    expect(svg?.verdict).toBe("supported, with limits");
    expect(svg?.evidence).toContain("content-surfaces");
    expect(svg?.evidence).toContain("one tint");
    expect(svg?.workaround).toContain("one `<svg>` per colour");

    const image = rowFor("Image painting");
    expect(image?.verdict).toBe("supported, with limits");
    expect(image?.evidence).toContain("setImagePixels");
    expect(image?.evidence).toContain("layout effect");

    const canvas = rowFor("Canvas drawing");
    expect(canvas?.evidence).toContain("content-surfaces");
    expect(canvas?.evidence).toContain("painted bounds");
  });

  it("publishes what an SVG and an image can draw on /docs/runtime", () => {
    const svg = measuredRow("Inline SVG");
    expect(
      svg,
      "the page's measured table has no inline-SVG row",
    ).toBeDefined();
    expect(svg?.[1]).toContain("one tint");
    expect(svg?.[1]).toContain("content-surfaces");
    expect(svg?.[2]).toContain("one `<svg>` per colour");

    const image = measuredRow("Image bytes");
    expect(image, "the page's measured table has no image row").toBeDefined();
    expect(image?.[1]).toContain("layout effect");
    expect(image?.[1]).toContain("content-surfaces");
    expect(image?.[2]).toContain("useLayoutEffect");
  });

  it("records the portal a window measured, with its two limits", () => {
    // `@gpuix/react` publishes `createPortal`, and the only documentation a
    // consumer had was its own example. `portal-layer` measured what a dialog,
    // a toast viewport or a "move this tab to another layer" action asks of it,
    // plus the two facts that decide how a component uses it: a clip is a pixel
    // fact that the paint report cannot see, and the clipping box has to be the
    // child's containing block. One window per process, so a detach is a layer
    // move rather than a new OS window.
    const portal = rowFor("Portals");
    expect(portal?.verdict).toBe("supported, with limits");
    expect(portal?.evidence).toContain("portal-layer");
    expect(portal?.evidence).toContain("getPaintedText");
    expect(portal?.evidence).toContain("containing block");
    expect(portal?.workaround).toContain("capture");
    expect(portal?.workaround).toContain("same window");
  });

  it("publishes the portal measurement on /docs/runtime", () => {
    const portal = measuredRow("Portals");
    expect(portal, "the page's measured table has no portal row").toBeDefined();
    expect(portal?.[1]).toContain("portal-layer");
    expect(portal?.[1]).toContain("getPaintedText");
    expect(portal?.[2]).toContain("capture");
  });

  it("keeps a component page from denying the portal the runtime publishes", () => {
    // The curated Popover page said "There is no portal" — a claim about the
    // runtime, not about the component. `createPortal` is published and a
    // window measured it, so the page now says which surface it paints.
    const popover = read("apps/docs/content/docs/components/popover.mdx");
    expect(popover).not.toContain("There is no portal");
    expect(popover).toContain("portalled");
  });

  it("records the reveal and the range a window measured on a virtual list", () => {
    // `COMPONENTS.md`'s Tree, Virtualized table and Log viewer rows all read
    // `<virtual-list>`, and the record said only "read the painted window, not
    // the index" — so a tree that revealed a path by scrolling to it, or one
    // that paginated from `onVisibleRange`, had nothing warning it. A window
    // measured both: `scrollToItem` reveals an unmounted row and fires no
    // report, the report describes the previous scroll or the spliced child
    // list, and roving focus moves through the renderer.
    const virtual = rowFor("Virtualized list");
    expect(virtual?.verdict).toBe("supported, with limits");
    expect(virtual?.evidence).toContain("virtual-tree-lifecycle");
    expect(virtual?.evidence).toContain("virtual-list-lifecycle");
    expect(virtual?.evidence).toContain("scrollToItem");
    expect(virtual?.evidence).toContain("onVisibleRange");
    expect(virtual?.evidence).toContain("focusElement");
    expect(virtual?.workaround).toContain("scrollToItem");
    expect(virtual?.workaround).toContain("painted");
  });

  it("publishes the virtual-list reveal rule on /docs/runtime", () => {
    const virtual = measuredRow("Virtualized list");
    expect(
      virtual,
      "the page's measured table has no virtual-list row",
    ).toBeDefined();
    expect(virtual?.[1]).toContain("virtual-tree-lifecycle");
    expect(virtual?.[1]).toContain("scrollToItem");
    expect(virtual?.[1]).toContain("onVisibleRange");
    expect(virtual?.[2]).toContain("scrollToItem");
  });

  it("records the itemCount window mode and the two rules a table reads", () => {
    // The row described the children form only — every row retained, off-screen
    // build skipped — which is not how a 100 000-row table is built. The
    // `itemCount` + `windowStart` mode mounts a slice the app renders, and
    // `virtual-list-windowed` measured what a table has to get right: the range
    // event is absolute but one gesture behind the paint, and a reveal has to
    // move the app's window before it scrolls.
    const virtual = rowFor("Virtualized list");
    expect(virtual?.verdict).toBe("supported, with limits");
    expect(virtual?.evidence).toContain("itemCount");
    expect(virtual?.evidence).toContain("windowStart");
    expect(virtual?.evidence).toContain("virtual-list-windowed");
    expect(virtual?.evidence).toContain("20..27");
    expect(virtual?.evidence).toContain("40..46");
    expect(virtual?.workaround).toContain("windowStart");
    expect(virtual?.workaround).toContain("overdraw");
  });

  it("publishes the windowed virtual-list rules on /docs/runtime", () => {
    const virtual = measuredRow("Virtualized list");
    expect(
      virtual,
      "the page's measured table has no virtual-list row",
    ).toBeDefined();
    expect(virtual?.[1]).toContain("itemCount");
    expect(virtual?.[1]).toContain("virtual-list-windowed");
    expect(virtual?.[2]).toContain("windowStart");
    expect(virtual?.[2]).toContain("overdraw");
  });

  it("records the variable row heights a wrapped table needs", () => {
    // Every virtual-list probe declared fixed heights, so "rows do not need
    // equal heights" was a claim. `virtual-list-rows` measured 400 rows cycling
    // 24 / 48 / 72px — including the one fact an expandable row depends on: a
    // row that grows while it is outside the window is not remeasured until it
    // paints again.
    const virtual = rowFor("Virtualized list");
    expect(virtual?.evidence).toContain("virtual-list-rows");
    expect(virtual?.evidence).toContain("24 / 48 / 72");
    expect(virtual?.evidence).toContain("remeasured");
    expect(virtual?.workaround).toContain("on screen");

    const page = measuredRow("Virtualized list");
    expect(page?.[1]).toContain("virtual-list-rows");
    expect(page?.[1]).toContain("24 / 48 / 72");
    expect(page?.[2]).toContain("on screen");
  });

  it("records the expandable row a window measured", () => {
    // The virtual-list row covered rows of different heights and a row that grows
    // *outside* the window, which is the case an expandable row does not have:
    // the reader presses a row on screen and the layout below must follow with no
    // scroll to prompt a re-measure. `virtual-list-expand` measured that, plus
    // the rule a table has to design around — a growth that leaves less than one
    // row of viewport drops the next row's paint until a scroll.
    const virtual = rowFor("Virtualized list");
    expect(virtual?.evidence).toContain("virtual-list-expand");
    expect(virtual?.evidence).toContain("120px");
    expect(virtual?.evidence).toContain("painted window");
    expect(virtual?.evidence).toContain("row 3 + 120");
    expect(virtual?.workaround).toContain("open");

    const page = measuredRow("Expandable rows");
    expect(
      page,
      "the page's measured table has no expandable-row row",
    ).toBeDefined();
    expect(page?.[1]).toContain("virtual-list-expand");
    expect(page?.[1]).toContain("next frame");
    expect(page?.[1]).toContain("painted window");
    expect(page?.[2]).toContain("**open** row height");
  });

  it("records the dock reflow signal, with the stale pass and the unchanged pane", () => {
    // A fixed-width split cannot re-clamp when its parent shrinks, and the stated
    // way out — a dock passing its own bounds through `onLayout` — had never been
    // measured. `dock-reflow` measured that the report exists, that the **first**
    // pass of a reflow carries the old box, and that a pane whose box did not
    // change is still reported to; a handler that reads a report as "you changed"
    // loops. The record had no split-pane row at all.
    const dock = rowFor("Resizable panels and dock reflow");
    expect(dock?.verdict).toBe("supported, with limits");
    expect(dock?.evidence).toContain("dock-reflow");
    expect(dock?.evidence).toContain("w=340");
    expect(dock?.evidence).toContain("w=240");
    expect(dock?.evidence).toContain("reports=2");
    expect(dock?.evidence).toContain("split-pane-lifecycle");
    expect(dock?.evidence).toContain("docking-nested");
    expect(dock?.workaround).toContain("idempotent");

    const page = measuredRow("Dock reflow");
    expect(
      page,
      "the page's measured table has no dock-reflow row",
    ).toBeDefined();
    expect(page?.[1]).toContain("dock-reflow");
    expect(page?.[1]).toContain("w=340");
    expect(page?.[1]).toContain("w=240");
    expect(page?.[2]).toContain("idempotent");
  });

  it("records the frozen column a table composes from two scrollers", () => {
    // The runtime paints no sticky, so a pinned column is not a provided
    // capability — but `data-grid-frozen-column` measured the composition that
    // works: two scrollers mirrored in both directions, clamped together, with
    // the horizontal pan on the data pane alone. A table plan reading only the
    // sticky row would not know the mirror exists or that the echo needs a ref.
    const frozen = rowFor("Frozen column");
    expect(frozen?.verdict).toBe("supported, with limits");
    expect(frozen?.evidence).toContain("data-grid-frozen-column");
    expect(frozen?.evidence).toContain("onScrollChange");
    expect(frozen?.evidence).toContain("-1440");
    expect(frozen?.workaround).toContain("ref");

    const page = measuredRow("Frozen column");
    expect(
      page,
      "the page's measured table has no frozen-column row",
    ).toBeDefined();
    expect(page?.[1]).toContain("data-grid-frozen-column");
    expect(page?.[1]).toContain("onScrollChange");
    expect(page?.[2]).toContain("ref");
  });

  it("records the floating placement a window measured, including the centre quirk", () => {
    // The headless `floating-placement` scenario drove the engine against a
    // `TestRenderer`; a window measured the horizontal sides and found that
    // `align="center"` ends the panel at the anchor's centre line rather than
    // centring it — the quirk every overlay component compensates for. A plan
    // building its own anchored surface would otherwise hit it unpinned.
    const floating = rowFor("Floating layer placement");
    expect(floating?.verdict).toBe("supported, with limits");
    expect(floating?.evidence).toContain("floating-sides");
    expect(floating?.evidence).toContain('align="center"');
    expect(floating?.workaround).toContain('align="start"');

    const page = measuredRow("Floating layer");
    expect(
      page,
      "the page's measured table has no floating-layer row",
    ).toBeDefined();
    expect(page?.[1]).toContain("floating-sides");
    expect(page?.[1]).toContain("centre line");
    expect(page?.[2]).toContain('align="start"');
  });

  it("records the Select reveal gap a window and a runtime suite measured", () => {
    // `Select` is named in §2 as provided, so the record read as "a Select is
    // just a wrapper". A window measured the overlay half (`select-lifecycle`)
    // and the primitives' runtime suite measured the half a keyboard user
    // loses: the runtime sets no max height, its scroll-button parts are empty,
    // and an arrow never reveals the row it highlights.
    const select = rowFor("Select option reveal");
    expect(select?.verdict).toBe("supported, with limits");
    expect(select?.evidence).toContain("select-lifecycle");
    expect(select?.evidence).toContain("320px");
    expect(select?.evidence).toContain("ArrowDown");
    expect(select?.workaround).toContain("Combobox");

    const page = measuredRow("Select option reveal");
    expect(page, "the page's measured table has no Select row").toBeDefined();
    expect(page?.[1]).toContain("select-lifecycle");
    expect(page?.[1]).toContain("320px");
    expect(page?.[2]).toContain("320px");
  });

  it("records the clipboard gap and the one place the platform still provides it", () => {
    // The binding publishes no clipboard API, so a component cannot offer
    // "copy" — but a window measured that the platform's own keys still run
    // inside a focused field. Both halves belong in the record, because the
    // second is the honest alternative the first points at.
    const appLevel = rowFor("App-level clipboard");
    expect(appLevel?.verdict).toBe("not supported");
    expect(appLevel?.evidence).toContain("clipboard-lifecycle");
    expect(appLevel?.evidence).toContain("window handler");
    expect(appLevel?.workaround).toContain("read-only field");

    const field = rowFor("Clipboard keys inside a focused field");
    expect(field?.verdict).toBe("supported, with limits");
    expect(field?.evidence).toContain("clipboard-lifecycle");
    expect(field?.evidence).toContain("onChange");
  });

  it("publishes the clipboard limit on /docs/runtime", () => {
    const clipboard = measuredRow("Clipboard");
    expect(
      clipboard,
      "the page's measured table has no clipboard row",
    ).toBeDefined();
    expect(clipboard?.[1]).toContain("clipboard-lifecycle");
    expect(clipboard?.[1]).toContain("onChange");
    expect(clipboard?.[2]).toContain("read-only field");
  });

  it("records the pointer selection a window measured, with the probe behind it", () => {
    // The only selection proof was synthetic: the headless `text-selection`
    // scenario drives the renderer's own `dragSelect`, so "a drag selects" had
    // never been produced by a pointer. `selection-lifecycle` measured it in a
    // window, the run `getSelectedText()` reports, and the geometry a
    // selectable line owes the hit test.
    const selection = rowFor("Text selection");
    expect(selection?.verdict).toBe("supported");
    expect(selection?.evidence).toContain("selection-lifecycle");
    expect(selection?.evidence).toContain("getSelectedText");
    expect(selection?.evidence).toContain("text-selection");
    expect(selection?.workaround).toContain("alignSelf");
    expect(selection?.workaround).toContain("initiated");
  });

  it("publishes the measured pointer selection on /docs/runtime", () => {
    const selection = measuredRow("Text selection");
    expect(
      selection,
      "the page's measured table has no text-selection row",
    ).toBeDefined();
    expect(selection?.[1]).toContain("selection-lifecycle");
    expect(selection?.[1]).toContain("getSelectedText");
    expect(selection?.[2]).toContain("alignSelf");
  });

  it("records the accessibility tree a test renderer reported", () => {
    // The record's aria row says which attributes are accepted, and nothing said
    // what they become — or that a node without a role is not in the tree at
    // all. The tooltip's "reaches a screen reader as `aria-description`" and the
    // inventory's announced-state rows rested on a tree no one had read.
    // `a11y-tree` read it: the role arrives as the platform's own name, the seven
    // attributes land on their fields, and a roleless div is absent.
    const tree = rowFor("Accessibility tree");
    expect(tree?.verdict).toBe("supported, with limits");
    expect(tree?.evidence).toContain("a11y-tree");
    expect(tree?.evidence).toContain("ListBoxOption");
    expect(tree?.evidence).toContain("author_id");
    expect(tree?.evidence).toContain('role="none"');
    expect(tree?.evidence).toContain("TestRenderer");
    expect(tree?.workaround).toContain("role");
  });

  it("publishes the accessibility tree offscreen on /docs/runtime", () => {
    // The tree is a `TestRenderer` fact, so it is listed apart from the window
    // measurements rather than inside a section that promises paints.
    expect(runtimePage).toContain("## Measured offscreen");

    const tree = offscreenRow("Accessibility tree");
    expect(
      tree,
      "the page's offscreen table has no accessibility row",
    ).toBeDefined();
    expect(tree?.[1]).toContain("a11y-tree");
    expect(tree?.[1]).toContain("ListBoxOption");
    expect(tree?.[1]).toContain('role="none"');
    expect(tree?.[2]).toContain("aria-valuetext");
  });

  it("cites only registered probes, and owes every one of them in the record", () => {
    // A row's citation is the only evidence path a reader has, so an id that no
    // playground registry declares would point at a probe that does not exist,
    // and a page probe missing from §5 is one the record never owed. It caught a
    // pre-existing omission the accessibility row would otherwise have hidden:
    // the virtual-list row cited `virtual-list-lifecycle` while §5 owed it no
    // line. Directions measured: dropping `a11y-tree` from §5 fails naming it,
    // and a mistyped page citation (`a11y-tre`) fails the registry case.
    const cited = citedProbes();
    expect(cited.length).toBeGreaterThanOrEqual(15);

    const registered = registeredProbes();
    expect(registered.size).toBeGreaterThanOrEqual(40);
    const unknown = cited.filter((id) => !registered.has(id));
    expect(
      unknown,
      "the page cites a probe no playground registry declares",
    ).toEqual([]);

    const keeping = doc.slice(doc.indexOf("## 5. Keeping this document true"));
    expect(keeping).not.toBe("");
    const unowed = cited.filter((id) => !keeping.includes(id));
    expect(unowed, "the record's §5 owes no line for these probes").toEqual([]);
  });

  it("names a registered probe in every evidence cell of the record", () => {
    // §3's evidence is the record's only pointer to the measurement behind a
    // verdict, and a plan reads §3 rather than the page. The page's citations
    // were held to the registry above; the document's own were not, so a typo
    // here sent a plan to a probe that does not exist and no test noticed.
    // A kebab-case token is a probe id unless it is one of the values a row
    // quotes as its measurement, and `aria-*` is the attribute set the rows
    // discuss rather than a probe name.
    const quotedValues = new Map([
      ["ellipsis-start", "a `textOverflow` value the truncation row quotes"],
      ["cmd-k", "a key chord the clipboard probe pressed"],
      ["wrow-60", "a row marker the windowed list probe checked for"],
    ]);

    const evidenceTokens = rows.flatMap((row) =>
      [...row.evidence.matchAll(/`([^`]+)`/g)]
        .map((match) => match[1] ?? "")
        .filter((token) => /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/.test(token))
        .filter((token) => !token.startsWith("aria-"))
        .map((token) => ({ label: row.label, token })),
    );
    const registered = registeredProbes();

    // A scan that stopped matching would pass the case below without reading.
    expect(
      evidenceTokens.filter(({ token }) => registered.has(token)).length,
    ).toBeGreaterThanOrEqual(25);

    const unknown = evidenceTokens
      .filter(({ token }) => !registered.has(token))
      .filter(({ token }) => !quotedValues.has(token))
      .map(
        ({ label, token }) =>
          `"${label}" cites \`${token}\`, which no playground registry declares`,
      );
    expect(unknown).toEqual([]);

    const stale = [...quotedValues].filter(
      ([token]) => !evidenceTokens.some((entry) => entry.token === token),
    );
    expect(
      stale.map(([token]) => `${token} is not quoted — drop the exception`),
    ).toEqual([]);
  });

  it("records the typings gaps a component composes around", () => {
    // `COMPONENTS.md`'s rows relied on five absences the record never named, so
    // a plan reading only the record could pass `href`, `fieldset`, `onPaste`
    // or `onContextMenu` and see nothing happen — and could promise an
    // announced toast on a runtime with no live region.
    const links = rowFor("Links and anchors");
    expect(links?.verdict).toBe("not supported");
    expect(links?.evidence).toContain("ElementType");
    expect(links?.evidence).toContain("HostProps");
    expect(links?.workaround).toContain("pressable");

    const grouping = rowFor("Form grouping");
    expect(grouping?.verdict).toBe("not supported");
    expect(grouping?.evidence).toContain("fieldset");

    const contextMenu = rowFor("Context menu event");
    expect(contextMenu?.verdict).toBe("supported, with limits");
    expect(contextMenu?.evidence).toContain("onAuxClick");
    expect(contextMenu?.evidence).toContain("context-menu-lifecycle");

    const paste = rowFor("Paste event");
    expect(paste?.verdict).toBe("not supported");
    expect(paste?.evidence).toContain("onChange");

    const aria = rowFor("the `aria-*` subset");
    expect(aria?.verdict).toBe("supported, with limits");
    expect(aria?.evidence).toContain("aria-valuetext");
    // Every attribute the inventory's pages call absent must be named here, so a
    // component page and the record cannot disagree about what can be announced.
    const unnamed = [
      "aria-checked",
      "aria-pressed",
      "aria-haspopup",
      "aria-current",
      "aria-disabled",
      "aria-labelledby",
      "aria-live",
    ].filter((attribute) => !(aria?.evidence ?? "").includes(attribute));
    expect(unnamed, "the aria row does not name these absences").toEqual([]);
  });

  it("publishes the typings gaps on /docs/runtime", () => {
    // The durable record is what a plan cites; the page is what a reader of the
    // docs cites. A link that looks like an anchor is the same lie as a chart
    // that looks like canvas drawing.
    const links = typingsRow("Links");
    expect(links, "the page has no links row").toBeDefined();
    expect(links?.[1]).toContain("no `href`");
    expect(links?.[2]).toContain("pressable");

    const grouping = typingsRow("Form grouping");
    expect(grouping, "the page has no form-grouping row").toBeDefined();
    expect(grouping?.[1]).toContain("fieldset");

    const contextMenu = typingsRow("Context-menu event");
    expect(contextMenu, "the page has no context-menu row").toBeDefined();
    expect(contextMenu?.[1]).toContain("onAuxClick");
    expect(contextMenu?.[1]).toContain("context-menu-lifecycle");

    const paste = typingsRow("Paste event");
    expect(paste, "the page has no paste row").toBeDefined();
    expect(paste?.[2]).toContain("onChange");

    const accessibility = typingsRow("Accessibility attributes");
    expect(
      accessibility,
      "the page has no accessibility-attribute row",
    ).toBeDefined();
    expect(accessibility?.[1]).toContain("aria-live");
    expect(accessibility?.[2]).toContain("aria-valuetext");
  });

  it("records the file-drop probe that retired the unverified row", () => {
    // The row said no probe mounts a drop, so a plan was told to route a file
    // through `promptForPaths` only. The headless `file-drop` scenario dispatches
    // the renderer's own FileDrop pair, so the payload and the target region are
    // measured even though a live Finder drop is not automatable.
    const drops = rowFor("File drops");
    expect(drops?.verdict).toBe("supported, with limits");
    expect(drops?.evidence).toContain("file-drop");
    expect(drops?.evidence).toContain("/tmp/alpha.txt");
    expect(drops?.evidence).toContain("sibling");
    expect(drops?.workaround).toContain("promptForPaths");
  });

  it("leaves the uncertain rows uncertain", () => {
    // Exactly the rows no probe has measured stay unverified; promoting one
    // without evidence would be the confident lie this record exists to prevent.
    const unverified = rows
      .filter((row) => row.verdict === "unverified")
      .map((row) => row.label);
    expect(unverified).toHaveLength(2);
    expect(unverified.join(" ")).toContain("Window backdrop");
    expect(unverified.join(" ")).toContain("Reduced-motion");
  });

  it("records the cross-pane drag the runtime's event protocol shapes", () => {
    // A drag-and-drop component (and a detachable tab) asks whether a drag can
    // cross two panes. `drag-between-panes` measured that it can — but the whole
    // gesture arrives before React commits the render the press scheduled, so the
    // obvious `dragging` state gate never fires, and the item that listens to
    // `onMouseDown` alone captures nothing. Both facts decide the implementation,
    // and neither is in the typings.
    const drag = rowFor("Cross-pane drag");
    expect(drag?.verdict).toBe("supported, with limits");
    expect(drag?.evidence).toContain("drag-between-panes");
    expect(drag?.evidence).toContain("drops=1");
    expect(drag?.evidence).toContain("pointer-capture");
    expect(drag?.workaround).toContain("ref");
    expect(drag?.workaround).toContain("onMouseMove");

    const page = measuredRow("Cross-pane drag");
    expect(
      page,
      "the page's measured table has no cross-pane-drag row",
    ).toBeDefined();
    expect(page?.[1]).toContain("drag-between-panes");
    expect(page?.[1]).toContain("state");
    expect(page?.[2]).toContain("ref");
  });

  it("records the keyboard focus dim and the field it never dims", () => {
    // The dim is a paint mechanism every component shares, and the catalogue's
    // "every other focusable dims" claim quietly assumed it applies while a
    // field is focused. `filled-action-dim` measured the opposite: a focused
    // `input`/`textarea` casts no dim, so a filled action beside a form needs no
    // opt-out — while a ghost's label does disappear, and a faded filled label
    // can measure 1.27:1. A page or a plan reading only the token would get both
    // wrong.
    const dim = rowFor("Keyboard focus dim");
    expect(dim?.verdict).toBe("supported, with limits");
    expect(dim?.evidence).toContain("keyboard-focus-dim");
    expect(dim?.evidence).toContain("filled-action-dim");
    expect(dim?.evidence).toContain("input");
    expect(dim?.evidence).toContain("1.27:1");
    expect(dim?.workaround).toContain("keyboardFocusDim: false");

    const page = measuredRow("Keyboard focus dim");
    expect(
      page,
      "the page's measured table has no keyboard-focus-dim row",
    ).toBeDefined();
    expect(page?.[1]).toContain("keyboard-focus-dim");
    expect(page?.[1]).toContain("filled-action-dim");
    expect(page?.[1]).toContain("input");
    expect(page?.[2]).toContain("keyboardFocusDim: false");
  });

  it("records the geometry `motion` animates and the content it clips", () => {
    // Two inventory rows rest on this — Tier 3's expandable rows and Tier 4's
    // collapsible sidebars — and neither had a window measurement, because a
    // `TestRenderer` frame is not a run. `motion-geometry` measured the tween
    // (intermediate heights, an exact landing, one completion per run) and the
    // fact a plan would otherwise get wrong: the animated box clips its child
    // rather than re-laying it out, so the sidebar animates an outer box and the
    // panel inside stands still.
    const motion = rowFor("Animated geometry and content clipping");
    expect(motion?.verdict).toBe("supported, with limits");
    expect(motion?.evidence).toContain("motion-geometry");
    expect(motion?.evidence).toContain("40, 43, 117, 123, 221, 240");
    expect(motion?.evidence).toContain("onMotionComplete");
    expect(motion?.evidence).toContain("320×200");
    expect(motion?.workaround).toContain("overflow");
    expect(motion?.workaround).toContain("outer");

    const page = measuredRow("Animated geometry");
    expect(
      page,
      "the page's measured table has no animated-geometry row",
    ).toBeDefined();
    expect(page?.[1]).toContain("motion-geometry");
    expect(page?.[1]).toContain("clips");
    expect(page?.[2]).toContain("overflow");
  });

  it("records the scroller a table, a tab rail or a tree drag sits in", () => {
    // Three measurements a data or workspace plan needs and the record never
    // published: a horizontal scroller works and moves one axis; the runtime
    // never reveals a selection, and the reveal call only reaches a direct
    // child of the scroller; and nothing auto-scrolls a pane at a drag's edge.
    // Each has a limitation that changes the layout or the handler a component
    // ships, so the record has to carry it rather than the playground alone.
    const horizontal = rowFor("Horizontal scrollers");
    expect(horizontal?.verdict).toBe("supported");
    expect(horizontal?.evidence).toContain("scroll-horizontal");
    expect(horizontal?.evidence).toContain("overflowX");
    expect(horizontal?.evidence).toContain("-1120");

    const reveal = rowFor("Reveal a selection");
    expect(reveal?.verdict).toBe("supported, with limits");
    expect(reveal?.evidence).toContain("tab-overflow");
    expect(reveal?.evidence).toContain("scrollIntoView");
    expect(reveal?.evidence).toContain("direct child");
    expect(reveal?.workaround).toContain("direct children");

    const drag = rowFor("Drag auto-scroll");
    expect(drag?.verdict).toBe("supported, with limits");
    expect(drag?.evidence).toContain("drag-autoscroll");
    expect(drag?.evidence).toContain("-128");
    expect(drag?.evidence).toContain("scrollTo");
    expect(drag?.workaround).toContain("ref");

    const pageRows = [
      [measuredRow("Horizontal scrollers"), "scroll-horizontal"],
      [measuredRow("Revealing a selection"), "tab-overflow"],
      [measuredRow("Drag auto-scroll"), "drag-autoscroll"],
    ] as const;
    const missing = pageRows
      .filter(([row]) => row === undefined)
      .map(([, probe]) => `the page's measured table has no ${probe} row`);
    expect(missing).toEqual([]);
    const uncited = pageRows.flatMap(([row, probe]) =>
      (row?.[1] ?? "").includes(probe) ? [] : [`${probe} is not cited`],
    );
    expect(uncited).toEqual([]);
  });

  it("records the app-level key path a command palette needs", () => {
    // `render({ onKeyDown })` is the only window-level key route, and a palette
    // or an application menu lives on it. The record named the absence of a
    // global shortcut but not the path that exists, and nothing had measured it
    // with the focus elsewhere — the case that separates a window handler from an
    // element one.
    const windowKey = rowFor("Window-level key events");
    expect(windowKey?.verdict).toBe("supported, with limits");
    expect(windowKey?.evidence).toContain("window-key-shortcut");
    expect(windowKey?.evidence).toContain("window-shortcut-lifecycle");
    expect(windowKey?.evidence).toContain("getFocusedElementId");
    expect(windowKey?.evidence).toContain("onKeyDown");
    expect(windowKey?.workaround).toContain("root");

    const page = measuredRow("Window-level key events");
    expect(
      page,
      "the page's measured table has no window-key row",
    ).toBeDefined();
    expect(page?.[1]).toContain("window-shortcut-lifecycle");
    expect(page?.[1]).toContain("window-key-shortcut");
    expect(page?.[2]).toContain("root");
  });

  it("publishes the measured gaps on /docs/runtime", () => {
    expect(runtimePage).toContain("data-grid-fixed-header");
    expect(runtimePage).toContain("editor-surface");
    expect(runtimePage).toContain("tooltip-lifecycle");
    expect(runtimePage).toContain("tabs-lifecycle");
    expect(runtimePage).toContain("scroll-lifecycle");
    expect(runtimePage).toContain("pointer-capture");
    expect(runtimePage).toContain("content-surfaces");
    expect(runtimePage).toContain("selection-lifecycle");
    expect(runtimePage).toContain("clipboard-lifecycle");
    expect(runtimePage).toContain("virtual-tree-lifecycle");
    expect(runtimePage).toContain("virtual-list-windowed");
    expect(runtimePage).toContain("virtual-list-rows");
    expect(runtimePage).toContain("data-grid-frozen-column");
    expect(runtimePage).toContain("select-lifecycle");
    expect(runtimePage).toContain("floating-sides");
    expect(runtimePage).toContain("portal-layer");
    expect(runtimePage).toContain("a11y-tree");
    expect(runtimePage).toContain("motion-geometry");
    expect(runtimePage).toContain("scroll-horizontal");
    expect(runtimePage).toContain("tab-overflow");
    expect(runtimePage).toContain("drag-autoscroll");
    expect(runtimePage).toContain("window-shortcut-lifecycle");
    expect(runtimePage).toContain("docs/gpuix-capabilities.md");
    expect(runtimePage).toContain("outside");
  });

  it("publishes which scroll listener carries which number", () => {
    // The doc row is the durable record; the page is what a component author
    // reads before wiring a scrollbar. Naming the two listeners is not enough
    // — the page has to say which one is the absolute, clamped position.
    const scroll = measuredRow("Scroll event");
    expect(
      scroll,
      "the page's measured table has no scroll-event row",
    ).toBeDefined();
    expect(scroll?.[1]).toContain("onScrollChange");
    expect(scroll?.[1]).toContain("getScrollOffset");
    expect(scroll?.[1]).toContain("clamped");
    expect(scroll?.[2]).toContain("onScrollChange");
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
