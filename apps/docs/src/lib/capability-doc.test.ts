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
    expect(
      portal,
      "the page's measured table has no portal row",
    ).toBeDefined();
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

  it("publishes the measured gaps on /docs/runtime", () => {
    expect(runtimePage).toContain("## Measured in a window");
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
    expect(runtimePage).toContain("portal-layer");
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
