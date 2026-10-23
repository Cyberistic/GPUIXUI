import { readFileSync } from "node:fs";
import { getTheme, platformTheme, themes } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { columnDrag } from "./column-drag.test-util";

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

/**
 * The composite-row press table `press-routing-lifecycle` holds a window to.
 *
 * `PRESS_CASES` is the fixture's expectation and `formatHits` is its one route
 * spelling, so the record and the page are read against that table rather than
 * a transcription of it. Parsed from source because the fixture belongs to the
 * playground app and this suite reads cross-app evidence as text.
 */
interface PressCase {
  readonly id: string;
  readonly route: string;
}

const pressRoute = (hits: ReadonlyArray<string>): string =>
  hits.length === 0 ? "hits=none" : `hits=${hits.join(",")}`;

/** Quotes normalised to `~`: the repo's test scanner misreads a quote in a regex. */
const pressSource = read(
  "apps/playground/src/live/press-routing.ts",
).replaceAll('"', "~");

const pressCases: ReadonlyArray<PressCase> = Array.from(
  pressSource.matchAll(
    /^ {2}~([a-z-]+)~: \{\n {4}id: ~[a-z-]+~,\n {4}caption: ~[^~]+~,\n {4}hits: \[([^\]]*)\],$/gm,
  ),
).map((match) => ({
  id: match[1] ?? "",
  route: pressRoute(
    (match[2] ?? "")
      .split(",")
      .map((hit) => hit.trim().replaceAll("~", ""))
      .filter((hit) => hit !== ""),
  ),
}));

/**
 * The composite-row hover table `hover-routing-lifecycle` holds a window to.
 *
 * `HOVER_CASES` is the fixture's expectation on the same four child shapes the
 * press probe mounts, read from the same file shape, so neither the record nor
 * the page can print a reading the window did not take.
 */
interface HoverCase {
  readonly id: string;
  readonly rowEnter: boolean;
  readonly childEnter: boolean;
  readonly painted: boolean;
}

/** The record's spelling of one hover case. */
const hoverSpelling = (entry: HoverCase): string =>
  `row-enter=${entry.rowEnter ? 1 : 0} child-enter=${
    entry.childEnter ? 1 : 0
  } paint=${entry.painted ? "yes" : "no"}`;

const hoverSource = read(
  "apps/playground/src/live/hover-routing.ts",
).replaceAll('"', "~");

const hoverCases: ReadonlyArray<HoverCase> = Array.from(
  hoverSource.matchAll(/^ {2}~([a-z-]+)~: \{\n([\s\S]*?)\n {2}\},/gm),
).map((match) => {
  const measured = match[2] ?? "";
  return {
    id: match[1] ?? "",
    rowEnter: measured.includes("\n    rowEnter: true,"),
    childEnter: measured.includes("\n    childEnter: true,"),
    painted: measured.includes("\n    painted: true,"),
  };
});

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

  it("records the editable overlay a window measured as not composable", () => {
    // `editor-surface` records what a read-only view cannot do. `editor-overlay`
    // measured the other half: a transparent field over a `<code>` view paints
    // the code through it, so the composition looks like an editor — and the two
    // things that make one (a caret and an offset) are missing. A plan that read
    // only "edit in a field, display in code" could still build the overlay.
    const overlay = rowFor("Editable highlighted overlay");
    expect(overlay?.verdict).toBe("not supported");
    expect(overlay?.evidence).toContain("editor-overlay");
    expect(overlay?.evidence).toContain("14 028");
    expect(overlay?.evidence).toContain("no caret");
    expect(overlay?.evidence).toContain("no scroll offset");
    expect(overlay?.workaround).toContain("<textarea>");
    expect(overlay?.workaround).toContain("<code>");

    const probe = read("apps/playground/src/live/scenarios.tsx");
    const asserted = [
      "a transparent field paints nothing over the code beneath it",
      "a focused field paints no caret in any of five frames",
      "the field reports no scroll offset of its own",
    ];
    expect(
      asserted.filter((line) => !probe.includes(line)),
      "the record quotes a check the probe no longer asserts",
    ).toEqual([]);

    const page = measuredRow("Editable code overlay");
    expect(
      page,
      "the page's measured table has no editable-overlay row",
    ).toBeDefined();
    expect(page?.[1]).toContain("editor-overlay");
    expect(page?.[1]).toContain("no caret");
    expect(page?.[2]).toContain("<textarea>");
  });

  it("records the property inspector a window composed, with its readouts", () => {
    // Tier 3's property panels, key-value displays and statistic cards and
    // Tier 4's inspector panels are composition, and the record read as
    // "composition, so nothing to say" — a plan had no measured rule for a pane
    // that scrolls beside what it edits. The numbers are the probe's, so they
    // are read back out of it.
    const inspector = rowFor("Property inspector");
    expect(inspector?.verdict).toBe("supported, with limits");
    expect(inspector?.evidence).toContain("inspector-lifecycle");
    expect(inspector?.evidence).toContain("6px");
    expect(inspector?.evidence).toContain("−200");
    expect(inspector?.workaround).toContain("owns its `overflow`");
    expect(inspector?.workaround).toContain("no reconciliation step");

    // The printed sizes and totals are derived from the fixture, so a changed
    // object cannot leave the record quoting the previous one.
    const probe = read("apps/playground/src/live/inspector.ts");
    const width = Number(/width: (\d+),/.exec(probe)?.[1]);
    const height = Number(/height: (\d+),/.exec(probe)?.[1]);
    const wide = Number(/WIDE_WIDTH = (\d+)/.exec(probe)?.[1]);
    expect(Number.isFinite(width * height * wide)).toBe(true);
    expect(inspector?.evidence).toContain(`${width}×${height}`);
    expect(inspector?.evidence).toContain(`${wide}×${height}`);
    expect(inspector?.evidence).toContain(String(width * height));
    expect(inspector?.evidence).toContain(String(wide * height));

    const readme = read("apps/playground/README.md");
    expect(readme).toContain("`inspector-lifecycle`");

    const page = measuredRow("Property inspector");
    expect(
      page,
      "the page's measured table has no property-inspector row",
    ).toBeDefined();
    expect(page?.[1]).toContain("inspector-lifecycle");
    expect(page?.[1]).toContain(`${width}×${height}`);
    expect(page?.[1]).toContain(String(width * height));
    expect(page?.[1]).toContain(String(wide * height));
    expect(page?.[2]).toContain("owns its `overflow`");
  });

  it("records the focus a `Tab` traversal does not deliver, with the probes behind it", () => {
    // This row has flipped twice. It first said `onFocus` never ran on a
    // traversal; a re-run then read `focuses=1` and it was corrected to "the
    // handler runs"; three clean window runs on 2026-10-22 with the probes
    // asserting the counter read `focuses=0` again, so the authoritative
    // reading is the window's: a traversal moves the focus and runs no
    // `onFocus`. The offscreen `TestRenderer` does dispatch it, which is why
    // the softer claim kept coming back. Keeping either retracted sentence —
    // "never runs" as a host rule, or "does run" as a promise — fails here.
    const events = rowFor("Pointer, keyboard and focus events");
    expect(events?.verdict).toBe("supported, with limits");
    expect(events?.evidence).toContain("tooltip-lifecycle");
    expect(events?.evidence).toContain("tabs-lifecycle");
    expect(events?.evidence).toContain("without running React's `onFocus`");
    expect(events?.evidence).toContain("focuses=0");
    expect(events?.evidence).toContain("only a window is authoritative");
    expect(events?.workaround).toContain("at **rest**");
    expect(doc).not.toContain("focuses=1");
    expect(doc).not.toContain("does** run React's `onFocus`");

    const page = measuredRow("Keyboard focus events");
    expect(
      page,
      "the page's measured table has no keyboard-focus-event row",
    ).toBeDefined();
    expect(page?.[1]).toContain("without running React's `onFocus`");
    expect(page?.[1]).toContain("tabs-lifecycle");
    expect(page?.[1]).toContain("focuses=0");
    expect(page?.[2]).toContain("at **rest**");

    // The probes are the evidence, so the sentences the record rests on have to
    // be the ones the window asserts.
    const probe = read("apps/playground/src/live/scenarios.tsx");
    expect(probe).toContain('"focuses=0"');
    const readme = read("apps/playground/README.md");
    expect(readme).toContain("without running React's `onFocus`");
    expect(readme).toContain("focuses=0");

    // …and every other surface that describes the traversal agrees with it.
    const keyboard = read("apps/docs/content/docs/keyboard.mdx");
    expect(keyboard).toContain("A `Tab` traversal runs no `onFocus`");
    expect(keyboard).not.toContain("traversal runs React's `onFocus`");
    const a11y = read("apps/docs/content/docs/accessibility.mdx");
    expect(a11y).toContain("runs **no** `onFocus`");
    expect(a11y).not.toContain("focus-only surface may open");
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

  it("records the chart surface a probe painted, with its two routes", () => {
    // `Canvas drawing` says "render svg" and `Inline SVG painting` says one tint
    // per element, which together read as "a plot is drawable but for a stack of
    // masks". `chart-raster` measured the two routes a multi-colour plot actually
    // has — a pixel buffer that keeps each pixel's own colour and SVG bytes that
    // keep their `fill`s.
    const chart = rowFor("Raster and vector chart surfaces");
    expect(chart?.verdict).toBe("supported");
    expect(chart?.evidence).toContain("chart-raster");
    expect(chart?.evidence).toContain("setImagePixels");
    expect(chart?.evidence).toContain("setImage");
    expect(chart?.workaround).toContain("layout effect");
    expect(chart?.workaround).toContain("<text>");
  });

  it("records the translucent mark and the resize a chart probe measured", () => {
    // The row ended on two limits — a translucent bar over another bar was
    // unmeasured, and the element scales its buffer to its box. `chart-raster`
    // now measures both: the buffer's alpha is straight, so a half-alpha mark
    // composites onto the mark below it and onto the card, and a resize
    // re-scales the buffer with no second `setImagePixels`. A reader planning a
    // stacked series or a chart in a splitter needs the numbers, not the
    // retired limits.
    const chart = rowFor("Raster and vector chart surfaces");
    expect(chart?.evidence).toContain("33 checks");
    expect(chart?.evidence).toContain("straight alpha");
    expect(chart?.evidence).toContain("rgba(132, 96, 152, 255)");
    expect(chart?.evidence).toContain("rgba(15, 83, 157, 255)");
    expect(chart?.evidence).toContain("rgba(130, 63, 88, 255)");
    expect(chart?.evidence).toContain("1.5×");
    expect(chart?.evidence).not.toContain("unmeasured");
    expect(chart?.evidence).not.toContain("19 checks");

    // The numbers are the fixture's, not a transcription: the alpha share, the
    // three operands and the prediction all live in `chart.ts`, and the two
    // assertions the probe reads its frame with name the same facts.
    const fixture = read("apps/playground/src/live/chart.ts");
    expect(fixture).toContain("ALPHA_SHARE = 0x80");
    expect(fixture).toContain("ALPHA_OVER = rgb(0x0a, 0x84, 0xff)");
    expect(fixture).toContain("ALPHA_BASE = rgb(0xff, 0x3b, 0x30)");
    expect(fixture).toContain("compositeOver");
    const steps = read("apps/playground/src/live/scenarios.tsx");
    expect(steps).toContain(
      "a half-alpha mark over another mark composites onto it",
    );
    expect(steps).toContain(
      "the buffer scales with the box, so the bar grows by the same share",
    );
    expect(steps).toContain('"chart-resize"');

    // The page carries the same rule, because a table plan reads the site
    // before it reads the record.
    const page = measuredRow("Chart surfaces");
    expect(page?.[1]).toContain("0x80");
    expect(page?.[1]).toContain("rgba(132, 96, 152, 255)");
    expect(page?.[1]).toContain("1.5×");
    expect(page?.[2]).toContain("straight alpha");
    expect(page?.[1]).not.toContain("unmeasured");
  });

  it("publishes the chart surface on /docs/runtime", () => {
    const chart = measuredRow("Chart surfaces");
    expect(
      chart,
      "the page's measured table has no chart-surface row",
    ).toBeDefined();
    expect(chart?.[1]).toContain("chart-raster");
    expect(chart?.[1]).toContain("setImagePixels");
    expect(chart?.[2]).toContain("layout effect");
    expect(chart?.[2]).toContain("<text>");
  });

  it("records where a generated svg path paints, and the box it needs", () => {
    // The one-tint row says `<svg source>` paints; it says nothing about where
    // the path lands in the element that shows it, which is the question a
    // generated pattern field (`hexagon`, `topography`) rests on. `svg-pattern`
    // measured the placement: a view box is scaled by the element's width alone,
    // clipped at its own edge, centred rather than fitted, and re-laid-out on a
    // resize — and a non-square element shows a content area it does not clip.
    // The numbers below are derived from the probe's own geometry, so a fixture
    // edit cannot leave the record teaching the previous frame.
    const pattern = read("apps/playground/src/live/pattern.ts");
    // A form that stops matching reads as `NaN`, which the floors below name.
    const number = (source: string, form: RegExp): number =>
      Number(form.exec(source)?.[1] ?? Number.NaN);

    const tile = number(pattern, /export const TILE = (\d+)/);
    const inset = number(
      pattern,
      /export const SQUARE = \{ inset: (\d+), stroke: (\d+) \}/,
    );
    const stroke = number(
      pattern,
      /export const SQUARE = \{ inset: \d+, stroke: (\d+) \}/,
    );
    const squareWidth = number(
      pattern,
      /export const SQUARE_BOX = \{ width: (\d+), height: (\d+) \}/,
    );
    const resizedWidth = number(
      pattern,
      /export const SQUARE_RESIZED_BOX = \{ width: (\d+), height: (\d+) \}/,
    );
    const wide =
      /export const WIDE = \{ width: (\d+), height: (\d+), stroke: (\d+) \}/.exec(
        pattern,
      );
    const tall =
      /export const TALL = \{ width: (\d+), height: (\d+), stroke: (\d+) \}/.exec(
        pattern,
      );
    const strokes = number(pattern, /export const COMB = \{\s*strokes: (\d+)/);

    // The width-only rule, read from the function that states it.
    expect(pattern).toContain("export const patternScale = (width: number)");
    expect(pattern).toContain("width / TILE");

    const inkFraction = (tile - 2 * inset + stroke) / tile;
    const squareInk = Math.round(inkFraction * squareWidth);
    const resizedInk = Math.round(inkFraction * resizedWidth);
    const wideWidth = Number(wide?.[1] ?? Number.NaN);
    const wideStroke = Number(wide?.[3] ?? Number.NaN);
    const tallWidth = Number(tall?.[1] ?? Number.NaN);
    const tallStroke = Number(tall?.[3] ?? Number.NaN);
    const wideThickness = Math.round((wideStroke * wideWidth) / tile);
    const tallThickness = Math.round((tallStroke * tallWidth) / tile);

    // Floors: the arithmetic read the fixture, so an empty match cannot pass.
    expect([tile, squareWidth, wideWidth, tallWidth, strokes]).toEqual([
      100, 200, 300, 100, 20,
    ]);
    expect([squareInk, resizedInk, wideThickness, tallThickness]).toEqual([
      140, 210, 30, 10,
    ]);

    const readme = read("apps/playground/README.md");
    const section = readme.slice(readme.indexOf("### `svg-pattern`"));
    const checks = number(section, /(\d+) checks, `--only svg-pattern`/);
    expect(checks).toBeGreaterThan(0);

    const svg = rowFor("Inline SVG painting");
    expect(svg?.verdict).toBe("supported, with limits");
    expect(svg?.evidence).toContain("svg-pattern");
    expect(svg?.evidence).toContain(`${checks} checks`);
    expect(svg?.evidence).toContain("width alone");
    expect(svg?.evidence).toContain(`${squareInk}×${squareInk}`);
    expect(svg?.evidence).toContain(`${wideWidth}×${wideThickness}`);
    expect(svg?.evidence).toContain(`${tallWidth}×${tallThickness}`);
    expect(svg?.evidence).toContain("clips");
    expect(svg?.evidence).toContain(`${strokes}/${strokes}`);
    expect(svg?.evidence).toContain(`${resizedInk} wide`);
    expect(svg?.evidence).toContain("above and below");
    expect(svg?.workaround).toContain("near-square");
    expect(svg?.workaround).toContain("width");
  });

  it("publishes the generated-pattern placement on /docs/runtime", () => {
    const pattern = read("apps/playground/src/live/pattern.ts");
    const squareWidth = Number(
      /export const SQUARE_BOX = \{ width: (\d+)/.exec(pattern)?.[1],
    );
    const resizedWidth = Number(
      /export const SQUARE_RESIZED_BOX = \{ width: (\d+)/.exec(pattern)?.[1],
    );
    const tile = Number(/export const TILE = (\d+)/.exec(pattern)?.[1]);
    const inset = Number(
      /export const SQUARE = \{ inset: (\d+), stroke: \d+ \}/.exec(
        pattern,
      )?.[1],
    );
    const stroke = Number(
      /export const SQUARE = \{ inset: \d+, stroke: (\d+) \}/.exec(
        pattern,
      )?.[1],
    );
    const squareInk = Math.round(
      ((tile - 2 * inset + stroke) / tile) * squareWidth,
    );
    const resizedInk = Math.round(
      ((tile - 2 * inset + stroke) / tile) * resizedWidth,
    );

    const svg = measuredRow("Inline SVG");
    expect(
      svg,
      "the page's measured table has no inline-SVG row",
    ).toBeDefined();
    expect(svg?.[1]).toContain("svg-pattern");
    expect(svg?.[1]).toContain("width alone");
    expect(svg?.[1]).toContain(`${squareInk}×${squareInk}`);
    expect(svg?.[1]).toContain(`${resizedInk} wide`);
    expect(svg?.[1]).toContain("above and below");
    expect(svg?.[2]).toContain("near-square");
  });

  it("records the window chrome a probe painted, with its two limits", () => {
    // A Tier 4 toolbar or status bar has to know whether the runtime already
    // reserves the titlebar. Nothing said; `window-chrome` measured that it does
    // not — the app's own bar is the capture's first row — and that the reported
    // insets are empty on this host. The two limits are the ones a plan would
    // otherwise assume away: a capture cannot prove the OS titlebar is hidden,
    // and an IME inset cannot be started from the automation protocol.
    const chrome = rowFor("Window chrome and insets");
    expect(chrome?.verdict).toBe("supported, with limits");
    expect(chrome?.evidence).toContain("window-chrome");
    expect(chrome?.evidence).toContain("first row");
    expect(chrome?.evidence).toContain("not app-visible");
    expect(chrome?.evidence).toContain("IME inset is unmeasurable");
    expect(chrome?.workaround).toContain("trafficLightX");
  });

  it("publishes the window chrome on /docs/runtime", () => {
    const chrome = measuredRow("Window chrome");
    expect(
      chrome,
      "the page's measured table has no window-chrome row",
    ).toBeDefined();
    expect(chrome?.[1]).toContain("window-chrome");
    expect(chrome?.[1]).toContain("first row");
    expect(chrome?.[1]).toContain("100ms");
    expect(chrome?.[2]).toContain("trafficLightX");
  });

  it("records that a process gets one window, and where a detached surface goes", () => {
    // The Tier 4 detachable-tabs and multi-pane rows are designed against the
    // window the app is given, and the only statement of the limit was buried in
    // the Portals and backdrop rows: a second `init` throws, so a "detach" is a
    // move inside the one window. A plan reading §3 for detachable tabs had no
    // row to cite and could have assumed a second OS window.
    const single = rowFor("Second OS window");
    expect(single?.verdict).toBe("not supported");
    expect(single?.evidence).toContain("window-backdrop");
    expect(single?.evidence).toContain(
      "A GPUI application already exists on this thread",
    );
    expect(single?.workaround).toContain("createPortal");

    const page = measuredRow("Second window");
    expect(
      page,
      "the page's measured table has no second-window row",
    ).toBeDefined();
    expect(page?.[1]).toContain("window-backdrop");
    expect(page?.[2]).toContain("createPortal");
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

  it("records the find-bar offset a virtualized document needs", () => {
    // A find bar over a `<virtual-list>` searches a document the runtime never
    // holds, and only the mounted rows wash. The seam is `matchIndexOffset` — a
    // match count, not a row index — and the probe measured all four wrong
    // answers a plan can reach for: the row index, an off-by-one prefix sum, a
    // negative offset and a replace that only touched the window.
    const find = rowFor("Find in a virtualized document");
    expect(find?.verdict).toBe("supported, with limits");
    expect(find?.evidence).toContain("search-virtual-document");
    expect(find?.evidence).toContain("matchIndexOffset");
    expect(find?.evidence).toContain("676");
    expect(find?.evidence).toContain("540");
    expect(find?.evidence).toContain("exactly one active");
    expect(find?.workaround).toContain("windowStart");
    expect(find?.workaround).toContain("row index");

    const page = measuredRow("Find in a virtualized document");
    expect(
      page,
      "the page's measured table has no find-offset row",
    ).toBeDefined();
    expect(page?.[1]).toContain("search-virtual-document");
    expect(page?.[1]).toContain("matchIndexOffset");
    expect(page?.[1]).toContain("676");
    expect(page?.[2]).toContain("windowStart");
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

  it("records the loading-row restore a paginated list owes", () => {
    // A paginated history paints a void row at the edge a page arrives from, and
    // `<virtual-list>` anchors on the row at the viewport top — so the void *is*
    // the anchor and the splice replaces the screen the reader was reading.
    // `loading-row-correction` measured both edges, the guard that must not
    // correct a message anchor, and the two mechanics a consumer gets wrong:
    // the scroll has to be queued after the splice, and an at-end anchor is an
    // index rather than an offset. The record said none of it.
    const loading = rowFor("Loading-row restore");
    expect(loading?.verdict).toBe("supported, with limits");
    expect(loading?.evidence).toContain("loading-row-correction");
    expect(loading?.evidence).toContain("y=80");
    expect(loading?.evidence).toContain("guarded=1");
    expect(loading?.evidence).toContain("corrected=2");
    expect(loading?.evidence).toContain("getListScrollTop");
    expect(loading?.evidence).toContain("itemIndex == row count");
    expect(loading?.workaround).toContain("flushSync");
    expect(loading?.workaround).toContain("moves the reader twice");

    const page = measuredRow("Loading-row restore");
    expect(
      page,
      "the page's measured table has no loading-row row",
    ).toBeDefined();
    expect(page?.[1]).toContain("loading-row-correction");
    expect(page?.[1]).toContain("y=80");
    expect(page?.[1]).toContain("corrected=2");
    expect(page?.[2]).toContain("flushSync");
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

  it("records the window size a workspace lays out in, and the channel that lags", () => {
    // A split's `max` is the caller's number, so a dock must pass the window's
    // width; the record named split panes and dock reflow and said nothing about
    // the window itself. `window-resize-reflow` measured that `getWindowSize()` is
    // the box the layout fills (a constant fails the arithmetic), that a zoom
    // reflows the flexible pane and runs `onLayout` again, and that the app's
    // `useWindowSize()` lags the animated zoom.
    const size = rowFor("Window size and resize reflow");
    expect(size?.verdict).toBe("supported, with limits");
    expect(size?.evidence).toContain("window-resize-reflow");
    expect(size?.evidence).toContain("900×520");
    expect(size?.evidence).toContain("1680×923");
    expect(size?.evidence).toContain("expected 1680, got 900");
    expect(size?.workaround).toContain("onLayout");

    const page = measuredRow("Window size");
    expect(
      page,
      "the page's measured table has no window-size row",
    ).toBeDefined();
    expect(page?.[1]).toContain("window-resize-reflow");
    expect(page?.[1]).toContain("getWindowSize");
    expect(page?.[1]).toContain("1680×923");
    expect(page?.[2]).toContain("onLayout");
  });

  it("records the arrangement a workspace restores", () => {
    // Tier 4's persistent panel state is app-owned — the runtime publishes no
    // storage — so the half a window can prove is the restore. `workspace-restore`
    // measured a re-mounted workspace painting its saved widths, document and
    // scroll, the default on a corrupt string, and the clamp on a stale width.
    const restore = rowFor("Workspace restore");
    expect(restore?.verdict).toBe("supported, with limits");
    expect(restore?.evidence).toContain("workspace-restore");
    expect(restore?.evidence).toContain("mount=2");
    expect(restore?.evidence).toContain("−120");
    expect(restore?.evidence).toContain("source=default");
    expect(restore?.workaround).toContain("first layout pass");

    const page = measuredRow("Workspace restore");
    expect(
      page,
      "the page's measured table has no workspace-restore row",
    ).toBeDefined();
    expect(page?.[1]).toContain("workspace-restore");
    expect(page?.[1]).toContain("mount");
    expect(page?.[2]).toContain("first layout pass");
  });

  it("records the drag reorder a captured pointer owns, and the hit test it needs", () => {
    // A row that follows the pointer is the one case where capture removes the
    // drop target: the dragged row keeps the release (`heard=0`), and a row's
    // `<text>` label is reported above the row, so a topmost-only hit test finds
    // no row. `drag-reorder` measured both and that the painted order follows the
    // move. The record had `drag-between-panes` (the other half) and no row for
    // this one.
    const reorder = rowFor("Drag reorder");
    expect(reorder?.verdict).toBe("supported, with limits");
    expect(reorder?.evidence).toContain("drag-reorder");
    expect(reorder?.evidence).toContain("heard=0");
    expect(reorder?.evidence).toContain("top=other");
    expect(reorder?.evidence).toContain("over=none misses=1");
    expect(reorder?.workaround).toContain("getElementsAt");

    const page = measuredRow("Drag reorder");
    expect(
      page,
      "the page's measured table has no drag-reorder row",
    ).toBeDefined();
    expect(page?.[1]).toContain("drag-reorder");
    expect(page?.[1]).toContain("heard=0");
    expect(page?.[1]).toContain("top=other");
    expect(page?.[2]).toContain("getElementsAt");
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
    // The window measured what the renderer's arithmetic could not: the mirror
    // lands in the same frame, because `scrollTo` paints synchronously.
    expect(frozen?.evidence).toContain("frozen-column-lifecycle");
    expect(frozen?.evidence).toContain("same frame");
    expect(frozen?.workaround).toContain("ref");

    const page = measuredRow("Frozen column");
    expect(
      page,
      "the page's measured table has no frozen-column row",
    ).toBeDefined();
    expect(page?.[1]).toContain("data-grid-frozen-column");
    expect(page?.[1]).toContain("frozen-column-lifecycle");
    expect(page?.[1]).toContain("same frame");
    expect(page?.[1]).toContain("onScrollChange");
    expect(page?.[2]).toContain("ref");
  });

  it("records the table sort and selection a window measured, and the press its centre decides", () => {
    // MISSION lists table sort/selection among the critical interactions, and
    // the record had no table row at all: a Tier 3 plan read only the headless
    // `table-select-sort` and `data-grid-fixed-header` prose, which say nothing
    // about whether a press is hit-tested, whether a pressed row takes the focus
    // a following key needs, or what a clipped sortable header does.
    const table = rowFor("Table sort and selection");
    expect(table?.verdict).toBe("supported, with limits");
    expect(table?.evidence).toContain("table-lifecycle");
    // The recorded selection is the record, and it survives a sort.
    expect(table?.evidence).toContain("selected=r4");
    expect(table?.evidence).toContain("survives the sort");
    // The header is a sibling, and the clipped centre is the measured limit.
    expect(table?.evidence).toContain("y = -36");
    expect(table?.evidence).toContain("centre");
    expect(table?.workaround).toContain("record");

    const page = measuredRow("Table sort and selection");
    expect(
      page,
      "the page's measured table has no table sort/selection row",
    ).toBeDefined();
    expect(page?.[1]).toContain("table-lifecycle");
    expect(page?.[1]).toContain("survives the sort");
    expect(page?.[1]).toContain("centre");
    expect(page?.[2]).toContain("record");
  });

  it("records the drag that resizes a column, and the press that arms it", () => {
    // Tier 3's *Resizable columns* row rested on the headless
    // `table-column-resize` scenario, where the pointer is synthesised, so a
    // data-grid plan could not know that the press is what arms the capture or
    // that the width is read at each press. Every width printed here is derived
    // from the fixture's own numbers and the deltas the probe drives.
    const { opened, dragSteps, controlMoves, drags, widths } = columnDrag;
    expect(
      drags,
      "the probe no longer drives three divider drags",
    ).toHaveLength(3);

    const row = rowFor("Resizable column drag");
    expect(row?.verdict).toBe("supported, with limits");
    expect(row?.evidence).toContain("column-resize-lifecycle");
    expect(row?.evidence).toContain("table-column-resize");
    expect(row?.evidence).toContain(`${opened} → ${widths.widened}`);
    expect(row?.evidence).toContain(`**${dragSteps} of ${dragSteps}**`);
    expect(row?.evidence).toContain(`**${widths.clamped}**`);
    expect(row?.evidence).toContain(`**${widths.measured}**`);
    expect(row?.evidence).toContain(`**${widths.stepped}**`);
    expect(row?.evidence).toContain(`**${controlMoves} of ${dragSteps}**`);
    expect(row?.workaround).toContain("onMouseDown");
    expect(row?.workaround).toContain("nextSize");
    expect(row?.workaround).toContain("each press");

    const page = measuredRow("Resizable column drag");
    expect(
      page,
      "the page's measured table has no resizable-column row",
    ).toBeDefined();
    expect(page?.[1]).toContain("column-resize-lifecycle");
    expect(page?.[1]).toContain(`${opened} → ${widths.widened}`);
    expect(page?.[1]).toContain(`**${widths.clamped}**`);
    expect(page?.[1]).toContain(`**${widths.measured}**`);
    expect(page?.[1]).toContain(`**${widths.stepped}**`);
    expect(page?.[1]).toContain(`**${controlMoves} of ${dragSteps}**`);
    expect(page?.[2]).toContain("onMouseDown");
  });

  it("records the handler a press on a row's inner element runs", () => {
    // A Tier 3 table or a Tier 4 dock puts a control inside a row that also
    // selects it, and the only rule in the repo was a comment in `carousel.tsx`
    // claiming the runtime runs the innermost handler alone. `press-routing-lifecycle`
    // measured that the boundary is a **painted fill**, not depth — so a filled
    // child runs alone, an unfilled one runs both, and `pointerEvents: "none"`
    // does not unhook a filled control. The record prints every `PRESS_CASES`
    // entry in `formatHits`'s spelling, derived from the fixture, so a route
    // cannot be documented from memory.
    const routing = rowFor("Composite-row press routing");
    expect(routing?.verdict).toBe("supported, with limits");
    expect(routing?.evidence).toContain("press-routing-lifecycle");
    expect(routing?.evidence).toContain("PRESS_CASES");
    expect(routing?.evidence).toContain("paints a background");
    expect(routing?.workaround).toContain("onAuxClick");
    expect(routing?.workaround).toContain("elementId");

    expect(pressCases.length).toBe(10);
    const printed = pressCases.map(({ id, route }) => `\`${id} → ${route}\``);
    const missing = printed.filter(
      (entry) => !routing?.evidence.includes(entry),
    );
    expect(
      missing,
      "the record prints a route the fixture does not measure",
    ).toEqual([]);

    const page = measuredRow("Composite-row press routing");
    expect(
      page,
      "the page's measured table has no press-routing row",
    ).toBeDefined();
    expect(page?.[1]).toContain("press-routing-lifecycle");
    expect(page?.[1]).toContain("paints a fill");
    expect(page?.[1]).toContain("focus path");
    expect(page?.[2]).toContain("onAuxClick");
    // The page's key routes are the fixture's own, so a changed expectation
    // moves the page with it.
    const keyRoutes = [
      "text-unfilled",
      "text-filled",
      "control-filled",
      "control-unfilled",
      "field-cell",
    ].map((id) => ({
      id,
      route: pressCases.find((entry) => entry.id === id)?.route ?? "",
    }));
    expect(
      keyRoutes.filter(({ route }) => route === "").map(({ id }) => id),
      "the fixture no longer holds a case the page cites",
    ).toEqual([]);
    expect(
      keyRoutes
        .filter(
          ({ id, route }) => !(page?.[1] ?? "").includes(`${id} → ${route}`),
        )
        .map(({ id }) => id),
      "the page prints a route the fixture does not measure",
    ).toEqual([]);
  });

  it("records the hover a filled child takes away from its row", () => {
    // A row's pointer feedback is the runtime's native `style.hover`
    // refinement, and its hovered set comes from the same hit test the press
    // takes — so a Badge or a metric inside a selectable row can take the row's
    // hover while leaving its press. `hover-routing-lifecycle` measured the four
    // child shapes; `HOVER_CASES` is the fixture's expectation, so the record
    // and the page print its readings rather than a transcription of them.
    const hover = rowFor("Composite-row hover routing");
    expect(hover?.verdict).toBe("supported, with limits");
    expect(hover?.evidence).toContain("hover-routing-lifecycle");
    expect(hover?.evidence).toContain("HOVER_CASES");
    expect(hover?.evidence).toContain("same hit test");
    expect(hover?.workaround).toContain('pointerEvents: "none"');
    expect(hover?.workaround).toContain("onMouseEnter");

    expect(hoverCases.length).toBe(4);
    // The rule the table states: the fill the row paints is exactly whether it
    // heard the enter, for every child shape.
    expect(
      hoverCases.filter((entry) => entry.painted === entry.rowEnter).length,
      "a case's painted fill and its row enter disagree",
    ).toBe(hoverCases.length);
    // And the child hears its own listener in every case, inert or not.
    expect(hoverCases.filter((entry) => entry.childEnter).length).toBe(
      hoverCases.length,
    );

    const printed = hoverCases.map(
      (entry) => `\`${entry.id} → ${hoverSpelling(entry)}\``,
    );
    expect(
      printed.filter((entry) => !(hover?.evidence ?? "").includes(entry)),
      "the record prints a hover reading the fixture does not measure",
    ).toEqual([]);

    const page = measuredRow("Composite-row hover routing");
    expect(
      page,
      "the page's measured table has no hover-routing row",
    ).toBeDefined();
    expect(
      printed.filter((entry) => !(page?.[1] ?? "").includes(entry)),
      "the page prints a hover reading the fixture does not measure",
    ).toEqual([]);
    expect(page?.[2]).toContain("pointerEvents");

    // The lane page where a table row is designed carries the same rule.
    const lane = read("apps/docs/content/docs/data-display/index.mdx");
    expect(lane).toContain("hover-routing-lifecycle");
    expect(lane).toContain('pointerEvents: "none"');
  });

  it("records the chord a desktop list selects with, and the count a probe cannot send", () => {
    // Tier 3's row selection is a selected **record**, and a desktop reader adds
    // the three modified presses. The runtime delivered the held set all along,
    // but the smoke host had no verb that holds one, so no probe had sent a
    // modified press and a row handler could ignore the chord while every
    // selection check passed. `modifier-select-lifecycle` measured the whole
    // rule, and the anchor is the half a component gets wrong.
    const chord = rowFor("Modifier press and chord selection");
    expect(chord?.verdict).toBe("supported, with limits");
    expect(chord?.evidence).toContain("modifier-select-lifecycle");
    expect(chord?.evidence).toContain("selected=3,4,5,6");
    expect(chord?.evidence).toContain(
      "flags=cmd:true,ctrl:false,alt:false,shift:false",
    );
    expect(chord?.evidence).toContain("selected=4,5,6,7");
    // The protocol hard-codes one click, so a double press is not measurable.
    expect(chord?.evidence).toContain("click_count: 1");
    expect(chord?.workaround).toContain("four flags");
    expect(chord?.workaround).toContain("anchor");

    const page = measuredRow("Modifier press");
    expect(
      page,
      "the page's measured table has no modifier-press row",
    ).toBeDefined();
    expect(page?.[1]).toContain("modifier-select-lifecycle");
    expect(page?.[1]).toContain("selected=3,4,5,6");
    expect(page?.[1]).toContain("click_count: 1");
    expect(page?.[2]).toContain("four flags");
    expect(page?.[2]).toContain("anchor");
  });

  it("records the right-to-left string the platform shapes, and the direction it cannot be given", () => {
    // The row kept one half explicitly unmeasured while claiming the other:
    // whether the platform shapes and orders an RTL **string** on its own. A
    // consumer shipping Arabic or Hebrew has to know which half it owns, and
    // `rtl-text` measured it: the direction comes from the first strong
    // character rather than from right-aligning a box, and the shaper joins the
    // Arabic run. What stays missing is expressing a layout direction.
    const rtl = rowFor("Right-to-left layout");
    expect(rtl?.verdict).toBe("not supported");
    expect(rtl?.evidence).toContain("rtl-text");
    expect(rtl?.evidence).toContain("92/0");
    expect(rtl?.evidence).toContain("0/92");
    expect(rtl?.evidence).toContain("58 pt");
    expect(rtl?.evidence).toContain("79 pt");
    // The retracted "unmeasured" clause cannot come back.
    expect(rtl?.evidence).not.toContain("unmeasured");
    expect(rtl?.workaround).toContain("direction-aware helper");

    const page = typingsRow("Right-to-left layout");
    expect(
      page,
      "the page's typings table has no right-to-left row",
    ).toBeDefined();
    expect(page?.[1]).toContain("rtl-text");
    expect(page?.[1]).toContain("92/0");
    expect(page?.[1]).toContain("58 pt");
    expect(page?.[1]).not.toContain("unmeasured");
    expect(page?.[2]).toContain("direction-aware helper");
  });

  it("records the rules around a grid's filter, and the four decisions a grid owns", () => {
    // Tier 3's Filtering controls row is composition, and a plan reading only
    // the table sort/selection rule would leave a filtered-out selection live.
    // `table-filter-lifecycle` measured the four decisions: the selection
    // follows its record, the field keeps the text session, a new set opens at
    // the top, and an arrow step walks the filtered order.
    const filter = rowFor("Filtering controls");
    expect(filter?.verdict).toBe("supported");
    expect(filter?.evidence).toContain("table-filter-lifecycle");
    expect(filter?.evidence).toContain("39");
    expect(filter?.evidence).toContain("scrollOffset");
    expect(filter?.workaround).toContain("record");

    const page = measuredRow("Filtering controls");
    expect(
      page,
      "the page's measured table has no filtering-controls row",
    ).toBeDefined();
    expect(page?.[1]).toContain("table-filter-lifecycle");
    expect(page?.[1]).toContain("scrollOffset");
    expect(page?.[2]).toContain("record");
  });

  it("records the dock's keyboard order, and the pane a closed sidebar keeps in it", () => {
    // Tier 4's Keyboard navigation row calls the keyboard order "ours", and
    // `dock-focus-lifecycle` measured it: one stop per rail, a closed sidebar
    // whose unguarded control keeps its stop, its own box and programmatic
    // focus, a rail step that must move real focus, and a field that owns its
    // arrows. A dock plan reading only `dock-reflow` would build none of it.
    const dock = rowFor("Dock keyboard navigation");
    expect(dock?.verdict).toBe("supported, with limits");
    expect(dock?.evidence).toContain("dock-focus-lifecycle");
    expect(dock?.evidence).toContain("12px");
    expect(dock?.evidence).toContain("focusElement");
    expect(dock?.workaround).toContain("tabIndex={-1}");

    const page = measuredRow("Dock keyboard navigation");
    expect(
      page,
      "the page's measured table has no dock-keyboard row",
    ).toBeDefined();
    expect(page?.[1]).toContain("dock-focus-lifecycle");
    expect(page?.[1]).toContain("12px");
    expect(page?.[2]).toContain("focusElement");
  });

  it("records the menu anchored inside a scroller, and the cell its arithmetic needs", () => {
    // Tier 3's column configuration row is `?`: the composition needs a menu
    // whose trigger lives in the header a grid scrolls, and
    // `header-menu-lifecycle` measured that the anchored panel follows the
    // anchor's offset in the same read, that Escape returns the focus, and that
    // anchor arithmetic is 22px out if it reads the trigger instead of the cell.
    const menu = rowFor("Menu anchored in a scroller");
    expect(menu?.verdict).toBe("supported, with limits");
    expect(menu?.evidence).toContain("header-menu-lifecycle");
    expect(menu?.evidence).toContain("22px");
    expect(menu?.evidence).toContain("before");
    expect(menu?.workaround).toContain("cell");

    const page = measuredRow("Menu anchored in a scroller");
    expect(
      page,
      "the page's measured table has no anchored-header-menu row",
    ).toBeDefined();
    expect(page?.[1]).toContain("header-menu-lifecycle");
    expect(page?.[1]).toContain("22px");
    expect(page?.[2]).toContain("cell");
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

  it("records what `aspectRatio` fills, derived from its fixture", () => {
    // The record called `aspectRatio` supported on the strength of a type
    // declaration, and a window reports no style — so only a painted box says
    // which dimension the ratio fills. `aspect-ratio-paint` measured each axis,
    // both definite dimensions, and the two container stretches; the geometry
    // it printed is derived here from the fixture's own constants, so a record
    // that teaches a size the probe no longer paints fails by name.
    const fixture = read("apps/playground/src/live/aspect-ratio.ts");
    const constant = (name: string): number =>
      Number(
        new RegExp(`export const ${name} = ([\\d.]+);`).exec(fixture)?.[1] ??
          Number.NaN,
      );
    const ratio = constant("ASPECT_RATIO");
    const width = constant("ASPECT_WIDTH");
    const height = constant("ASPECT_HEIGHT");
    const portraitWidth = constant("ASPECT_PORTRAIT_WIDTH");
    const portraitRatio = constant("ASPECT_PORTRAIT_RATIO");
    const columnWidth = constant("ASPECT_COLUMN_WIDTH");
    const rowHeight = constant("ASPECT_ROW_HEIGHT");
    const box = (w: number, h: number): string =>
      `${Math.round(w)}×${Math.round(h)}`;

    const aspect = rowFor("`aspectRatio`");
    expect(aspect?.verdict).toBe("supported, with limits");
    expect(aspect?.evidence).toContain("aspect-ratio-paint");
    expect(aspect?.evidence).toContain(box(width, width / ratio));
    expect(aspect?.evidence).toContain(
      box(portraitWidth, portraitWidth / portraitRatio),
    );
    expect(aspect?.evidence).toContain(box(height * ratio, height));
    expect(aspect?.evidence).toContain(box(width, height));
    expect(aspect?.evidence).toContain(box(columnWidth, columnWidth / ratio));
    expect(aspect?.evidence).toContain(box(0, rowHeight));
    expect(aspect?.evidence).toContain("no width");
    expect(aspect?.workaround).toContain("one axis open");

    const page = measuredRow("Aspect ratio");
    expect(
      page,
      "the page's measured table has no aspect-ratio row",
    ).toBeDefined();
    expect(page?.[1]).toContain("aspect-ratio-paint");
    expect(page?.[1]).toContain(box(width, width / ratio));
    expect(page?.[1]).toContain(box(height * ratio, height));
    expect(page?.[1]).toContain(box(0, rowHeight));
    expect(page?.[2]).toContain("height");
  });

  it("records the flex rules a `flex-1` composes with, derived from its fixture", () => {
    // The record called Flexbox supported on the strength of the `StyleDesc`
    // fields, so a dock pane, a table column or a truncating label leaning on
    // `flex-1` had only the typings' word. `flex-sizing` painted each rule, and
    // the numbers below are derived from its own constants, so a record that
    // teaches a width the probe no longer paints fails by name. The bug this
    // guards: `flexBasis: 0` is not equality — a grower whose content is wider
    // than its share keeps the content, and the sibling takes the rest.
    const fixture = read("apps/playground/src/live/flex-sizing.ts");
    const constant = (name: string): number =>
      Number(
        new RegExp(`export const ${name} = ([\\d.]+);`).exec(fixture)?.[1] ??
          Number.NaN,
      );
    const row = constant("FLEX_ROW_WIDTH");
    const narrow = constant("FLEX_NARROW_WIDTH");
    const fixed = constant("FLEX_FIXED_WIDTH");
    const asked = constant("FLEX_ASKED_WIDTH");
    const short = constant("FLEX_SHORT_CONTENT");
    const long = constant("FLEX_LONG_CONTENT");
    const over = constant("FLEX_OVER_CONTENT");
    const floorRow = constant("FLEX_FLOOR_ROW_WIDTH");
    const floorContent = constant("FLEX_FLOOR_CONTENT");
    const max = constant("FLEX_MAX_WIDTH");
    const column = constant("FLEX_ALIGN_COLUMN_WIDTH");
    const alignContent = constant("FLEX_ALIGN_CONTENT");

    const free = row - fixed;
    const share = free / 2;
    const autoFree = free - (short + long);
    const autoShort = short + autoFree / 2;
    const autoLong = long + autoFree / 2;
    const overShort = free - over;
    const alignEnd = column - alignContent;
    const alignCenter = alignEnd / 2;

    // The premises: the fit pair splits evenly where the auto pair does not,
    // and the over-full grower would have fitted an equal share.
    expect(share).not.toBe(autoShort);
    expect(over).toBeGreaterThan(share);
    expect(asked).toBeGreaterThan(narrow);

    const flex = rowFor("Flexbox and grid");
    expect(flex?.verdict).toBe("supported");
    expect(flex?.evidence).toContain("flex-sizing");
    expect(flex?.evidence).toContain("layout-flex-sizing");
    expect(flex?.evidence).toContain(`**${free}**`);
    expect(flex?.evidence).toContain(`**${share}/${share}**`);
    expect(flex?.evidence).toContain(`**${autoShort}/${autoLong}**`);
    expect(flex?.evidence).toContain(`**${over}**`);
    expect(flex?.evidence).toContain(`**${overShort}**`);
    expect(flex?.evidence).toContain(`**${narrow - fixed}**`);
    expect(flex?.evidence).toContain(`**${asked}**`);
    expect(flex?.evidence).toContain(`**${floorContent}**`);
    expect(flex?.evidence).toContain(`**${floorRow}**`);
    expect(flex?.evidence).toContain(`**${max}**`);
    expect(flex?.evidence).toContain(`**0/${alignCenter}/${alignEnd}**`);
    expect(flex?.evidence).toContain("not equality");
    expect(flex?.workaround).toContain("minWidth: 0");
    expect(flex?.workaround).toContain("shrink-0");

    const page = measuredRow("Flex sizing");
    expect(
      page,
      "the page's measured table has no flex-sizing row",
    ).toBeDefined();
    expect(page?.[1]).toContain("flex-sizing");
    expect(page?.[1]).toContain("layout-flex-sizing");
    expect(page?.[1]).toContain(`**${free}**`);
    expect(page?.[1]).toContain(`**${share}/${share}**`);
    expect(page?.[1]).toContain(`**${autoShort}/${autoLong}**`);
    expect(page?.[1]).toContain(`**${narrow - fixed}**`);
    expect(page?.[1]).toContain(`**${asked}**`);
    expect(page?.[1]).toContain(`**0/${alignCenter}/${alignEnd}**`);
    expect(page?.[2]).toContain("shrink-0");
    expect(page?.[2]).toContain("minWidth: 0");
    expect(page?.[2]).toContain("maxWidth");
  });

  it("publishes the focus ring a filled action paints", () => {
    // The accessibility page taught the ring from the tokens and the typings,
    // and the one case the offset exists for — a filled action whose fill is
    // the same role the ring paints — was measured by `action-ring` and cited
    // nowhere. The bug this guards: a flush ring is invisible against its own
    // fill, so the gap is the separation and a press must paint none.
    const fixture = read("apps/playground/src/live/ring-offset.ts");
    const offset = Number(/RING_OFFSET = ([\d_]+)/.exec(fixture)?.[1] ?? NaN);
    const width = themes.dark.borderWidth.strong;
    expect(offset).toBeGreaterThan(0);
    expect(width).toBeGreaterThan(0);
    expect(themes.dark.colors.primary.toUpperCase()).toBe(
      themes.dark.colors.ring.toUpperCase(),
    );
    const band = offset + width / 2;

    const readme = read("apps/playground/README.md");
    const section =
      /### `action-ring`[\s\S]*?(?=\n### |\n## )/.exec(readme)?.[0] ?? "";
    const checks = Number(/(\d+) checks/.exec(section)?.[1] ?? Number.NaN);
    expect(checks).toBeGreaterThan(10);

    const row = rowFor("Keyboard focus ring");
    expect(row?.verdict).toBe("supported, with limits");
    expect(row?.evidence).toContain("action-ring");
    expect(row?.evidence).toContain(`${checks} checks`);
    expect(row?.evidence).toContain(themes.dark.colors.ring.toUpperCase());
    expect(row?.evidence).toContain(`**${band}**`);
    expect(row?.evidence).toContain("paint");

    const page = measuredRow("Keyboard focus ring");
    expect(
      page,
      "the page's measured table has no focus-ring row",
    ).toBeDefined();
    expect(page?.[1]).toContain("action-ring");
    expect(page?.[1]).toContain(`${checks} checks`);
    expect(page?.[1]).toContain(themes.dark.colors.ring.toUpperCase());
    expect(page?.[1]).toContain(`**${band}**`);

    const accessibility = read("apps/docs/content/docs/accessibility.mdx");
    expect(accessibility).toContain("action-ring");
    expect(accessibility).toContain(`${checks} checks`);
    expect(accessibility).toContain(themes.dark.colors.ring.toUpperCase());
    expect(accessibility).toContain(`**${band}**`);
    expect(accessibility).toContain("paints **no ring**");
  });

  it("publishes the layout a move does not report", () => {
    // A surface that stores its box from `onLayout` and subtracts a fresh
    // pointer point is how a magnetic plate, a zoom or an anchored palette
    // reads where it is. `surface-origin` measured that a **move** delivers no
    // layout at all: a panel opening above the surface left the stored origin
    // at 88 while the surface painted at 208, and only a nudged 1px probe
    // re-reported. The bug this guards: the record recommended `onLayout` for a
    // box without saying it is a size report.
    const fixture = read("apps/playground/src/live/surface-origin.ts");
    const movedBy = Number(/MOVED_BY = ([\d_]+)/.exec(fixture)?.[1] ?? NaN);
    expect(movedBy).toBeGreaterThan(0);

    const readme = read("apps/playground/README.md");
    const section =
      /### `surface-origin`[\s\S]*?(?=\n### |\n## )/.exec(readme)?.[0] ?? "";
    const origins = [...section.matchAll(/originY=(\d+)/g)].map((match) =>
      Number(match[1]),
    );
    const base = origins[0] ?? Number.NaN;
    const moved = base + movedBy;
    const checks = Number(/(\d+) checks/.exec(section)?.[1] ?? Number.NaN);
    expect(checks).toBeGreaterThan(5);
    expect(origins).toContain(moved);

    const row = rowFor("Layout reports");
    expect(row?.verdict).toBe("supported, with limits");
    expect(row?.evidence).toContain("surface-origin");
    expect(row?.evidence).toContain(`${checks} checks`);
    expect(row?.evidence).toContain(`originY=${base}`);
    expect(row?.evidence).toContain(`reportedY=${base}`);
    expect(row?.evidence).toContain(`originY=${moved}`);
    expect(row?.evidence).toContain(`**${movedBy}**`);

    const queries = rowFor("Container queries");
    expect(queries?.workaround).toContain("size");
    expect(queries?.workaround).toContain("Layout reports");

    const page = measuredRow("Layout reports");
    expect(
      page,
      "the page's measured table has no layout-reports row",
    ).toBeDefined();
    expect(page?.[1]).toContain("surface-origin");
    expect(page?.[1]).toContain(`${checks} checks`);
    expect(page?.[1]).toContain(`originY=${base}`);
    expect(page?.[1]).toContain(`originY=${moved}`);

    const layouts = read("apps/docs/content/docs/layouts.mdx");
    expect(layouts).toContain("surface-origin");
    expect(layouts).toContain(`**${movedBy}**`);
    expect(layouts).toContain("size");
  });

  it("publishes the tab move a window measured", () => {
    // Tier 4's movable tabs are `partial` because the binding opens one window
    // per process, and the half a window can prove is the move inside it.
    // `movable-tabs-lifecycle` drove a drag and a keyboard step, and the orders
    // below are derived from the fixture's own starting strips, so the record,
    // the page and the workspace lane cannot teach an order the window no
    // longer measured. The bug this guards: a move remounts the tab's panel,
    // so the draft and the focus have to live above the strips.
    const fixture = read("apps/playground/src/live/tabs-drag.ts");
    const initial = (group: string): ReadonlyArray<string> => {
      const block =
        new RegExp(`${group}: \\{[\\s\\S]*?tabs: \\[([^\\]]*)\\]`).exec(
          fixture,
        )?.[1] ?? "";
      return [...block.matchAll(/"([a-z]+)"/g)].map((match) => match[1] ?? "");
    };
    const left = initial("left");
    const right = initial("right");
    const gap = Number(/TAB_GROUP_GAP = ([\d_]+)/.exec(fixture)?.[1] ?? NaN);
    expect(left.length).toBe(3);
    expect(right.length).toBe(2);
    expect(gap).toBeGreaterThan(0);

    // `bravo` (left's second tab) is dragged to the right strip's start.
    const movedLeft = left.filter((tab) => tab !== "bravo");
    const movedRight = ["bravo", ...right];
    expect(movedLeft).toEqual(["alpha", "charlie"]);
    expect(movedRight).toEqual(["bravo", "delta", "echo"]);
    // The keyboard steps the moved `bravo` to the end of the right strip.
    const rightwards = (
      tabs: ReadonlyArray<string>,
      index: number,
    ): ReadonlyArray<string> => {
      const copy = [...tabs];
      const [held] = copy.splice(index, 1);
      copy.splice(index + 1, 0, held ?? "");
      return copy;
    };
    const stepped = rightwards(movedRight, 0);
    const clamped = rightwards(stepped, 1);
    // `echo` is dragged back into the left strip at `charlie`'s slot.
    const returnedLeft = [left.at(0) ?? "", "echo", left.at(2) ?? ""];

    const readme = read("apps/playground/README.md");
    const section =
      /### `movable-tabs-lifecycle`[\s\S]*?(?=\n### |\n## )/.exec(
        readme,
      )?.[0] ?? "";
    const checks = Number(/(\d+) checks/.exec(section)?.[1] ?? Number.NaN);
    expect(checks).toBeGreaterThan(20);

    const row = rowFor("Movable tabs");
    expect(row?.verdict).toBe("supported, with limits");
    expect(row?.evidence).toContain("movable-tabs-lifecycle");
    expect(row?.evidence).toContain(`${checks} checks`);
    expect(row?.evidence).toContain(`**${gap}**`);
    expect(row?.evidence).toContain(movedLeft.join(","));
    expect(row?.evidence).toContain(movedRight.join(","));
    expect(row?.evidence).toContain(stepped.join(","));
    expect(row?.evidence).toContain(clamped.join(","));
    expect(row?.evidence).toContain(returnedLeft.join(","));
    expect(row?.evidence).toContain("remount");
    expect(row?.workaround).toContain("centre");

    const page = measuredRow("Movable tabs");
    expect(
      page,
      "the page's measured table has no movable-tabs row",
    ).toBeDefined();
    expect(page?.[1]).toContain("movable-tabs-lifecycle");
    expect(page?.[1]).toContain(`${checks} checks`);
    expect(page?.[1]).toContain(`**${gap}**`);
    expect(page?.[1]).toContain(movedLeft.join(","));
    expect(page?.[1]).toContain(movedRight.join(","));
    expect(page?.[1]).toContain(stepped.join(","));
    expect(page?.[1]).toContain(returnedLeft.join(","));

    const workspace = read("apps/docs/content/docs/workspace/index.mdx");
    expect(workspace).toContain("movable-tabs-lifecycle");
    expect(workspace).toContain(`${checks} checks`);
    expect(workspace).toContain(movedLeft.join(","));
    expect(workspace).toContain(stepped.join(","));
    expect(workspace).toContain("remount");
  });

  it("publishes the theme switch a window measured", () => {
    // MISSION lists theme switching among the critical interactions, and the
    // theming page taught the token layer without saying what a window does
    // when the provider's value changes: a palette press repaints, a platform
    // press re-lays out, and a high-contrast base keeps its palette while it
    // takes a look's density. `theme-switch-lifecycle` measured both axes, and
    // the frames below are derived from the palettes and the tokens' platform
    // presets, so neither document can teach a frame the window no longer
    // paints.
    const palettes = {
      dark: getTheme("dark"),
      light: getTheme("light"),
      high: getTheme("dark", "high"),
    } as const;
    const hex = (value: string): string => value.toUpperCase();

    const readme = read("apps/playground/README.md");
    const section =
      /### `theme-switch-lifecycle`[\s\S]*?(?=\n### |\n## )/.exec(
        readme,
      )?.[0] ?? "";
    const checks = Number(/(\d+) checks/.exec(section)?.[1] ?? Number.NaN);
    expect(checks, "the probe's README has no check count").toBeGreaterThan(20);

    const heights = {
      default: platformTheme(palettes.high, "default").density.controlHeight.md,
      darwin: platformTheme(palettes.high, "darwin").density.controlHeight.md,
      linux: platformTheme(palettes.high, "linux").density.controlHeight.md,
      win32: platformTheme(palettes.high, "win32").density.controlHeight.md,
    };
    // The premise: the platforms are distinguishable by the height a switch
    // can show, and macOS is the compact end while Linux is the spacious one.
    expect(new Set(Object.values(heights)).size).toBeGreaterThanOrEqual(3);
    expect(heights.darwin).toBeLessThan(heights.default);
    expect(heights.linux).toBeGreaterThan(heights.default);

    const row = rowFor("Theme and density switch");
    expect(row?.verdict).toBe("supported");
    expect(row?.evidence).toContain("theme-switch-lifecycle");
    expect(row?.evidence).toContain(`${checks} checks`);
    expect(row?.evidence).toContain(hex(palettes.dark.colors.background));
    expect(row?.evidence).toContain(hex(palettes.light.colors.background));
    expect(row?.evidence).toContain(hex(palettes.high.colors.background));
    expect(row?.evidence).toContain(hex(palettes.dark.colors.card));
    expect(row?.evidence).toContain(hex(palettes.light.colors.card));
    expect(row?.evidence).toContain(hex(palettes.high.colors.card));
    expect(row?.evidence).toContain(`**${heights.default}**`);
    expect(row?.evidence).toContain(`**${heights.darwin}**`);
    expect(row?.evidence).toContain(`**${heights.linux}**`);
    expect(row?.evidence).toContain("reserves");
    expect(row?.evidence).toContain("reflow");
    expect(row?.workaround).toContain("provider");

    const page = measuredRow("Theme and density switch");
    expect(
      page,
      "the page's measured table has no theme-switch row",
    ).toBeDefined();
    expect(page?.[1]).toContain("theme-switch-lifecycle");
    expect(page?.[1]).toContain(`${checks} checks`);
    expect(page?.[1]).toContain(hex(palettes.dark.colors.background));
    expect(page?.[1]).toContain(hex(palettes.light.colors.background));
    expect(page?.[1]).toContain(hex(palettes.high.colors.background));
    expect(page?.[1]).toContain(`**${heights.default}**`);
    expect(page?.[1]).toContain(`**${heights.darwin}**`);
    expect(page?.[1]).toContain(`**${heights.linux}**`);
    expect(page?.[1]).toContain("reserves");

    const theming = read("apps/docs/content/docs/theming.mdx");
    expect(theming).toContain("theme-switch-lifecycle");
    expect(theming).toContain(`${checks} checks`);
    expect(theming).toContain(hex(palettes.dark.colors.background));
    expect(theming).toContain(hex(palettes.light.colors.background));
    expect(theming).toContain(hex(palettes.high.colors.background));
    expect(theming).toContain(`**${heights.darwin}**`);
    expect(theming).toContain(`**${heights.linux}**`);
    expect(theming).toContain("reserves");
  });

  it("publishes the dismissal order a three-level stack measured", () => {
    // A dialog holding a popover holding a menu is the composition MISSION
    // names under nested overlays, and its one contract is the order a
    // dismissal resolves in: every enclosing surface hears the keystroke, so a
    // missing layer closes all three at once. `nested-overlay-lifecycle` drove
    // the shipped tree in a window and printed the order, and the values below
    // are derived from the probe's own surfaces and its README, so neither the
    // record nor a page can teach an order the window no longer measured.
    const fixture = read("apps/playground/src/live/nested-overlay.ts");
    const declared =
      /export const nestedSurfaces = \[([^\]]*)\]/.exec(fixture)?.[1] ?? "";
    const surfaces = [...declared.matchAll(/"([a-z]+)"/g)].map(
      (match) => match[1] ?? "",
    );
    expect(surfaces.length).toBe(3);
    expect(surfaces.at(0)).toBe("dialog");
    expect(surfaces.at(-1)).toBe("menu");

    const readme = read("apps/playground/README.md");
    const section =
      /### `nested-overlay-lifecycle`[\s\S]*?(?=\n### |\n## )/.exec(
        readme,
      )?.[0] ?? "";
    const checks = Number(/(\d+) checks/.exec(section)?.[1] ?? Number.NaN);
    expect(checks, "the probe's README has no check count").toBeGreaterThan(20);

    const outward = [...surfaces].reverse();
    const first = outward[0] ?? "";
    const second = outward.slice(0, 2).join(",");
    const third = outward.join(",");

    const row = rowFor("Nested overlays");
    expect(row?.verdict).toBe("supported, with limits");
    expect(row?.evidence).toContain("nested-overlay-lifecycle");
    expect(row?.evidence).toContain(`${checks} checks`);
    expect(row?.evidence).toContain(`dismissed=${first}`);
    expect(row?.evidence).toContain(`dismissed=${second}`);
    expect(row?.evidence).toContain(`dismissed=${third}`);
    expect(row?.evidence).toContain("closes=1,1,2");
    expect(row?.evidence).toContain("closes=1,2,2");
    expect(row?.evidence).toContain("closes=2,2,2");
    expect(row?.workaround).toContain("one dismiss");

    const page = measuredRow("Nested overlays");
    expect(
      page,
      "the page's measured table has no nested-overlays row",
    ).toBeDefined();
    expect(page?.[1]).toContain("nested-overlay-lifecycle");
    expect(page?.[1]).toContain(`${checks} checks`);
    expect(page?.[1]).toContain(`dismissed=${first}`);
    expect(page?.[1]).toContain(`dismissed=${second}`);
    expect(page?.[1]).toContain(`dismissed=${third}`);
    expect(page?.[1]).toContain("closes=1,1,2");
    expect(page?.[2]).toContain("one dismiss");

    const dialog = read("apps/docs/content/docs/components/dialog.mdx");
    expect(dialog).toContain("nested-overlay-lifecycle");
    expect(dialog).toContain(`${checks} checks`);
    expect(dialog).toContain("closes=1,1,2");
  });

  it("records the thumb a scroller paints, derived from its fixture", () => {
    // The record called scrolling supported on the strength of the offsets and
    // events, and said nothing about the bar a reader actually sees.
    // `scrollbar-thumb` painted it, and the numbers below are derived from the
    // probe's own constants, so neither file can teach a length the window no
    // longer paints. The bug this guards: the share is a length, not a bar —
    // 1 000px of content is a thumb, 10 000px is still a target a reader can
    // find, and content that fits is no affordance at all.
    const fixture = read("apps/playground/src/live/scrollbar.ts");
    const block = (name: string): string =>
      new RegExp(
        `export const ${name}: ScrollbarCase = \\{([\\s\\S]*?)\\n\\};`,
      ).exec(fixture)?.[1] ?? "";
    const field = (source: string, key: string): number =>
      Number(
        new RegExp(`${key}: ([\\d_]+)`)
          .exec(source)?.[1]
          ?.replaceAll("_", "") ?? Number.NaN,
      );
    const constant = (name: string): number =>
      Number(
        new RegExp(`export const ${name} = ([\\d_]+);`)
          .exec(fixture)?.[1]
          ?.replaceAll("_", "") ?? Number.NaN,
      );

    const track = Number(
      /height: ([\d_]+)/
        .exec(
          /export const SCROLLBAR_VIEWPORT = \{([^}]*)\}/.exec(fixture)?.[1] ??
            "",
        )?.[1]
        ?.replaceAll("_", "") ?? Number.NaN,
    );
    const min = constant("SCROLLBAR_MIN_THUMB");
    const floorContent = constant("SCROLLBAR_FLOOR_CONTENT");
    const wheel = constant("SCROLLBAR_SCROLLED_BY");
    const defaultWidth = constant("SCROLLBAR_DEFAULT_WIDTH");
    const tinted = field(block("SCROLLBAR_TINTED"), "content");
    const wide = field(block("SCROLLBAR_WIDE"), "content");
    const short = field(block("SCROLLBAR_SHORT"), "content");

    // The premises: the cases are ordered by content, and the floor case is
    // longer than the track could ever share.
    expect(track).toBeGreaterThan(0);
    expect(min).toBeGreaterThan(0);
    expect(tinted).toBeGreaterThan(wide);
    expect(wide).toBeGreaterThan(short);

    const maxScroll = (content: number): number => Math.max(0, content - track);
    const rule = (content: number): number => {
      const max = maxScroll(content);
      if (max <= 0) return 0;
      return Math.round(
        Math.min(
          Math.max((track * track) / (track + max), Math.min(min, track)),
          track,
        ),
      );
    };
    /** The probe counts the painted tint, and the rounded cap loses its point. */
    const painted = (content: number): number => rule(content) - 1;
    const startAt = (offset: number): number => {
      const max = maxScroll(tinted);
      return Math.round(
        Math.min(Math.max(-offset / max, 0), 1) * (track - rule(tinted)),
      );
    };

    const endOffset = -maxScroll(tinted);
    const moved = startAt(-wheel);
    const end = startAt(endOffset);
    const bottom = track - 1;

    expect(moved).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(moved);
    expect(rule(floorContent)).toBe(Math.min(min, track));
    expect(rule(short)).toBe(0);

    const row = rowFor("Scrollbar thumb");
    expect(row?.verdict).toBe("supported");
    expect(row?.evidence).toContain("scrollbar-thumb");
    expect(row?.evidence).toContain(`**${painted(tinted)}**`);
    expect(row?.evidence).toContain(`**${rule(tinted)}**`);
    expect(row?.evidence).toContain(`**${painted(wide)}**`);
    expect(row?.evidence).toContain(`**${rule(wide)}**`);
    expect(row?.evidence).toContain(`**${painted(floorContent)}**`);
    expect(row?.evidence).toContain(`**${rule(floorContent)}**`);
    expect(row?.evidence).toContain(`**${min}**`);
    expect(row?.evidence).toContain(`**${moved}**`);
    expect(row?.evidence).toContain(`**${end}**`);
    expect(row?.evidence).toContain(`**${bottom}**`);
    expect(row?.evidence).toContain(`**${track}**`);
    expect(row?.evidence).toContain(`**${defaultWidth}**`);
    expect(row?.evidence).toContain("paints **none**");
    expect(row?.workaround).toContain("a bar of your own");

    const page = measuredRow("Scrollbar thumb");
    expect(
      page,
      "the page's measured table has no scrollbar-thumb row",
    ).toBeDefined();
    expect(page?.[1]).toContain("scrollbar-thumb");
    expect(page?.[1]).toContain(`**${painted(tinted)}**`);
    expect(page?.[1]).toContain(`**${rule(tinted)}**`);
    expect(page?.[1]).toContain(`**${painted(wide)}**`);
    expect(page?.[1]).toContain(`**${painted(floorContent)}**`);
    expect(page?.[1]).toContain(`**${rule(floorContent)}**`);
    expect(page?.[1]).toContain(`**${moved}**`);
    expect(page?.[1]).toContain(`**${end}**`);
    expect(page?.[1]).toContain(`**${bottom}**`);
    expect(page?.[1]).toContain(`**${track}**`);
    expect(page?.[1]).toContain(`**${defaultWidth}**`);
    expect(page?.[1]).toContain("paints **none**");
    expect(page?.[2]).toContain("a bar of your own");
  });

  it("records the second thumb a two-axis scroller paints, from its fixture", () => {
    // `ScrollArea` accepts `axis="both"`, and a log pane or editor surface
    // overflows both ways — but the record said only "for each axis with more
    // to show", which reads as two independent thumbs. The window measured the
    // opposite: once both show, each track gives up the other's thickness, so a
    // length sized from the viewport alone is wrong on every two-axis scroller.
    // Every number below is derived from the probe's own constants.
    const fixture = read("apps/playground/src/live/scrollbar-both.ts");
    const scalar = (name: string): number =>
      Number(
        new RegExp(`export const ${name} = ([\\d_]+);`)
          .exec(fixture)?.[1]
          ?.replaceAll("_", "") ?? Number.NaN,
      );
    const pair = (name: string): { width: number; height: number } => {
      const body =
        new RegExp(`export const ${name} = \\{([^}]*)\\}`).exec(fixture)?.[1] ??
        "";
      const field = (key: string): number =>
        Number(
          new RegExp(`${key}: ([\\d_]+)`)
            .exec(body)?.[1]
            ?.replaceAll("_", "") ?? Number.NaN,
        );
      return { width: field("width"), height: field("height") };
    };

    const viewport = pair("BOTH_VIEWPORT");
    const content = pair("BOTH_CONTENT");
    const short = pair("BOTH_SHORT_CONTENT");
    const thickness = scalar("BOTH_THICKNESS");

    // The premises: the box is smaller than the content on both axes, the
    // control fits on both, and the tint has a thickness to give up.
    expect(viewport.width).toBeGreaterThan(0);
    expect(content.width).toBeGreaterThan(viewport.width);
    expect(content.height).toBeGreaterThan(viewport.height);
    expect(short.width).toBeLessThan(viewport.width);
    expect(short.height).toBeLessThan(viewport.height);
    expect(thickness).toBeGreaterThan(0);

    /** One axis: the track both thumbs leave, and the extent that can move. */
    const axis = (extent: number, view: number) => {
      const track = view - thickness;
      const max = extent - view;
      const share = (on: number): number =>
        Math.round(Math.min((on * on) / (on + max), on));
      return { track, max, shortened: share(track), viewportOnly: share(view) };
    };
    const vertical = axis(content.height, viewport.height);
    const horizontal = axis(content.width, viewport.width);
    // The scroll distance keeps the viewport's share: a track-derived rule (the
    // shortened track applied to the content) would move further than the page.
    const clamp = -vertical.max;
    const trackDerived = -(content.height - vertical.track);

    expect(vertical.shortened).toBeLessThan(vertical.viewportOnly);
    expect(horizontal.shortened).toBeLessThan(horizontal.viewportOnly);
    expect(trackDerived).toBeLessThan(clamp);

    const row = rowFor("Scrollbar thumb");
    expect(row?.verdict).toBe("supported");
    expect(row?.evidence).toContain("scrollbar-thumb-both");
    expect(row?.evidence).toContain('`axis="both"` paints both thumbs');
    expect(row?.evidence).toContain(`**${vertical.shortened}**`);
    expect(row?.evidence).toContain(`**${horizontal.shortened}**`);
    expect(row?.evidence).toContain(`**${vertical.viewportOnly}**`);
    expect(row?.evidence).toContain(`**${horizontal.viewportOnly}**`);
    expect(row?.evidence).toContain(`${clamp}`);
    expect(row?.evidence).toContain(`${trackDerived}`);
    expect(row?.evidence).toContain(`${short.width}×${short.height}`);
    expect(row?.workaround).toContain('axis="both"');

    const page = measuredRow("Scrollbar thumb");
    expect(page).toBeDefined();
    expect(page?.[1]).toContain("scrollbar-thumb-both");
    expect(page?.[1]).toContain(`**${vertical.shortened}**`);
    expect(page?.[1]).toContain(`**${horizontal.shortened}**`);
    expect(page?.[1]).toContain(`**${vertical.viewportOnly}**`);
    expect(page?.[1]).toContain(`**${horizontal.viewportOnly}**`);
    expect(page?.[1]).toContain(`${clamp}`);
    expect(page?.[1]).toContain(`${trackDerived}`);
    expect(page?.[2]).toContain('axis="both"');

    // §5 owes the probe — the section itself, not any backticked mention in
    // §3, which is where the row's own citation lives.
    const record = read("docs/gpuix-capabilities.md");
    const keeping = record.slice(
      record.indexOf("## 5. Keeping this document true"),
    );
    expect(keeping).toContain("`scrollbar-thumb-both`");
  });

  it("records the height a clipped parent reports, from its fixture", () => {
    // A disclosure's whole basis is that the body's content box is reported
    // while its parent was zero high a frame earlier. The record said `onLayout`
    // reports a size, and nothing about the clipped case — so a plan building a
    // reveal had to guess whether it needed a caller-supplied height. Every
    // number is derived from the probe's own constants.
    const fixture = read("apps/playground/src/live/collapse.ts");
    const scalar = (name: string): number =>
      Number(
        new RegExp(`export const ${name} = ([\\d_]+);`)
          .exec(fixture)?.[1]
          ?.replaceAll("_", "") ?? Number.NaN,
      );

    const body = scalar("COLLAPSE_BODY");
    const grown = scalar("COLLAPSE_GROWN");
    const mounted = scalar("COLLAPSE_MOUNTED");

    // The premises: three distinct heights, and the grown body is the largest.
    expect(mounted).toBeGreaterThan(0);
    expect(body).toBeGreaterThan(mounted);
    expect(grown).toBeGreaterThan(body);

    const row = rowFor("Layout reports");
    expect(row?.verdict).toBe("supported, with limits");
    expect(row?.evidence).toContain("`collapsible-lifecycle`");

    // The claim, not the row: `**120**` also happens to be the distance the
    // panel moves in the surface-origin sentence, so a bare `toContain` would
    // pass on the wrong measurement.
    const clipped = (text: string): string =>
      text.slice(text.indexOf("**Inside a clipped parent**"));
    // Each height with the clause it belongs to: the retired body is also
    // `**120**`, so a bare number would pass on the wrong step.
    expect(clipped(row?.evidence ?? "")).toContain(
      `on the body's **${mounted}** with no press`,
    );
    expect(clipped(row?.evidence ?? "")).toContain(
      `a pressed section on **${body}**`,
    );
    expect(clipped(row?.evidence ?? "")).toContain(
      `a body grown to **${grown}** while the section was closed`,
    );
    expect(clipped(row?.evidence ?? "")).toContain(
      `keeps **neither** the box nor the body mounted`,
    );

    const page = measuredRow("Layout reports");
    expect(page).toBeDefined();
    expect(page?.[1]).toContain("collapsible-lifecycle");
    expect(clipped(page?.[1] ?? "")).toContain(
      `on the body's **${mounted}** with no press`,
    );
    expect(clipped(page?.[1] ?? "")).toContain(`a pressed one on **${body}**`);
    expect(clipped(page?.[1] ?? "")).toContain(
      `a body grown to **${grown}** while the section was closed`,
    );

    const record = read("docs/gpuix-capabilities.md");
    const keeping = record.slice(
      record.indexOf("## 5. Keeping this document true"),
    );
    expect(keeping).toContain("`collapsible-lifecycle`");
  });

  it("records the box an image occupies, derived from its fixture", () => {
    // An image is the one element whose intrinsic ratio the runtime owns, and
    // the record taught the four sources an `<img>` can paint from without
    // saying what box it takes. `image-box` measured that the loaded bitmap's
    // ratio **replaces** a style's `aspectRatio` (120×120, not the 120×60 the
    // style asks for) and that only two definite dimensions pin the box. The
    // geometry is derived from the fixture, so a record that teaches a box the
    // probe no longer paints fails by name.
    const fixture = read("apps/playground/src/live/image-box.ts");
    const constant = (name: string): number =>
      Number(
        new RegExp(`export const ${name} = ([\\d.]+);`).exec(fixture)?.[1] ??
          Number.NaN,
      );
    const intrinsic = constant("IMAGE_INTRINSIC_SIZE");
    const width = constant("IMAGE_WIDTH");
    const height = constant("IMAGE_HEIGHT");
    const styleRatio = constant("IMAGE_RATIO");
    const bitmapRatio = intrinsic / intrinsic;
    const box = (w: number, h: number): string =>
      `${Math.round(w)}×${Math.round(h)}`;
    const square = box(width, width / bitmapRatio);
    const styleHeight = width / styleRatio;

    // The premise: the style asks for a shorter box than the bitmap paints.
    expect(styleRatio).toBeGreaterThan(bitmapRatio);

    const image = rowFor("Image painting");
    expect(image?.verdict).toBe("supported, with limits");
    expect(image?.evidence).toContain("image-box");
    expect(image?.evidence).toContain(box(intrinsic, intrinsic));
    expect(image?.evidence).toContain(square);
    expect(image?.evidence).toContain(`(**${styleHeight}**)`);
    expect(image?.evidence).toContain(box(width, height));
    expect(image?.evidence).toContain("replaces");
    expect(image?.workaround).toContain("both");

    const page = measuredRow("Image bytes");
    expect(
      page,
      "the page's measured table has no image-box row",
    ).toBeDefined();
    expect(page?.[1]).toContain("image-box");
    expect(page?.[1]).toContain(box(intrinsic, intrinsic));
    expect(page?.[1]).toContain(square);
    expect(page?.[1]).toContain(box(width, height));
    expect(page?.[1]).toContain("replaces");
    expect(page?.[2]).toContain("both");
  });

  it("records the paint inside an image's box, derived from its fixture", () => {
    // `image-box` measured the box an `<img>` occupies and `image-fit` measured
    // what its pixels do inside it: five `objectFit` modes, a smaller bitmap
    // than its box, and a radius that clips the bitmap. The record taught the
    // box and nothing about the paint, so a preview that must show everything
    // could be built with `cover`, and a `none` bitmap was assumed centred. The
    // placements are derived from the fixture, so a row that teaches a placement
    // the probe no longer paints fails by name.
    const fixture = read("apps/playground/src/live/image-fit.ts");
    const constant = (name: string): number =>
      Number(
        new RegExp(`export const ${name} = ([\\d.]+);`).exec(fixture)?.[1] ??
          Number.NaN,
      );
    const boxOf = (name: string): { width: number; height: number } => {
      const match = new RegExp(
        `export const ${name}: FitBox = \\{ width: ([\\d.]+), height: ([\\d.]+) \\};`,
      ).exec(fixture);
      return {
        width: Number(match?.[1] ?? Number.NaN),
        height: Number(match?.[2] ?? Number.NaN),
      };
    };

    const sourceWidth = constant("FIT_SOURCE_WIDTH");
    const sourceHeight = constant("FIT_SOURCE_HEIGHT");
    const full = boxOf("FIT_BOX");
    const small = boxOf("FIT_SMALL_BOX");

    const at = (x: number, y: number, w: number, h: number): string =>
      `${x},${y} ${w}×${h}`;
    const scaled = (
      box: { width: number; height: number },
      scale: number,
    ): string =>
      at(
        (box.width - sourceWidth * scale) / 2,
        (box.height - sourceHeight * scale) / 2,
        sourceWidth * scale,
        sourceHeight * scale,
      );
    const fill = at(0, 0, full.width, full.height);
    const contain = scaled(
      full,
      Math.min(full.width / sourceWidth, full.height / sourceHeight),
    );
    const cover = scaled(
      full,
      Math.max(full.width / sourceWidth, full.height / sourceHeight),
    );
    const coverScale = Math.max(
      full.width / sourceWidth,
      full.height / sourceHeight,
    );
    const cropStart = Math.round(
      (0 - (full.width - sourceWidth * coverScale) / 2) / coverScale,
    );
    const cropEnd = Math.round(
      (full.width - (full.width - sourceWidth * coverScale) / 2) / coverScale,
    );
    const natural = at(0, 0, sourceWidth, sourceHeight);
    const scaleDownSmall = scaled(
      small,
      Math.min(1, small.width / sourceWidth, small.height / sourceHeight),
    );

    // The premise: the fixture's box is wider than the bitmap, so the five
    // modes cannot coincide.
    expect(full.width).toBeGreaterThan(sourceWidth);
    expect(full.height).toBeGreaterThan(sourceHeight);
    expect(new Set([fill, contain, cover, natural]).size).toBe(4);

    const image = rowFor("Image painting");
    expect(image?.verdict).toBe("supported, with limits");
    expect(image?.evidence).toContain("image-fit");
    expect(image?.evidence).toContain("161 checks");
    const placements = [fill, contain, cover, natural, scaleDownSmall];
    expect(placements.length).toBe(5);
    const evidence = image?.evidence ?? "";
    expect(
      placements.filter((placement) => !evidence.includes(placement)),
    ).toEqual([]);
    expect(image?.evidence).toContain(`x=${cropStart}–${cropEnd}`);
    expect(image?.evidence).toContain("top-left corner");
    expect(image?.evidence).toContain("clips");
    expect(image?.workaround).toContain("crops");
    expect(image?.workaround).toContain("offset");

    const page = measuredRow("Image bytes");
    expect(
      page,
      "the page's measured table has no image-fit row",
    ).toBeDefined();
    const pageEvidence = page?.[1] ?? "";
    expect(pageEvidence).toContain("image-fit");
    expect(
      [fill, contain, cover, natural].filter(
        (placement) => !pageEvidence.includes(placement),
      ),
    ).toEqual([]);
    expect(pageEvidence).toContain(`x=${cropStart}–${cropEnd}`);
    expect(pageEvidence).toContain("top-left corner");
    expect(page?.[2]).toContain("crops");
  });

  it("publishes the order a negative tab index gives, not a skip", () => {
    // The dock's keyboard row said a `tabIndex={-1}` control was "skipped by
    // the same traversal", which is only true forwards. `grid-focus-lifecycle`
    // measured a negative cell ordered **before** the zero-index stops: the app
    // can focus it, and its next Tab leaves to the control before the widget.
    // The ids are derived from the fixture and the probe's own assertion is
    // read, so neither document can teach a skip the window did not measure.
    const fixture = read("apps/playground/src/live/grid-focus.ts");
    const columns = Number(
      /export const GRID_COLUMNS = (\d+);/.exec(fixture)?.[1] ?? Number.NaN,
    );
    const rows = Number(
      /export const GRID_ROWS = (\d+);/.exec(fixture)?.[1] ?? Number.NaN,
    );
    expect(columns).toBeGreaterThan(1);
    expect(rows).toBeGreaterThan(1);
    expect(fixture).toContain("index === roving ? 0 : -1");

    const excluded = `gridfocus-r${rows - 1}c${columns - 1}`;
    const before = "grid-focus-before";
    const probe = read("apps/playground/src/live/scenarios.tsx");
    expect(probe).toContain("cell(2, 2)");
    expect(probe).toContain(
      "a negative tab index is ordered before the grid's stops, not removed from the chain",
    );

    const dock = rowFor("Dock keyboard navigation");
    expect(dock?.evidence).toContain("grid-focus-lifecycle");
    expect(dock?.evidence).toContain(excluded);
    expect(dock?.evidence).toContain(before);
    expect(dock?.evidence).toContain("orders it **before**");
    expect(dock?.evidence).not.toContain("skipped by the same traversal");
    expect(dock?.workaround).toContain("move focus out");

    const page = measuredRow("Dock keyboard navigation");
    expect(
      page,
      "the page's measured table has no dock keyboard row",
    ).toBeDefined();
    expect(page?.[1]).toContain("grid-focus-lifecycle");
    expect(page?.[1]).toContain("the zero stops");
    expect(page?.[1]).not.toContain("skipped by the same traversal");
    expect(page?.[2]).toContain("move focus out");
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

  it("records the code a paste fills, with the readouts the probe asserts", () => {
    // A one-time code arrives by paste, and the record's paste row could only
    // say the field's behaviour was unverified. `otp-paste-lifecycle` measured it
    // in a window: one multi-character `onChange` distributed forward from the
    // receiving cell. The readouts below are read out of the probe rather than
    // restated, so a probe that moves to two completions cannot leave the record
    // quoting the old one.
    const code = rowFor("Paste into a code field");
    expect(code?.verdict).toBe("supported, with limits");
    expect(code?.evidence).toContain("otp-paste-lifecycle");
    expect(code?.evidence).toContain("onChange");
    expect(code?.evidence).toContain("forward");
    expect(code?.workaround).toContain("OTPField");
    expect(code?.workaround).toContain("onComplete");

    const probe = read("apps/playground/src/live/otp-paste.ts");
    const length = Number(/OTP_PASTE_LENGTH = (\d+)/.exec(probe)?.[1] ?? 0);
    expect(length, "the probe no longer declares its cell count").toBe(6);
    expect(code?.evidence).toContain("first of six cells");
    expect(code?.evidence).toContain("nine-character");

    const steps = read("apps/playground/src/live/scenarios.tsx");
    const start = steps.indexOf("const otpPasteSteps");
    const scenario = steps.slice(start, steps.indexOf("\nconst ", start + 1));
    expect(scenario, "the probe's steps are not in scenarios.tsx").not.toBe("");

    // The three readouts the probe asserts: one edit and one completion for a
    // full paste, a second edit with no second completion over a full code, and
    // a third edit for the paste over the third cell. They are read out of the
    // probe's own assertions, so a probe that moves cannot leave the record
    // quoting the old number.
    expect(scenario).toMatch(/completes: 1,\s*edits: 1/);
    expect(scenario).toMatch(/completes: 1,\s*edits: 2/);
    expect(scenario).toContain("edits: 3");
    const readouts = ["completes=1", "edits=1", "edits=2", "edits=3"];
    const unprinted = readouts.filter(
      (readout) => !(code?.evidence ?? "").includes(readout),
    );
    expect(unprinted, "the record prints no readout the probe asserts").toEqual(
      [],
    );

    // A longer paste truncating is the half that reads the field's distribution
    // and not a text prop, so the record has to keep the truncation rule.
    expect(code?.evidence).toContain("truncates at six");
    expect(scenario).toContain("truncates to six cells");
  });

  it("publishes the pasted code on /docs/runtime", () => {
    const code = measuredRow("Pasted code in a field");
    expect(
      code,
      "the page's measured table has no pasted-code row",
    ).toBeDefined();
    expect(code?.[1]).toContain("otp-paste-lifecycle");
    expect(code?.[1]).toContain("completes=1 edits=1");
    expect(code?.[1]).toContain("edits=3");
    expect(code?.[2]).toContain("onComplete");
  });

  it("retires the unverified paste from the paste-event row", () => {
    // The row used to end "an `OTPField`'s paste is unverified", which a window
    // has since measured. The absence it records stays: there is still no
    // `onPaste`, and the field is still the honest route.
    const paste = rowFor("Paste event");
    expect(paste?.verdict).toBe("not supported");
    expect(paste?.workaround).not.toContain("unverified");
    expect(paste?.workaround).toContain("OTPField");
    expect(paste?.workaround).toContain("insert-at-selection");
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

  it("records the window selection event a probe published, with its two limits", () => {
    // `Text selection` proves the wash and `getSelectedText()`; neither tells the
    // app the reader picked something, so a selection-aware toolbar, an inspector
    // that follows the text or a "quote selection" action had no documented route.
    // `window-selection-lifecycle` measured the one the runtime publishes,
    // `render(<App/>, { onSelectionChange })`: a drag reports the run, a clear
    // reports again with no run, and a line that opted out reports nothing.
    const event = rowFor("Window selection event");
    expect(event?.verdict).toBe("supported, with limits");
    expect(event?.evidence).toContain("window-selection-lifecycle");
    expect(event?.evidence).toContain("onSelectionChange");
    expect(event?.evidence).toContain("getSelectedText");
    expect(event?.evidence).toContain("last=none");
    expect(event?.evidence).toContain("joined text only");
    expect(event?.workaround).toContain("empty change");
    expect(event?.workaround).toContain("root");
  });

  it("publishes the window selection event on /docs/runtime", () => {
    const event = measuredRow("Window selection event");
    expect(
      event,
      "the page's measured table has no window-selection row",
    ).toBeDefined();
    expect(event?.[1]).toContain("onSelectionChange");
    expect(event?.[1]).toContain("window-selection-lifecycle");
    expect(event?.[1]).toContain("last=none");
    expect(event?.[2]).toContain("empty change");
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

  it("records the terminal frame a pty painted, with the probes behind it", () => {
    // "Terminal rendering" was declared supported with an evidence column of
    // "—", so a plan could not tell a frame a terminal actually received from a
    // type saying one would. `terminal-render` and `terminal-input` decode the
    // kitty stream a 100x40 pty received: the frame is the grid, the page is the
    // app's own colour, a key repaints it and ctrl-c restores the terminal.
    const terminal = rowFor("Terminal rendering");
    expect(terminal?.verdict).toBe("supported, with limits");
    expect(terminal?.evidence).toContain("terminal-render");
    expect(terminal?.evidence).toContain("terminal-resize");
    expect(terminal?.evidence).toContain("terminal-pointer");
    expect(terminal?.evidence).toContain("terminal-input");
    expect(terminal?.evidence).toContain("4/4");

    // The printed frame size is arithmetic on the probe's own grid and cell, so
    // a changed cell cannot leave the record teaching the previous frame.
    const probe = read("apps/playground/src/terminal/run.ts");
    const grid = /TERMINAL_GRID = \{ columns: (\d+), rows: (\d+) \}/.exec(
      probe,
    );
    const resized = /RESIZED_GRID = \{ columns: (\d+), rows: (\d+) \}/.exec(
      probe,
    );
    const cell = /TERMINAL_CELL = \{ width: (\d+), height: (\d+) \}/.exec(
      probe,
    );
    const columns = Number(grid?.[1] ?? 0);
    const rows = Number(grid?.[2] ?? 0);
    const resizedColumns = Number(resized?.[1] ?? 0);
    const resizedRows = Number(resized?.[2] ?? 0);
    const cellWidth = Number(cell?.[1] ?? 0);
    const cellHeight = Number(cell?.[2] ?? 0);
    expect(
      [columns, rows, resizedColumns, resizedRows, cellWidth, cellHeight],
      "the terminal probe no longer declares the grids and cell the record prints",
    ).not.toContain(0);
    expect(terminal?.evidence).toContain(
      `${columns * cellWidth}×${rows * cellHeight}`,
    );
    expect(terminal?.evidence).toContain(`${columns}×${rows}-cell`);
    expect(terminal?.evidence).toContain(
      `${resizedColumns * cellWidth}×${resizedRows * cellHeight}`,
    );
    expect(terminal?.evidence).toContain(
      `${resizedColumns}×${resizedRows} grid`,
    );

    const asserted = [
      "the frame is the pty grid at one cell per character",
      "the app fills the frame with its terminal page",
      "the app reads isTerminal() as true",
      "a pointer press reaches the app",
      "the press repaints the ink, not the page",
      "the terminal's in-band resize repaints at the new grid",
      "the app fills the resized frame",
      "a key press repaints the page",
      "the run restores the terminal",
    ];
    expect(
      asserted.filter((line) => !probe.includes(line)),
      "the record quotes a check the terminal probe no longer asserts",
    ).toEqual([]);

    // The two limits a reader of the record has to be able to act on.
    expect(terminal?.workaround).toContain("kitty");
    expect(terminal?.workaround).toContain("host element");
    expect(terminal?.workaround).toContain("macOS-only");
    expect(terminal?.workaround).toContain("stty");
  });

  it("publishes the terminal frame on /docs/runtime", () => {
    const page = measuredRow("Terminal frame");
    expect(
      page,
      "the page's measured table has no terminal-frame row",
    ).toBeDefined();
    expect(page?.[1]).toContain("terminal-render");
    expect(page?.[1]).toContain("terminal-pointer");
    expect(page?.[1]).toContain("terminal-resize");
    expect(page?.[1]).toContain("terminal-input");
    expect(page?.[1]).toContain("99.78%");
    expect(page?.[1]).toContain("400×320");
    expect(page?.[2]).toContain("kitty or Ghostty");
    expect(page?.[2]).toContain("stty");
    expect(page?.[2]).toContain("host element");
  });

  it("records what paints a field's hint and its value, with the probe behind it", () => {
    // `nativeTextTheme` hands a host `text` and `textFaint`, and both the token
    // page and its snippet taught that following the seam alone paints a
    // readable field. A window measured the opposite: the hint is the runtime's
    // own grey and a value paints the element's `color`, so the seam's `text`
    // reaches `<code>`/`<diff>`/`<markdown>` and not an `<input>`. The row's
    // constants are read out of the probe, so a moved floor cannot leave the
    // record quoting the previous one.
    const ink = rowFor("Native text host ink");
    expect(ink?.verdict).toBe("supported, with limits");
    expect(ink?.evidence).toContain("field-ink");
    expect(ink?.evidence).toContain("`placeholder`");
    expect(ink?.evidence).toContain("inputForeground");
    expect(ink?.evidence).toContain("darker than its own fill");
    expect(ink?.workaround).toContain("inputForeground");
    expect(ink?.workaround).toContain("placeholder");

    const probe = read("apps/playground/src/live/field-ink.ts");
    const declared = (name: string): string => {
      const marker = `export const ${name} =`;
      const at = probe.indexOf(marker);
      if (at === -1) return "";
      const end = probe.indexOf(";", at);
      return probe
        .slice(at + marker.length, end === -1 ? undefined : end)
        .trim();
    };
    const number = (name: string): number =>
      Number(declared(name).replace(/[^\d.]/g, ""));

    expect(declared("RUNTIME_HINT_HEX")).toBe('"#8F8F8F"');
    const floor = number("INK_PEAK_FLOOR");
    const tolerance = number("INK_PEAK_TOLERANCE");
    expect(floor).toBeGreaterThan(0);
    expect(tolerance).toBeGreaterThan(0);
    expect(ink?.evidence).toContain(`(${floor})`);
    expect(ink?.evidence).toContain(`(${tolerance})`);
    expect(ink?.evidence).toContain("#8F8F8F");

    const page = measuredRow("Text input ink");
    expect(
      page,
      "the page's measured table has no text-input-ink row",
    ).toBeDefined();
    expect(page?.[1]).toContain("field-ink");
    expect(page?.[1]).toContain("#8F8F8F");
    expect(page?.[1]).toContain(`(${floor})`);
    expect(page?.[1]).toContain(`(${tolerance})`);
    expect(page?.[2]).toContain("inputForeground");
    expect(page?.[2]).toContain("placeholder");
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
      ["cmd-a", "a key chord the pasted-code probe pressed"],
      ["cmd-c", "a key chord the pasted-code probe pressed"],
      ["cmd-v", "a key chord the pasted-code probe pressed"],
      ["cmd-shift", "a chord the modifier-selection probe pressed"],
      ["cmd-home", "a chord the keyboard-scroll probe pressed"],
      ["flex-1", "a utility `@gpuixui/tw` compiles into three flex fields"],
      ["wrow-60", "a row marker the windowed list probe checked for"],
      ["row-alpha", "a row marker the reorder probe dragged"],
      ["row-delta", "a row marker the reorder probe dropped onto"],
      ["gridfocus-r2c2", "a cell id the roving-grid probe focused by hand"],
      ["grid-focus-before", "a control id the roving grid's next Tab reached"],
      [
        "movable-tab-bravo",
        "a tab id the movable-tab probe focuses after a move",
      ],
      [
        "grid-focus-after",
        "a control id a one-press exit from the grid reached",
      ],
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
    // announced toast on a runtime with no live region. The application menu is
    // the sixth: the typings expose `appName` and no way to add an item.
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

    const menu = rowFor("Application menu");
    expect(menu?.verdict).toBe("not supported");
    expect(menu?.evidence).toContain("app_menu::init");
    expect(menu?.evidence).toContain("appName");
    expect(menu?.evidence).toContain("⌘Q");
    expect(menu?.workaround).toContain("inside");

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

  it("records right-to-left layout as a missing input, held to the typings", () => {
    // Plan 435c's docs half cannot offer an RTL toggle for a runtime with no
    // direction: `StyleDesc` has no `direction` field, every edge is physical,
    // and `AnchoredProps` places a surface by a physical side. The row states
    // that absence and the one honest workaround instead of implying a mirrored
    // layout works.
    const typings = read("apps/docs/node_modules/@gpuix/native/dist/host.d.ts");
    expect(typings).not.toMatch(/^\s*(?:writing)?direction\?:/m);
    expect(typings).toContain("paddingLeft?: number;");
    expect(typings).toContain('side?: "top" | "right" | "bottom" | "left";');

    const rtl = rowFor("Right-to-left layout");
    expect(rtl?.verdict).toBe("not supported");
    expect(rtl?.evidence).toContain("`direction`");
    expect(rtl?.evidence).toContain("AnchoredProps");
    expect(rtl?.workaround).toContain("direction-aware helper");
    expect(rtl?.workaround).toContain("mirror");

    const page = typingsRow("Right-to-left layout");
    expect(page, "the page's typings table has no RTL row").toBeDefined();
    expect(page?.[1]).toContain("direction");
    expect(page?.[2]).toContain("helper");

    // The section no longer prints a count it cannot keep.
    expect(runtimePage).toContain("The rows below are");
    expect(runtimePage).not.toContain("These seven are");
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

    const menu = typingsRow("Application menu");
    expect(menu, "the page has no application-menu row").toBeDefined();
    expect(menu?.[1]).toContain("appName");
    expect(menu?.[1]).toContain("⌘C");
    expect(menu?.[2]).toContain("inside");
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

  it("leaves no row unverified now that both have an answer", () => {
    // The verdict vocabulary keeps `unverified` for a gap nothing can measure,
    // but no row uses it today: `window-backdrop` paints the option and the
    // typings prove reduced motion absent. A new `unverified` row is therefore a
    // deliberate change to this case, not something an edit can slip past.
    const unverified = rows
      .filter((row) => row.verdict === "unverified")
      .map((row) => row.label);
    expect(unverified).toEqual([]);

    const retired: ReadonlyArray<readonly [string, string]> = [
      ["Window backdrop", "supported, with limits"],
      ["Reduced-motion", "not supported"],
    ];
    const wrong = retired.flatMap(([label, verdict]) => {
      const row = rowFor(label);
      if (row === undefined) return [`no "${label}" row`];
      return row.verdict === verdict
        ? []
        : [`"${label}" reads "${row.verdict}", not "${verdict}"`];
    });
    expect(wrong).toEqual([]);
  });

  it("records the window backdrop a probe painted, with its two limits", () => {
    // The row said no probe paints a backdrop, so a workspace plan could not tell
    // a translucent window from an ignored option. `window-backdrop` painted all
    // three modes; the row has to carry what it measured and the two facts a
    // capture cannot show — the blur is composited behind the window, and one
    // window per process means the modes are separate runs.
    const backdrop = rowFor("Window backdrop");
    expect(backdrop?.verdict).toBe("supported, with limits");
    expect(backdrop?.evidence).toContain("window-backdrop");
    expect(backdrop?.evidence).toContain("alpha **255**");
    expect(backdrop?.evidence).toContain("alpha **0**");
    expect(backdrop?.evidence).toContain("byte-identical");
    expect(backdrop?.evidence).toContain(
      "A GPUI application already exists on this thread",
    );
    expect(backdrop?.evidence).toContain("rgba(109, 34, 22, 255)");
    expect(backdrop?.workaround).toContain("unpainted");
    expect(backdrop?.workaround).toContain("opaque");

    // The row prints the probe's own numbers, so the mode table cannot move
    // without the record moving with it.
    const probe = read("apps/playground/src/live/backdrop.ts");
    expect(probe).toContain('Match.when("opaque", () => 255)');
    expect(probe).toContain('Match.when("transparent", () => 0)');
    expect(probe).toContain('Match.when("blurred", () => 0)');

    const page = measuredRow("Window backdrop");
    expect(
      page,
      "the page's measured table has no window-backdrop row",
    ).toBeDefined();
    expect(page?.[1]).toContain("window-backdrop");
    expect(page?.[1]).toContain("**255**");
    expect(page?.[1]).toContain("byte-identical");
    expect(page?.[2]).toContain("unpainted");
  });

  it("records reduced motion as a policy the app supplies", () => {
    // The honest verdict is a measured absence, not an unrun probe: there is no
    // preference query to call, so the row must say so and name the flag the
    // library already takes. Both halves are read from sources — the installed
    // typings for the absence, `@gpuixui/motion` for the workaround.
    const reduced = rowFor("Reduced-motion");
    expect(reduced?.verdict).toBe("not supported");
    expect(reduced?.evidence).toContain("appearance");
    expect(reduced?.evidence).toContain("prefers");
    expect(reduced?.evidence).toContain("MotionValue.sample");
    expect(reduced?.evidence).toContain("reducedMotion");
    expect(reduced?.workaround).toContain("app owns the policy");

    const typings = read("apps/docs/node_modules/@gpuix/native/index.d.ts");
    expect(
      /appearance|prefers|reduc/i.test(typings),
      "the pinned typings now look like they carry a motion preference — re-measure the row",
    ).toBe(false);

    const motion = read("packages/motion/src/motion.ts");
    expect(motion).toContain(
      "sample(elapsedMs: number, reducedMotion = false)",
    );
    expect(read("packages/motion/src/react.ts")).toContain(
      "reducedMotion?: boolean",
    );

    const page = typingsRow("Reduced-motion preference");
    expect(page, "the page has no reduced-motion row").toBeDefined();
    expect(page?.[1]).toContain("appearance");
    expect(page?.[2]).toContain("MotionValue.sample");
    expect(page?.[2]).toContain("reducedMotion");
    expect(runtimePage).toContain("The rows below are");
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

  it("records the confirmation flow, with the readout the probe asserts", () => {
    // MISSION lists "dialog open/close/confirm" among the interactions to
    // verify, and the record published the open/close half (`dialog-lifecycle`)
    // but not the two actions that make a confirmation safe: `ConfirmDialog`
    // has no trigger, reports `onConfirm` and leaves the close to the caller, so
    // a plan for a destructive action had no measured contract to read. The
    // readouts are held to the probe's own source, so a fixture whose arithmetic
    // moves cannot leave the record teaching the old line.
    const probes = read("apps/playground/src/live/scenarios.tsx");
    const confirm = rowFor("Confirmation flow");
    expect(confirm?.verdict).toBe("supported, with limits");
    expect(confirm?.evidence).toContain("confirm-dialog-lifecycle");
    expect(confirm?.evidence).toContain("dialog-lifecycle");
    expect(confirm?.evidence).toContain("Cancel");
    expect(confirm?.evidence).toContain("reports **once**");
    expect(confirm?.workaround).toContain("onConfirm");

    const readouts = [
      "confirms=0 closes=1",
      "confirms=1 closes=2",
      "opens=4 confirms=1 closes=4",
    ];
    expect(
      readouts.filter((line) => !(confirm?.evidence ?? "").includes(line)),
      "the record does not print the readout the probe measured",
    ).toEqual([]);
    expect(
      readouts.filter((line) => !probes.includes(line)),
      "the record prints a readout the probe never asserts",
    ).toEqual([]);

    const page = measuredRow("Confirmation flow");
    expect(
      page,
      "the page's measured table has no confirmation row",
    ).toBeDefined();
    expect(page?.[1]).toContain("confirm-dialog-lifecycle");
    expect(page?.[1]).toContain("Cancel");
    expect(page?.[2]).toContain("onConfirm");
  });

  it("records the field validation flow, and what a submit leaves alone", () => {
    // The other half of MISSION's "input update/validation": `text-input`
    // measures the update, and `Field` never validates a keystroke — it paints
    // the `error` its caller hands it, so the schema runs at the submit
    // boundary. The record named neither the submit path nor the two things a
    // failed submit must leave alone (the value and the focus), so a validated
    // form had no measured contract either.
    const probes = read("apps/playground/src/live/scenarios.tsx");
    const validation = rowFor("Field validation flow");
    expect(validation?.verdict).toBe("supported, with limits");
    expect(validation?.evidence).toContain("validation-lifecycle");
    expect(validation?.evidence).toContain("onSubmit");
    expect(validation?.workaround).toContain("submit");

    const readouts = [
      "error=none applied=none submits=0",
      "applied=none submits=1",
      "error=none applied=design submits=2",
      "submits=3",
    ];
    expect(
      readouts.filter((line) => !(validation?.evidence ?? "").includes(line)),
      "the record does not print the readout the probe measured",
    ).toEqual([]);
    expect(
      readouts.filter((line) => !probes.includes(line)),
      "the record prints a readout the probe never asserts",
    ).toEqual([]);

    const page = measuredRow("Validation flow");
    expect(
      page,
      "the page's measured table has no validation row",
    ).toBeDefined();
    expect(page?.[1]).toContain("validation-lifecycle");
    expect(page?.[1]).toContain("in place of");
    expect(page?.[1]).toContain("focus");
    expect(page?.[2]).toContain("onSubmit");
  });

  it("records the edit a controlled field cannot take back, with the suite behind it", () => {
    // A controlled field re-applies its `value` only when that value changes,
    // so a clamp or a filter that removes the character just typed paints text
    // the owner's value does not contain. The fields ship no `maxLength` for
    // this reason, and a plan reading only the validation row would assume a
    // keystroke can be refused.
    const suite = read("packages/primitives/runtime/fields.runtime.test.tsx");
    const at = suite.indexOf("cannot take back an edit");
    expect(at, "the field-edit case left the runtime suite").toBeGreaterThan(
      -1,
    );
    const measured = suite.slice(at);
    const clamp =
      /setText\(next\.slice\(0, (\d+)\)\)/.exec(measured)?.[1] ?? "";
    expect(clamp).toBe("5");
    const reported = [
      ...(/toStrictEqual\(\[([\s\S]*?)\]\)/.exec(measured)?.[1] ?? "").matchAll(
        /"([a-g]+)"/g,
      ),
    ].map((match) => match[1] ?? "");
    expect(reported).toEqual([
      "a",
      "ab",
      "abc",
      "abcd",
      "abcde",
      "abcdef",
      "abcdefg",
    ]);

    const edit = rowFor("Field edit");
    expect(edit?.verdict).toBe("supported, with limits");
    expect(edit?.evidence).toContain("only when it changes");
    expect(edit?.evidence).toContain(`next.slice(0, ${clamp})`);
    expect(edit?.evidence).toContain("`abcde`");
    expect(edit?.evidence).toContain("`abcdef`");
    expect(edit?.evidence).toContain("`abcdefg`");
    expect(edit?.evidence).toContain("cannot take back an edit");
    expect(edit?.workaround).toContain("boundary");

    const page = measuredRow("Field edit");
    expect(
      page,
      "the page's measured table has no field-edit row",
    ).toBeDefined();
    expect(page?.[1]).toContain("only when that value changes");
    expect(page?.[1]).toContain("abcdefg");
    expect(page?.[2]).toContain("boundary");
  });

  it("records the clamp the shipped Text paints without lineClamp", () => {
    // The window measured `lineClamp: 2` painting all five lines — and it read
    // the shipped `Text`'s own `clamp` prop among the counter-examples. That
    // was the component's defect, not the route: `clamp` now resolves a
    // definite box (the role's leading times the line count, with a hidden
    // overflow) and never sets `lineClamp`, and the runtime suite holds it. A
    // record still naming the component as the broken case sends the next plan
    // to reimplement a fix that already landed. The raw declaration's absence
    // stands, so the row keeps both halves.
    const style = read("packages/primitives/src/core/style.ts");
    const clamp = style.slice(style.indexOf("if (spec.clamp !== undefined)"));
    expect(clamp).toContain(
      "style.height = role.lineHeight * clampLines(spec.clamp);",
    );
    expect(clamp).toContain('style.overflow = "hidden";');
    expect(clamp).not.toContain("style.lineClamp");

    const suite = read("packages/primitives/runtime/layout.runtime.test.tsx");
    expect(suite).toContain("clamps a Text after its own line count");
    expect(suite).toContain("clamps each node to its own line count");

    const row = rowFor("Text truncation");
    expect(row?.verdict).toBe("supported, with limits");
    expect(row?.evidence).toContain("**`lineClamp` paints nothing**");
    expect(row?.evidence).toContain("no longer sets `lineClamp`");
    expect(row?.evidence).toContain("the role's leading times the line count");
    expect(row?.evidence).toContain("layout.runtime.test.tsx");
    expect(row?.evidence).not.toContain(
      "through the shipped `Text`'s own `clamp` prop",
    );
    expect(row?.workaround).toContain("`Text clamp`");
    expect(row?.workaround).toContain("lines × lineHeight");
  });

  it("holds the truncation row to the checks the probe asserts", () => {
    // The row printed 29 checks and ended on "the window probe's assertion
    // still describes the pre-fix component", which stopped being true when the
    // playground's probe grew `the shipped Text's clamp prop paints the two
    // lines`. A record that lags its probe in count *or* in verdict sends the
    // next plan to re-measure a fix that landed, so both are read from the
    // probe: the count from its own assertion sites, the verdict from the
    // assertion text.
    const steps = read("apps/playground/src/live/scenarios.tsx");
    const start = steps.indexOf("const truncationSteps");
    const body = steps.slice(
      start,
      steps.indexOf("const VerticalSliderProbe", start),
    );
    expect(start).toBeGreaterThan(0);
    const asserted = body.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(20);
    expect(body).toContain(
      "the shipped Text's clamp prop paints the two lines",
    );

    const row = rowFor("Text truncation");
    expect(row?.evidence).toContain(`${asserted} checks`);
    expect(row?.evidence).not.toContain("29 checks");
    expect(row?.evidence).not.toContain(
      "still describes the pre-fix component",
    );
    expect(row?.evidence).toContain("paints **two** lines");

    // The README prints the same count, so a probe that grows an assertion
    // fails here until both records move together.
    const readme = read("apps/playground/README.md");
    const section = readme.slice(readme.indexOf("### `text-truncation`"));
    const printed = Number(
      /(\d+) checks, `--only text-truncation`/.exec(section)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(asserted);
  });

  it("publishes the measured gaps on /docs/runtime", () => {
    expect(runtimePage).toContain("data-grid-fixed-header");
    expect(runtimePage).toContain("editor-surface");
    expect(runtimePage).toContain("tooltip-lifecycle");
    expect(runtimePage).toContain("tabs-lifecycle");
    expect(runtimePage).toContain("scroll-lifecycle");
    expect(runtimePage).toContain("nested-scroll-lifecycle");
    expect(runtimePage).toContain("pointer-capture");
    expect(runtimePage).toContain("content-surfaces");
    expect(runtimePage).toContain("selection-lifecycle");
    expect(runtimePage).toContain("clipboard-lifecycle");
    expect(runtimePage).toContain("otp-paste-lifecycle");
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
    expect(runtimePage).toContain("loading-row-correction");
    expect(runtimePage).toContain("window-resize-reflow");
    expect(runtimePage).toContain("drag-reorder");
    expect(runtimePage).toContain("table-lifecycle");
    expect(runtimePage).toContain("frozen-column-lifecycle");
    expect(runtimePage).toContain("dock-focus-lifecycle");
    expect(runtimePage).toContain("header-menu-lifecycle");
    expect(runtimePage).toContain("window-backdrop");
    expect(runtimePage).toContain("chart-raster");
    expect(runtimePage).toContain("window-chrome");
    expect(runtimePage).toContain("confirm-dialog-lifecycle");
    expect(runtimePage).toContain("validation-lifecycle");
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

  it("records the wheel every scrollable ancestor takes", () => {
    // A dock pane's list sits inside the workspace's scroll root, and the
    // routing question — does the inner scroller keep the wheel, does the outer
    // one wait for its end — was answered nowhere, so a dock had no rule for the
    // outer layout. `nested-scroll-lifecycle` measured that one wheel moves
    // **every** scrollable ancestor by the same delta, that each clamps against
    // its own content, and that the page's `onScroll` hears a wheel aimed inside
    // the list. The host props publish no wheel handler, so no pane can guard.
    const nested = rowFor("Nested scrollers");
    expect(nested?.verdict).toBe("supported, with limits");
    expect(nested?.evidence).toContain("nested-scroll-lifecycle");
    expect(nested?.evidence).toContain("-100");
    expect(nested?.evidence).toContain("-340");
    expect(nested?.evidence).toContain("-360");
    expect(nested?.evidence).toContain("events=3");
    expect(nested?.evidence).toContain("<virtual-list>");
    expect(nested?.evidence).toContain("preventDefault");
    expect(nested?.workaround).toContain("non-scrolling");
    expect(nested?.workaround).toContain("onScrollChange");
  });

  it("publishes the nested scroller rule on /docs/runtime", () => {
    // The page is read before a dock is designed, so it has to carry both the
    // measurement and the two rules a reader acts on: keep the workspace out of
    // the wheel's path, and read each scroller's own offset because an
    // ancestor's `onScroll` cannot tell which one moved.
    const nested = measuredRow("Nested scrollers");
    expect(
      nested,
      "the page's measured table has no nested-scroller row",
    ).toBeDefined();
    expect(nested?.[1]).toContain("nested-scroll-lifecycle");
    expect(nested?.[1]).toContain("every scrollable ancestor");
    expect(nested?.[1]).toContain("<virtual-list>");
    expect(nested?.[2]).toContain("onScrollChange");
    expect(nested?.[2]).toContain("non-scrolling");
  });

  it("records the keyboard a scroll region answers, in a window's delivery path", () => {
    // The primitive's page and its runtime suite taught the arrows,
    // PageUp/PageDown, Home and End from `runtime.keyDown(elementId, …)` — a
    // verb that names the element, which a window does not have. A window
    // delivers a key to the **focused** element and the viewport's handler
    // stands down unless the focus is its own, so the traversal is the half the
    // offscreen suite cannot prove. The geometry is the fixture's own, so the
    // record cannot print a stale clamp.
    const fixture = read("apps/playground/src/live/keyboard-scroll.ts");
    const literal = (name: string): number => {
      const found = new RegExp(`export const ${name} = (\\d+);`).exec(
        fixture,
      )?.[1];
      expect(
        found,
        `the fixture's ${name} is no longer a literal`,
      ).toBeDefined();
      return Number(found ?? NaN);
    };
    const box = (name: string): { width: number; height: number } => {
      const found = new RegExp(
        `export const ${name} = \\{ width: (\\d+), height: (\\d+) \\} as const;`,
      ).exec(fixture);
      expect(
        found,
        `the fixture's ${name} is no longer a literal`,
      ).not.toBeNull();
      return {
        width: Number(found?.[1] ?? NaN),
        height: Number(found?.[2] ?? NaN),
      };
    };

    const vertical = box("VERTICAL_VIEWPORT");
    const horizontal = box("HORIZONTAL_VIEWPORT");
    const line = themes.dark.density.rowHeight;
    const verticalEnd =
      literal("VERTICAL_ROWS") * literal("VERTICAL_ROW_HEIGHT") +
      literal("FIELD_SLOT") -
      vertical.height;
    const horizontalEnd =
      literal("HORIZONTAL_COLUMNS") * literal("HORIZONTAL_COLUMN_WIDTH") -
      horizontal.width;
    expect(verticalEnd).toBeGreaterThan(line);
    expect(horizontalEnd).toBeGreaterThan(line);

    const keyboard = rowFor("Keyboard scrolling");
    expect(keyboard?.verdict).toBe("supported");
    expect(keyboard?.evidence).toContain("keyboard-scroll-lifecycle");
    expect(keyboard?.evidence).toContain("getFocusedElementId");
    expect(keyboard?.evidence).toContain("focusable={false}");
    // A line is the theme's row, a page is the viewport, and the third page
    // clamps at the content's end. The two geometry markers are the row's own
    // statements of the end, so a duplicate number cannot stand in for them.
    expect(keyboard?.evidence).toContain(`end is \`-${verticalEnd}\``);
    expect(keyboard?.evidence).toContain(`end \`-${horizontalEnd}\``);
    expect(keyboard?.evidence).toContain(`-${line}`);
    expect(keyboard?.evidence).toContain(`-${line + vertical.height}`);
    expect(keyboard?.evidence).toContain(`-${vertical.height}`);
    expect(keyboard?.evidence).toContain(`-${verticalEnd}`);
    expect(keyboard?.evidence).toContain(`-${line + horizontal.width}`);
    expect(keyboard?.evidence).toContain(`-${horizontalEnd}`);

    const page = measuredRow("Keyboard scrolling");
    expect(
      page,
      "the page's measured table has no keyboard-scrolling row",
    ).toBeDefined();
    expect(page?.[1]).toContain("keyboard-scroll-lifecycle");
    expect(page?.[1]).toContain("getFocusedElementId");
    expect(page?.[1]).toContain(`-${line + vertical.height}`);
    expect(page?.[1]).toContain(`-${verticalEnd}`);
    expect(page?.[1]).toContain(`-${horizontalEnd}`);
    expect(page?.[2]).toContain("density.rowHeight");
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

  it("records the dashed edge the primitives expose, not the one it passes through", () => {
    // The row said `@gpuixui/tw` compiles no dashed utility "so these pass
    // through `style` (its own `box.mdx` says so)". The tw half is still true
    // — the package compiles no dashed class — but the primitives' `Box` takes
    // `borderStyle="dashed"` (with `paddingX`/`paddingY` for the two axes) as
    // typed props, and its own page documents them. So a dashed edge was no
    // longer an API gap, and the record sent a reader to a page that says the
    // opposite.
    const row = rowFor("Per-corner radii");
    expect(row?.evidence).toContain(
      "@gpuixui/tw` compiles no dashed, per-corner or per-side utility",
    );
    expect(row?.evidence).toContain(
      "the per-corner radii and the per-side widths pass through `style`",
    );
    expect(row?.evidence).toContain('borderStyle="dashed"');
    expect(row?.evidence).toContain("`paddingX`/`paddingY`");
    // The retracted advice: a dashed edge is not a `style`-only capability,
    // and the primitives' own page no longer says it is.
    expect(row?.evidence).not.toContain("(its own `box.mdx` says so)");
    expect(row?.evidence).not.toContain("so these pass through `style`");

    // The record's claim holds only while the package publishes it.
    const box = read("packages/primitives/src/components/Box.tsx");
    const layout = read("packages/primitives/src/core/style.ts");
    const recipe = read("packages/primitives/src/recipe/index.ts");
    const registry = read("packages/primitives/src/recipe/registry.ts");
    const boxPage = read("packages/primitives/docs/box.mdx");
    expect(box).toContain("a border can be dashed");
    expect(layout).toContain("readonly borderStyle?: BorderStyle;");
    expect(recipe).toContain('spec.borderStyle === "dashed"');
    expect(registry).toContain(
      '"border-dashed": () => ({ borderStyle: "dashed" })',
    );
    expect(boxPage).toContain("The dashed edge is the runtime's `borderStyle`");
    expect(boxPage).toContain("`dashed` is the one alternate it paints.");

    // And the tw half the record keeps: the package compiles no dashed class.
    expect(read("packages/tw/src/utilities.ts")).not.toContain("dashed");
    expect(read("packages/tw/src/registry.ts")).not.toContain("dashed");
  });
});
