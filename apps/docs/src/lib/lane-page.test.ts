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

  it("separates rendering into a terminal from hosting one", () => {
    expect(rowFor(record, "Terminal rendering")).toContain("supported");
    expect(workspace).toContain("terminal: true");
    expect(workspace).toContain("hosts a PTY");
    expect(workspace).not.toContain("No terminal host element");
  });
});
