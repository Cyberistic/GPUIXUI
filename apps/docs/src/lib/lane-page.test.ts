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

  it("separates rendering into a terminal from hosting one", () => {
    expect(rowFor(record, "Terminal rendering")).toContain("supported");
    expect(workspace).toContain("terminal: true");
    expect(workspace).toContain("hosts a PTY");
    expect(workspace).not.toContain("No terminal host element");
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
});
