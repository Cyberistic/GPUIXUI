import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sidebarPages } from "./sidebar-pages.test-util";

/**
 * The composition pages.
 *
 * MISSION.md names Layouts, Workspace and Data display as information-
 * architecture lanes, and the component inventory is the only honest source for
 * what each lane contains. A page must therefore mount the generated lane table
 * and sit in the sidebar; a hand-written copy of the inventory is what drifts.
 */

const dir = new URL("../../content/docs/", import.meta.url);

const read = (name: string): string => readFileSync(new URL(name, dir), "utf8");

interface LanePage {
  readonly file: string;
  readonly lane: string;
  readonly title: string;
}

const pages: ReadonlyArray<LanePage> = [
  { file: "layouts.mdx", lane: "layout", title: "Layouts" },
  { file: "workspace.mdx", lane: "workspace", title: "Workspace" },
  { file: "data-display.mdx", lane: "data-display", title: "Data display" },
];

/** The `pages` array of the root `meta.json`. */
const sidebar = sidebarPages(new URL("../../", import.meta.url));

describe("the composition pages", () => {
  it("exist with a title and a one-sentence description", () => {
    const incomplete = pages.filter(({ file, title }) => {
      const body = read(file);
      return !(
        body.startsWith("---\n") &&
        body.includes(`title: ${title}\n`) &&
        /^description: .+$/m.test(body)
      );
    });

    expect(incomplete.map(({ file }) => file)).toEqual([]);
  });

  it("render their rows from the inventory instead of restating them", () => {
    const missing = pages
      .filter(
        ({ file, lane }) =>
          !read(file).includes(`<LaneTable lane="${lane}" />`),
      )
      .map(({ file }) => file);

    expect(missing).toEqual([]);
  });

  it("name the inventory as the source of their status", () => {
    const silent = pages
      .filter(({ file }) => !read(file).includes("COMPONENTS.md"))
      .map(({ file }) => file);

    expect(silent).toEqual([]);
  });

  it("sit in the sidebar, after the component sections", () => {
    const positions = pages.map(({ file }) => {
      const slug = file.replace(/\.mdx$/, "");
      return sidebar.indexOf(slug);
    });

    expect(positions.every((position) => position > 0)).toBe(true);
    expect(Math.min(...positions)).toBeGreaterThan(
      sidebar.indexOf("components"),
    );
  });

  it("cross-link the lane they hand off to", () => {
    const orphans = pages
      .filter(({ file }) => {
        const links = read(file).match(/\]\(\/docs\/[a-z-]+\)/g) ?? [];
        return links.length < 2;
      })
      .map(({ file }) => file);

    expect(orphans).toEqual([]);
  });
});

/**
 * The data page is the one lane whose prose makes a claim about what the
 * runtime can draw, and it drifted: it called `<canvas>` "documented as planned
 * and unverified" and told a reader a chart was a gap "until a native drawing
 * surface is verified", long after `content-surfaces` had measured the surface.
 * The capability record is the source; the page has to agree with it.
 */

const record = readFileSync(
  new URL("../../../../docs/gpuix-capabilities.md", import.meta.url),
  "utf8",
);

/** The row of a table whose first cell is exactly `name`. */
const rowFor = (table: string, name: string): string => {
  const row = table.split("\n").find((line) => line.startsWith(`| ${name} |`));
  if (!row) throw new Error(`no row named ${name}`);
  return row;
};

describe("the data-display page's drawing claims", () => {
  const dataPage = read("data-display.mdx");
  const charts = rowFor(dataPage, "Charts");

  it("states the measured surface, not a plan", () => {
    expect(rowFor(record, "Inline SVG painting")).toContain(
      "supported, with limits",
    );
    expect(charts).toContain("one tint");
    expect(charts).toContain("blank");
    expect(charts).not.toContain("unverified");
    expect(charts).not.toContain("planned");
  });

  it("hands the reader the measured workaround", () => {
    expect(charts).toContain("stacked");
    expect(charts).toContain("layout effect");

    // The two facts the workaround rests on are the record's, not the page's.
    expect(rowFor(record, "Canvas drawing")).toContain("paints nothing");
    expect(rowFor(record, "Image painting")).toContain("layout effect");
  });

  it("names the two routes a multi-colour plot measured", () => {
    // The row sent a chart to "one stacked `<svg>` per colour" and a pixel
    // buffer, while `chart-raster` measured the two routes that actually carry a
    // palette: a buffer keeps each pixel's own colour inside one element, and
    // `setImage` on SVG bytes keeps every `fill` — which the stacked `<svg>`
    // route cannot, because each element is a single tint. A planner reading
    // only the lane page would build the weaker shape.
    const chart = rowFor(record, "Raster and vector chart surfaces");

    expect(chart).toContain("supported");
    expect(chart).toContain("chart-raster");
    expect(charts).toContain("setImagePixels");
    expect(charts).toContain("setImage");
    expect(charts).toContain("bytes");
    expect(charts).toContain("translucent");
  });

  it("does not send a chart to a surface that does not exist", () => {
    expect(dataPage).not.toContain(
      "until a native drawing surface is verified",
    );
  });

  it("keeps a fixed header out of a scroller it cannot stick to", () => {
    const sticky = rowFor(record, "Sticky positioning");

    expect(sticky).toContain("not supported");
    expect(sticky).toContain("data-grid-fixed-header");
    expect(dataPage).toContain("sibling, not a sticky row");
    expect(dataPage).toContain("outside the row scroller");
    expect(dataPage).toContain("one horizontal scroller");
  });

  it("holds a virtualized reveal to the index-addressed rule a window measured", () => {
    // The page told a table to virtualize through `<virtual-list>` and stopped
    // there. A tree's "reveal this path" action and a virtualized table's
    // pagination are the two places `virtual-tree-lifecycle` measured a trap:
    // `scrollToItem` reveals an unmounted row and fires no `onVisibleRange`,
    // and the report describes the child list at the splice.
    const virtual = rowFor(record, "Virtualized list");

    expect(virtual).toContain("supported, with limits");
    expect(virtual).toContain("virtual-tree-lifecycle");
    expect(virtual).toContain("scrollToItem");
    expect(virtual).toContain("onVisibleRange");
    expect(dataPage).toContain("scrollToItem");
    expect(dataPage).toContain("onVisibleRange");
    expect(dataPage).toContain("virtual-tree-lifecycle");
    expect(dataPage).toContain("painted rows");
  });

  it("teaches the filter rules a window measured", () => {
    // Tier 3's filtering control is a field above the rows, so what a grid owes
    // is the machinery around it — and `table-filter-lifecycle` measured all
    // four decisions: a selection that follows its record and is cleared when
    // it leaves the set, the field's text session, a new set at the top, and an
    // arrow step through the filtered order. A planner reading only the sort
    // and selection rules would leave a hidden selection live.
    const filter = rowFor(record, "Filtering controls");

    expect(filter).toContain("table-filter-lifecycle");
    expect(filter).toContain("scrollOffset");
    expect(filter).toContain("record");
    expect(dataPage).toContain("table-filter-lifecycle");
    expect(dataPage).toContain("scrollOffset");
    // The two rules the page must not soften: the selection is keyed by record,
    // and the step walks the filtered array rather than the numeric neighbour.
    expect(dataPage).toContain("by **record**");
    expect(dataPage).toContain("filtered array");
  });

  it("teaches a frozen column as two mirrored scrollers", () => {
    // The page told a table that a fixed header is a sibling, and stopped. A
    // frozen column is the same rule on the other axis, and
    // `data-grid-frozen-column` measured it: two panes, mirrored offsets, one
    // shared row, and the horizontal pan on the data pane alone.
    const frozen = rowFor(record, "Frozen column");

    expect(frozen).toContain("data-grid-frozen-column");
    expect(frozen).toContain("onScrollChange");
    expect(dataPage).toContain("frozen column");
    expect(dataPage).toContain("data-grid-frozen-column");
    expect(dataPage).toContain("onScrollChange");
    expect(dataPage).toContain("ref");
    // The window measured the consequence the arithmetic could not: the mirror
    // lands in the same frame, because `scrollTo` paints synchronously.
    expect(frozen).toContain("frozen-column-lifecycle");
    expect(frozen).toContain("same frame");
    expect(dataPage).toContain("frozen-column-lifecycle");
    expect(dataPage).toContain("same frame");
  });

  it("keeps a table's scroller out of its page's wheel path", () => {
    // The page taught a table its header, its frozen column and its
    // virtualization, and never said where the scroll of the table itself ends
    // and the page's begins. `nested-scroll-lifecycle` measured that a wheel
    // moves every scrollable ancestor by the same delta and that no pane can
    // guard, so a table inside a scrolling page moves with it.
    const nested = rowFor(record, "Nested scrollers");

    expect(nested).toContain("nested-scroll-lifecycle");
    expect(nested).toContain("preventDefault");
    expect(dataPage).toContain("nested-scroll-lifecycle");
    expect(dataPage).toContain("A table's pane owns the wheel, not the page");
    expect(dataPage).toContain("onScrollChange");
  });

  it("teaches the sort and selection a window measured, and the press its centre decides", () => {
    // MISSION names table sort/selection among the critical interactions, and
    // the page described them as an intention ("a set of row ids") with no
    // measurement behind them. `table-lifecycle` measured the shape a table must
    // use, including the one constraint that silently breaks a sortable header:
    // a press is aimed at the element's painted centre, so a clipped one sorts
    // nothing.
    const table = rowFor(record, "Table sort and selection");

    expect(table).toContain("supported, with limits");
    expect(table).toContain("table-lifecycle");
    expect(table).toContain("centre");
    expect(dataPage).toContain("table-lifecycle");
    expect(dataPage).toContain("holds the focus");
    expect(dataPage).toContain("survives the sort");
    expect(dataPage).toContain("painted **centre**");

    // The chord a desktop reader selects with, and the anchor it moves or keeps,
    // is the same table's second selection rule: a plan reading only the sort
    // would build a shift range from the wrong row.
    expect(dataPage).toContain("modifier-select-lifecycle");
    expect(dataPage).toContain("selected=3,4,5,6");
    expect(dataPage).toContain("moves** the anchor");
    expect(dataPage).toContain("click_count: 1");
  });

  it("re-anchors a paginated list whose loading void is the anchor", () => {
    // The page taught a table how to virtualize and how to hold a header, and
    // said nothing about a page arriving into a list whose top row is the
    // loading void — the case a message scroller or a log viewer has, where the
    // runtime anchors on the void and the splice replaces the reader's screen.
    // `loading-row-correction` measured both edges and the guard; the page has
    // to carry the rule where a table is designed.
    const loading = rowFor(record, "Loading-row restore");

    expect(loading).toContain("supported, with limits");
    expect(loading).toContain("loading-row-correction");
    expect(loading).toContain("getListScrollTop");
    expect(loading).toContain("flushSync");
    expect(dataPage).toContain("loading-row-correction");
    expect(dataPage).toContain("getListScrollTop");
    expect(dataPage).toContain("at-end sentinel");
    expect(dataPage).toContain("flushSync");
  });

  it("teaches the windowed mode a large table needs, and its two rules", () => {
    // The page said a virtualized table is "a different composition" and left
    // it there, so a table of 100 000 rows had nothing telling it which mode to
    // use or what that mode costs. `virtual-list-windowed` measured the
    // `itemCount` mode and the two rules: the range event is one gesture behind
    // the paint, and a reveal has to move the app's window before it scrolls.
    const virtual = rowFor(record, "Virtualized list");

    expect(virtual).toContain("itemCount");
    expect(virtual).toContain("virtual-list-windowed");
    expect(dataPage).toContain("itemCount");
    expect(dataPage).toContain("windowStart");
    expect(dataPage).toContain("virtual-list-windowed");
    expect(dataPage).toContain("overdraw");
    expect(dataPage).toContain("one gesture behind");
    // The two rows that denied the children form are the same retracted claim as
    // the record's "takes an item count": `<virtual-list>` has both modes.
    expect(dataPage).not.toContain("a list is not virtualized");
    expect(dataPage).not.toContain(
      "takes an item count, not compound children",
    );
  });

  it("holds a find bar to the match offset a virtualized document needs", () => {
    // The page taught a table its window, its reveal and its pagination, and
    // nothing about searching it. A find bar cannot count rows: only the
    // mounted rows wash, so `matchIndexOffset` is a **match** count above the
    // window, and the probe measured the row index, an off-by-one and a
    // negative offset each marking the wrong thing.
    const find = rowFor(record, "Find in a virtualized document");

    expect(find).toContain("supported, with limits");
    expect(find).toContain("search-virtual-document");
    expect(find).toContain("matchIndexOffset");
    expect(dataPage).toContain("matchIndexOffset");
    expect(dataPage).toContain("search-virtual-document");
    expect(dataPage).toContain("findRanges");
    expect(dataPage).toContain("row index");
  });

  it("teaches a column menu's consequences, and the clamp the renderer owns", () => {
    // The page taught sort, filter and freeze and said nothing about the column
    // list a header menu rewrites: hiding or moving a column is app state whose
    // geometry the runtime still enforces. `table-columns-lifecycle` measured
    // the content and per-column shifts, the press on the column that moved
    // into the gap, and the renderer's own clamp when a hide shrinks a panned
    // grid — so a table plan does not compute it with a stale offset.
    expect(dataPage).toContain("table-columns-lifecycle");
    expect(dataPage).toContain("A column menu is app state");
    expect(dataPage).toContain("690");
    expect(dataPage).toContain("610");
    expect(dataPage).toContain("-90");
    expect(dataPage).toContain("clamp");
    expect(dataPage).toContain("onScrollChange");
    expect(dataPage).toContain("no `scrollTo`");
  });

  it("tells a selection toolbar when the reader's selection empties", () => {
    // The page taught a table how a row is selected and nothing about the
    // window-level event a selection toolbar, an inspector or a "quote the
    // selection" action needs. `window-selection-lifecycle` measured the one
    // route the runtime publishes — `render(<App/>, { onSelectionChange })` —
    // and that an empty change is delivered rather than left to a timeout.
    const event = rowFor(record, "Window selection event");

    expect(event).toContain("supported, with limits");
    expect(event).toContain("window-selection-lifecycle");
    expect(event).toContain("last=none");
    expect(dataPage).toContain("window-selection-lifecycle");
    expect(dataPage).toContain("onSelectionChange");
    expect(dataPage).toContain("hides on the empty");
    expect(dataPage).toContain("instead of timing out");
    expect(dataPage).toContain("joined text only");
  });

  it("teaches a property panel as one object read four ways", () => {
    // Tier 3's property panels, key-value displays and statistic cards are
    // composition, and the page said only that a key/value panel is a
    // two-column grid. `inspector-lifecycle` measured the composition: one
    // object in four views, a table that scans down, a toolbar row and an
    // inspector that scrolls on its own.
    const inspector = rowFor(record, "Property inspector");

    expect(inspector).toContain("inspector-lifecycle");
    expect(inspector).toContain("9600");
    expect(inspector).toContain("19200");
    expect(dataPage).toContain(
      "A property panel is one object, read four ways",
    );
    expect(dataPage).toContain("inspector-lifecycle");
    expect(dataPage).toContain("6px");
    expect(dataPage).toContain("649");
    expect(dataPage).toContain("641");
    expect(dataPage).toContain("platform text session");
    expect(dataPage).toContain("owns its `overflow`");
    expect(dataPage).toContain("**not** a form");
  });
});

describe("the layouts page's direction claim", () => {
  const layouts = read("layouts.mdx");

  it("hands an RTL layout to an app-level helper, as the typings require", () => {
    // Plan 435c's docs half cannot be a toggle for a runtime with no direction.
    // The page said nothing about it, so a layout plan could mirror a tree by
    // hand and assume the primitives followed.
    const rtl = rowFor(record, "Right-to-left layout");

    expect(rtl).toContain("not supported");
    expect(rtl).toContain("`direction`");
    expect(rtl).toContain("AnchoredProps");
    expect(layouts).toContain("No direction input");
    expect(layouts).toContain("paddingLeft");
    expect(layouts).toContain("direction-aware helper");
  });
});

/**
 * The workspace page denied pointer capture and called every terminal surface
 * unverified. Both were measured since: capture exists for an element that
 * listens to both drag events, and the whole app renders into a terminal while
 * hosting a PTY inside a window still does not.
 */

describe("the workspace page's pointer and terminal claims", () => {
  const workspace = read("workspace.mdx");

  it("states the capture rule instead of denying capture", () => {
    const capture = rowFor(record, "Pointer capture");

    expect(capture).toContain("supported, with limits");
    expect(capture).toContain("onMouseDown");
    expect(capture).toContain("onMouseMove");
    expect(workspace).not.toContain("no pointer capture");
    expect(workspace).toContain("`onMouseDown`");
    expect(workspace).toContain("`onMouseMove`");
  });

  it("teaches the keyboard order a dock carries, as the window measured it", () => {
    // Tier 4's Keyboard navigation row calls the order "ours", and the page said
    // nothing about it. `dock-focus-lifecycle` measured one stop per rail, the
    // closed pane whose unguarded control keeps its stop, a rail step that must
    // move real focus, and a field that owns its arrows — none of it a runtime
    // feature, all of it app code a dock plan has to write.
    const dock = rowFor(record, "Dock keyboard navigation");

    expect(dock).toContain("dock-focus-lifecycle");
    expect(dock).toContain("12px");
    expect(dock).toContain("renderer.focusElement");
    expect(workspace).toContain("dock-focus-lifecycle");
    expect(workspace).toContain("One stop per rail");
    expect(workspace).toContain("tabIndex={-1}");
    expect(workspace).toContain("renderer.focusElement");
    expect(workspace).toContain("owns its arrows");
  });

  it("teaches the property inspector as a pane a window composed", () => {
    // Tier 4's inspector panels and property editors were "composition" with no
    // window behind them, so a dock plan had no rule for the pane that scrolls
    // beside what it edits. `inspector-lifecycle` measured exactly that, and the
    // page and the record have to print the same numbers.
    const inspector = rowFor(record, "Property inspector");
    expect(inspector).toContain("inspector-lifecycle");
    expect(inspector).toContain("owns its `overflow`");

    expect(workspace).toContain("The inspector is a pane, not a page");
    expect(workspace).toContain("inspector-lifecycle");
    expect(workspace).toContain("−200");
    expect(workspace).toContain("6px");
    expect(workspace).toContain("platform text session");
    // The two saves a dock owns: the arrangement and the object.
    expect(workspace).toContain("persists a **pane**");
    expect(workspace).not.toContain("composition with no window");
  });

  it("separates rendering into a terminal from hosting one", () => {
    // The row called a PTY inside a window "unverified" while the typings have
    // no terminal host element at all, and it had no measurement of the frame a
    // terminal does receive. Both halves now come from the record: the row the
    // pty probes measured, and the absence an embedded terminal rests on.
    const terminal = rowFor(record, "Terminal rendering");
    expect(terminal).toContain("supported");
    expect(terminal).toContain("terminal-render");
    expect(terminal).toContain("host element");

    expect(workspace).toContain("terminal: true");
    expect(workspace).toContain("hosts a PTY");
    expect(workspace).not.toContain("No terminal host element");
    expect(workspace).toContain("measured-in-a-window");
    expect(workspace).toContain("no PTY host element");
    expect(workspace).not.toContain("has no host element and is unverified");
  });

  it("moves a tab through the portal a window measured, instead of denying one", () => {
    // The page sent a would-be detachable tab away with "needs a portal or drag
    // model; the runtime has neither". `@gpuix/react` publishes `createPortal`
    // and `portal-layer` painted it in a window, so the remaining gap is the
    // second OS window — not the layer move a portal does give a component.
    const portal = rowFor(record, "Portals");

    expect(portal).toContain("supported, with limits");
    expect(portal).toContain("portal-layer");
    expect(portal).toContain("one window per process");
    expect(workspace).toContain("portal-layer");
    expect(workspace).toContain("createPortal");
    expect(workspace).not.toContain("the runtime has neither");
  });

  it("keeps the workspace out of the wheel's path, as the window measured it", () => {
    // A dock's pane list sits inside the workspace's own scroll root, and the
    // page described the dock's focus order and panes while saying nothing about
    // what a wheel does across the two. `nested-scroll-lifecycle` measured one
    // wheel moving **every** scrollable ancestor by the same delta, each
    // clamping against its own content, and the page's `onScroll` hearing a wheel
    // aimed inside the list — so the outer layout is a rule, not a detail.
    const nested = rowFor(record, "Nested scrollers");

    expect(nested).toContain("supported, with limits");
    expect(nested).toContain("nested-scroll-lifecycle");
    expect(nested).toContain("preventDefault");
    expect(workspace).toContain("nested-scroll-lifecycle");
    expect(workspace).toContain("The workspace does not scroll");
    expect(workspace).toContain("onScrollChange");
  });

  it("counts a find bar's matches instead of rows", () => {
    // A workspace find bar is Tier 4's Search and replace, and a log viewer or a
    // code pane mounts a window of rows. The page described the dock's panes and
    // its scrollers and nothing about searching them, so the match offset a
    // virtualized document needs had no route where a workspace is designed.
    const find = rowFor(record, "Find in a virtualized document");

    expect(find).toContain("supported, with limits");
    expect(find).toContain("search-virtual-document");
    expect(find).toContain("matchIndexOffset");
    expect(workspace).toContain("matchIndexOffset");
    expect(workspace).toContain("search-virtual-document");
    expect(workspace).toContain("windowStart");
    expect(workspace).toContain("A find bar counts matches, not rows");
    // The replace runs over the document, not the window the reader sees.
    expect(workspace).toContain("676");
  });

  it("shares one editing session between a split's panes", () => {
    // Tier 4's multi-pane editing layout is composition, and a window has one
    // platform text session. `multi-pane-editor` measured the press that moves
    // it, the splitter that does not, the pane's own clamps and a closed pane
    // keeping its buffer — and the page described the resize rules only, so a
    // workspace plan had no contract for the session a split shares. The numbers
    // are read from the fixture, so the page cannot print a stale clamp.
    const fixture = readFileSync(
      new URL(
        "../../../../apps/playground/src/live/multi-pane.ts",
        import.meta.url,
      ),
      "utf8",
    );
    const bounds = /initial: (\d+),\s*min: (\d+),\s*max: (\d+),/.exec(fixture);
    expect(
      bounds,
      "the multi-pane fixture lost its split bounds",
    ).not.toBeNull();
    const [, initial = "", min = "", max = ""] = bounds ?? [];
    expect(Number(initial)).toBeGreaterThan(Number(min));

    const probe = readFileSync(
      new URL(
        "../../../../apps/playground/src/live/scenarios.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    const steps = [
      "typing follows the session",
      "the surviving pane takes the whole row",
    ];
    expect(
      steps.filter((step) => !probe.includes(step)),
      "the record cites a check the probe no longer asserts",
    ).toEqual([]);

    expect(workspace).toContain("multi-pane-editor");
    expect(workspace).toContain("One text session, one buffer per pane");
    expect(workspace).toContain("A press moves the editing session");
    expect(workspace).toContain("does not take the session");
    expect(workspace).toContain("Closing a pane is a layout change");
    expect(workspace).toContain(`stopped at ${max}`);
    expect(workspace).toContain(`${min}`);
    expect(workspace).toContain(`${Number(initial) + 60}`);
    expect(workspace).toContain("`editor-overlay`");
  });

  it("restores the arrangement it saved, and opens the default on a bad one", () => {
    // Persistent panel state is the app's data — no renderer storage — so the
    // half a window can prove is the restore. `workspace-restore` measured the
    // re-mounted workspace, the default on a corrupt string and the clamp on a
    // stale width; the page has to carry those three rules where a workspace is
    // designed.
    const restore = rowFor(record, "Workspace restore");

    expect(restore).toContain("supported, with limits");
    expect(restore).toContain("workspace-restore");
    expect(restore).toContain("source=default");
    expect(workspace).toContain("workspace-restore");
    expect(workspace).toContain("A decode failure opens the default");
    expect(workspace).toContain(
      "Clamp a restored number to the pane's own bounds",
    );
    expect(workspace).toContain("first layout");
  });
});
