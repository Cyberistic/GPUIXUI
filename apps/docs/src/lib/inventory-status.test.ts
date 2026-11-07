import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { pageUrl } from "./component-index";
import { inventory } from "./inventory-data";
import {
  inventoryUrl,
  laneRows,
  pageRows,
  pageRowsByUrl,
  rowsForPage,
  statusForPage,
  unpublishedRows,
  withoutRow,
} from "./inventory-status";

const root = new URL("../../../../", import.meta.url);

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

const packagePages: ReadonlyArray<Page> = packageCollections.flatMap(
  (collection) =>
    collectionPages(root, collection).map((name) =>
      withTitle(`${collection.dir}/${name}`),
    ),
);

const curatedPages: ReadonlyArray<Page> = readdirSync(
  new URL("apps/docs/content/docs/components/", root),
)
  .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
  .map((name) => withTitle(`apps/docs/content/docs/components/${name}`));

const componentPages = [...curatedPages, ...packagePages].filter(
  (page) => !page.file.endsWith("/index.mdx"),
);

const titleOf = (page: Page): string => {
  if (page.title === undefined) throw new Error(`${page.file}: no title`);
  return page.title;
};

const urlOf = (page: Page): string => {
  const url = pageUrl(page.file.replace(/^apps\/docs\//, ""));
  if (url === undefined) throw new Error(`${page.file}: no address`);
  return url;
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

  it("reports the row the page's own package ships", () => {
    const data = statusForPage(inventory, {
      title: "Property panels",
      url: "/data-display/property-panel",
    });
    const files = statusForPage(inventory, {
      title: "Property panels",
      url: "/files/property-panel",
    });

    expect(data.kind === "row" && data.row.name).toBe("Property panels");
    expect(files.kind === "row" && files.row.name).toBe("Inspector panels");
    expect(
      rowsForPage(inventory, {
        title: "Property panels",
        url: "/files/property-panel",
      }).map((row) => row.name),
    ).toEqual(["Inspector panels", "Property editors"]);
  });

  it("names a live page and a real row for every address alias", () => {
    const titles = new Map(
      componentPages.map((page) => [urlOf(page), titleOf(page)] as const),
    );

    const findings = Object.entries(pageRowsByUrl).flatMap(([url, names]) => {
      const title = titles.get(url);
      if (title === undefined) return [`${url}: no mounted page`];
      const unknown = names
        .filter((name) => !inventory.rows.some((row) => row.name === name))
        .map((name) => `${url} -> ${name}`);

      const redundant =
        rowsForPage(inventory, title)[0]?.name ===
        rowsForPage(inventory, { title, url })[0]?.name
          ? [`${url}: the alias names the row the title already names`]
          : [];
      return [...unknown, ...redundant];
    });

    expect(findings).toEqual([]);
  });

  it("publishes every shipped row on a page", () => {
    const pages = componentPages.map((page) => ({
      title: titleOf(page),
      url: urlOf(page),
    }));

    expect(unpublishedRows(inventory, pages)).toEqual([]);
  });

  it("reports a shipped row no page names, rather than counting it", () => {
    const orphan = {
      rows: [
        { tier: 1, name: "Probe", status: "done", support: "yes", notes: "" },
      ],
      sections: [],
      malformed: [],
    };

    expect(unpublishedRows(orphan, ["Button"])).toEqual(["Probe"]);
  });

  it("keeps a lane row on a page that teaches it", () => {
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
      return entry.reason.trim() === "" ? [`${entry.row}: no reason`] : [];
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

    expect(inventoryUrl).toContain("/COMPONENTS.md");
  });

  it("reports the row for every curated page too, not only the packages'", () => {
    const drawingOnly = new Set(["Reorderable tabs"]);
    const missing = curatedPages.flatMap((page) => {
      if (page.title === undefined) return [`${page.file}: no title`];
      if (drawingOnly.has(page.title)) return [];
      const status = statusForPage(inventory, page.title);
      return status.kind === "row" ? [] : [`${page.file}: ${status.reason}`];
    });

    expect(missing).toEqual([]);
    expect(curatedPages.length).toBe(41);
  });

  it("throws on a title two rows could answer, instead of guessing", () => {
    const ambiguous = {
      rows: [
        { tier: 1, name: "Card", status: "done", support: "yes", notes: "" },
        { tier: 2, name: "Cards", status: "done", support: "yes", notes: "" },
      ],
      sections: [],
      malformed: [],
    };

    expect(rowsForPage(ambiguous, "Card")).toHaveLength(2);
    expect(() => statusForPage(ambiguous, "Card")).toThrow(/names 2 rows/);
  });
});
