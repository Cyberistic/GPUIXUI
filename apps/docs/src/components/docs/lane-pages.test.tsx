import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  collectionByOrigin,
  packageCollections,
  packageSections,
} from "../../lib/collection-routes";
import {
  lanePageGroups,
  lanePageTotal,
  type LanePageRow,
  type PackageLane,
} from "../../lib/lane-pages";
import { LanePages } from "./lane-pages";

/**
 * The lane pages' shipped-page list.
 *
 * Bug guarded: `/docs/data-display` and `/docs/workspace` are the pages a
 * reader arrives on when the question is "what does this lane ship", and both
 * answered with a hand-written list. The data lane's table had lost `Table
 * selection`, `Table sorting` and `Column configuration`, and the workspace
 * lane had no list at all — the editor, file, shell and media packages were
 * reachable only through the sidebar. The rows are generated from the mounted
 * collections now, so this suite reads the packages' own docs folders with a
 * different walker and requires every page's link, title and description in the
 * rendered list.
 */

const root = new URL("../../../../../", import.meta.url);

const laneSections: Readonly<Record<PackageLane, string>> = {
  "data-display": "Data display",
  workspace: "Workspace",
};

const lanes = ["data-display", "workspace"] as const;

/** One page a lane's packages ship, read straight off the disk. */
interface ShippedPage {
  readonly url: string;
  readonly title: string;
  readonly description: string;
}

const frontmatterValue = (head: string, key: string): string => {
  const value = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(head)?.[1]?.trim();
  return value === undefined ? "" : value.replace(/^["']|["']$/g, "");
};

const shippedPages = (lane: PackageLane): ReadonlyArray<ShippedPage> =>
  packageCollections
    .filter((collection) => collection.section === laneSections[lane])
    .flatMap((collection) => {
      const dir = new URL(`${collection.dir}/`, root);
      return readdirSync(dir)
        .filter((name) => name.endsWith(".mdx"))
        .map((name) => {
          const head =
            /^---\n([\s\S]*?)\n---\n/.exec(
              readFileSync(new URL(name, dir), "utf8"),
            )?.[1] ?? "";
          return {
            url: `${collection.route}/${name.replace(/\.mdx$/, "")}`,
            title: frontmatterValue(head, "title"),
            description: frontmatterValue(head, "description"),
          };
        });
    });

const render = (lane: PackageLane): string =>
  renderToStaticMarkup(<LanePages lane={lane} />);

/** The escaping `renderToStaticMarkup` applies to text. */
const html = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

const row = (url: string, section: string): LanePageRow => ({
  url,
  section,
  title: url,
  description: "",
});

describe("the lane page list", () => {
  it.each(lanes)("lists every page the %s packages ship", (lane) => {
    const markup = render(lane);
    const pages = shippedPages(lane);

    expect(pages.length).toBeGreaterThanOrEqual(lane === "workspace" ? 18 : 14);
    expect(
      pages.filter((page) => !markup.includes(`href="${page.url}"`)),
    ).toEqual([]);
    expect(pages.filter((page) => !markup.includes(page.title))).toEqual([]);
    // The description is the reason the row exists: a bare link list would
    // make a reader open every page to learn what it gives the lane.
    expect(
      pages.filter((page) => !markup.includes(html(page.description))),
    ).toEqual([]);
  });

  it.each(lanes)(
    "prints the %s page and package counts it rendered",
    (lane) => {
      const markup = render(lane);
      const packs = packageCollections.filter(
        (collection) =>
          collection.section === laneSections[lane] &&
          shippedPages(lane).some((page) =>
            page.url.startsWith(`${collection.route}/`),
          ),
      );

      expect(markup).toContain(
        `${shippedPages(lane).length} pages in ${packs.length} packages`,
      );
    },
  );

  it("names the three data pages the hand-written table had lost", () => {
    // Measured before the change: the table stopped at twelve and omitted
    // these three, so the lane entry sent a reader looking for table selection,
    // sorting and column configuration to the sidebar and nothing linked them.
    const markup = render("data-display");

    expect(markup).toContain('href="/docs/data-display/table-selection"');
    expect(markup).toContain('href="/docs/data-display/table-sorting"');
    expect(markup).toContain('href="/docs/data-display/column-configuration"');
  });

  it("names all five workspace packages, not only the dock and shell", () => {
    const markup = render("workspace");
    const packages = (
      packageSections.find((section) => section.name === "Workspace")
        ?.origins ?? []
    ).map((origin) => collectionByOrigin[origin].packageName);

    expect(packages).toEqual([
      "@gpuixui/dock",
      "@gpuixui/editor",
      "@gpuixui/files",
      "@gpuixui/shell",
      "@gpuixui/media",
    ]);
    expect(packages.filter((name) => !markup.includes(name))).toEqual([]);
    expect(markup).toContain('href="/docs/media/image-preview"');
    expect(markup).toContain('href="/docs/editor/code-editor"');
  });

  it("keeps each lane to its own packages' pages", () => {
    const data = render("data-display");
    const workspace = render("workspace");

    expect(data).not.toContain('href="/docs/dock/');
    expect(data).not.toContain('href="/docs/media/');
    expect(workspace).not.toContain('href="/docs/data-display/');
    expect(workspace).not.toContain('href="/docs/components/dialog"');
  });

  it("groups only the lane's pages and drops a collection with none", () => {
    const rows = [
      row("/docs/data-display/charts", "Data display"),
      row("/docs/components/dialog", "Components"),
      row("/docs/workspace/dock-layout", "Workspace"),
    ];

    const groups = lanePageGroups(rows, "data-display");

    expect(groups.map((group) => group.collection.packageName)).toEqual([
      "@gpuixui/data",
    ]);
    expect(
      lanePageGroups(rows, "data-display").flatMap((g) => g.pages),
    ).toEqual([rows[0]]);
    expect(lanePageGroups([], "workspace")).toEqual([]);
    expect(lanePageTotal(groups)).toBe(1);
  });
});
