import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { inventory } from "./inventory-data";
import {
  inventoryUrl,
  laneRows,
  pageRows,
  rowsForPage,
  statusForPage,
  unpublishedRows,
  withoutRow,
} from "./inventory-status";

/**
 * The status strip is the page's claim about the inventory.
 *
 * Every mounted package page reports the `COMPONENTS.md` row that decides
 * whether its component is shipped and how much of it GPUix supports. The join
 * is the page title, and titles and row names disagree in punctuation, number
 * and vocabulary — so the aliases are checked against the inventory, every page
 * every mounted collection serves must resolve, and an ambiguous title must
 * throw rather than report another component's verdict.
 *
 * The other direction is the inventory's: a row may only be `done` when the
 * component has a docs page, so every shipped row must be published by one.
 * Ten pages were outside this guard because the collection list was retyped
 * here with three of the nine entries — the data, dock, editor and media pages
 * opened with **no status strip at all** — so the list now comes from
 * `packageCollections`, the same source the site mounts.
 */

const root = new URL("../../../../", import.meta.url);

/** A page on disk: its repo-relative file and the title it declares. */
interface Page {
  readonly file: string;
  readonly title: string | undefined;
}

const withTitle = (file: string): Page => {
  const source = readFileSync(new URL(file, root), "utf8");
  const title = /^title:\s*(.+)$/m
    .exec(source)?.[1]
    ?.trim()
    .replace(/^["']|["']$/g, "");
  return { file, title };
};

/** Every page a mounted package collection serves. */
const packagePages: ReadonlyArray<Page> = packageCollections.flatMap(
  (collection) =>
    collectionPages(root, collection).map((name) =>
      withTitle(`${collection.dir}/${name}`),
    ),
);

/** The site's own component pages: a curated page shadows its package's. */
const curatedPages: ReadonlyArray<Page> = readdirSync(
  new URL("apps/docs/content/docs/components/", root),
)
  .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
  .map((name) => withTitle(`apps/docs/content/docs/components/${name}`));

/** Every page the site serves that can publish an inventory row. */
const componentPages = [...curatedPages, ...packagePages];

/** A title as a page's strip reads it; a page without one is a defect here. */
const titleOf = (page: Page): string => {
  if (page.title === undefined) throw new Error(`${page.file}: no title`);
  return page.title;
};

describe("the status a package page reports", () => {
  it("is the inventory row for every page every mounted collection serves", () => {
    const exempt = new Set(withoutRow.map((page) => page.title));
    const missing = packagePages.flatMap((page) => {
      if (page.title === undefined) return [`${page.file}: no title`];
      if (exempt.has(page.title)) return [];
      const status = statusForPage(inventory, page.title);
      return status.kind === "row" ? [] : [`${page.file}: ${status.reason}`];
    });

    expect(missing).toEqual([]);
  });

  it("exempts only the pages it argues for", () => {
    const exempt = new Set(withoutRow.map((page) => page.title));
    const reported = packagePages.flatMap((page) =>
      page.title === undefined
        ? []
        : statusForPage(inventory, page.title).kind === "none"
          ? [page.title]
          : [],
    );

    // A new page with no row fails here by name, and a stale exemption fails the
    // next case, so the table cannot quietly grow.
    expect(reported.toSorted()).toEqual([...exempt].toSorted());
  });

  it("keeps every exemption a page that still exists", () => {
    const titles = new Set(packagePages.map((page) => page.title));

    expect(withoutRow.filter((page) => !titles.has(page.title))).toEqual([]);
    expect(withoutRow.filter((page) => page.reason.trim() === "")).toEqual([]);
  });

  it("names a row that exists for every published page", () => {
    const unknown = Object.entries(pageRows).flatMap(([title, names]) =>
      names.length === 0
        ? [`${title} -> no rows`]
        : names.flatMap((name) =>
            inventory.rows.some((row) => row.name === name)
              ? []
              : [`${title} -> ${name}`],
          ),
    );

    expect(unknown).toEqual([]);
  });

  it("reports the primary row, not a secondary one", () => {
    const table = statusForPage(inventory, "Table");

    expect(table.kind === "row" && table.row.name).toBe("Tables");
    expect(rowsForPage(inventory, "Table").map((row) => row.name)).toEqual([
      "Tables",
      "Column configuration",
      "Resizable columns",
      "Filtering controls",
    ]);

    const dock = statusForPage(inventory, "Docking layouts");
    expect(dock.kind === "row" && dock.row.name).toBe("Docking layouts");
  });

  it("publishes every shipped row on a page", () => {
    // The inventory's own rule: a row may only be `done` when the component has
    // a docs page. A row renamed on the site, or a package page mounted under a
    // title its alias does not name, leaves the row undocumented while every
    // page it does not touch still passes.
    const titles = componentPages.map(titleOf);

    expect(unpublishedRows(inventory, titles)).toEqual([]);
  });

  it("reports a shipped row no page names, rather than counting it", () => {
    const orphan = {
      rows: [
        { tier: 1, name: "Probe", status: "done", support: "yes", notes: "" },
      ],
      malformed: [],
    };

    expect(unpublishedRows(orphan, ["Button"])).toEqual(["Probe"]);
  });

  it("keeps a lane row on a page that cites its measurement", () => {
    const missing = laneRows.flatMap((entry) => {
      const row = inventory.rows.find(
        (candidate) => candidate.name === entry.row,
      );
      if (row === undefined) return [`${entry.row}: no inventory row`];
      if (!row.status.startsWith("done")) {
        return [`${entry.row}: recorded as lane-only while ${row.status}`];
      }
      if (!existsSync(new URL(entry.file, root))) {
        return [`${entry.row}: ${entry.file} does not exist`];
      }
      const source = readFileSync(new URL(entry.file, root), "utf8");
      return [
        ...(source.includes(entry.cites)
          ? []
          : [`${entry.row}: ${entry.file} does not cite ${entry.cites}`]),
        ...(entry.reason.trim() === "" ? [`${entry.row}: no reason`] : []),
      ];
    });

    expect(missing).toEqual([]);
  });

  it("reports the real verdict, not a generic one", () => {
    const accordion = statusForPage(inventory, "Accordion");
    const row = inventory.rows.find(
      (candidate) => candidate.name === "Accordions",
    );

    expect(accordion).toEqual({ kind: "row", row });
    expect(row?.status).toBe("done");
    // The URL is the one the strip links to.
    expect(inventoryUrl).toContain("/COMPONENTS.md");
  });

  it("throws on a title two rows could answer, instead of guessing", () => {
    const ambiguous = {
      rows: [
        { tier: 1, name: "Card", status: "done", support: "yes", notes: "" },
        { tier: 2, name: "Cards", status: "done", support: "yes", notes: "" },
      ],
      malformed: [],
    };

    expect(rowsForPage(ambiguous, "Card")).toHaveLength(2);
    expect(() => statusForPage(ambiguous, "Card")).toThrow(/names 2 rows/);
  });
});
