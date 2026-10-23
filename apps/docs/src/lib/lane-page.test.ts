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

/**
 * The data lane's page lives in a folder, not beside the other two.
 *
 * The `@gpuixui/data` collection is mounted at `/docs/data-display`, so the
 * package's own pages share the prefix with the lane page; the lane page moves
 * into `data-display/index.mdx` to leave the folder free for them.
 */
const dataDisplayPage = "data-display/index.mdx";

/**
 * The workspace lane's page lives in a folder for the same reason: the three
 * workspace packages mount their pages under the lane's own route, so the
 * lane page moves into `workspace/index.mdx` to leave the folder free.
 */
const workspacePage = "workspace/index.mdx";

const pages: ReadonlyArray<LanePage> = [
  { file: "layouts.mdx", lane: "layout", title: "Layouts" },
  { file: workspacePage, lane: "workspace", title: "Workspace" },
  { file: dataDisplayPage, lane: "data-display", title: "Data display" },
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

  it("sit in the sidebar beside the component lanes", () => {
    const positions = pages.map(({ file }) => {
      // A lane page that moved into a folder is listed by its folder's name.
      const slug = file.replace(/\/index\.mdx$/, "").replace(/\.mdx$/, "");
      return sidebar.indexOf(slug);
    });

    expect(positions.every((position) => position > 0)).toBe(true);
    // Layouts is a guide above the separator; the two package lanes follow the
    // component group in the order the root meta declares.
    expect(sidebar.indexOf("layouts")).toBeLessThan(
      sidebar.indexOf("components"),
    );
    expect(sidebar.indexOf("data-display")).toBeGreaterThan(
      sidebar.indexOf("components"),
    );
    expect(sidebar.indexOf("workspace")).toBeGreaterThan(
      sidebar.indexOf("data-display"),
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
