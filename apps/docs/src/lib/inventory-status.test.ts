import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inventory } from "./inventory-data";
import {
  inventoryUrl,
  renamedRows,
  rowCandidates,
  statusForPage,
  withoutRow,
} from "./inventory-status";

/**
 * The status strip is the page's claim about the inventory.
 *
 * Every mounted package page reports the `COMPONENTS.md` row that decides
 * whether its component is shipped and how much of it GPUix supports. The join
 * is the page title, and titles and row names disagree in punctuation, number
 * and vocabulary — so the aliases are checked against the inventory, every page
 * on disk must resolve, and an ambiguous title must throw rather than report
 * another component's verdict.
 */

const root = new URL("../../../../", import.meta.url);

const collections = ["primitives", "icons", "components"] as const;

/** `<package>/docs` pages, with the title each one declares. */
const packagePages = collections.flatMap((collection) =>
  readdirSync(new URL(`packages/${collection}/docs/`, root))
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => {
      const source = readFileSync(
        new URL(`packages/${collection}/docs/${name}`, root),
        "utf8",
      );
      const title = /^title:\s*(.+)$/m
        .exec(source)?.[1]
        ?.trim()
        .replace(/^["']|["']$/g, "");
      return { file: `packages/${collection}/docs/${name}`, title };
    }),
);

describe("the status a package page reports", () => {
  it("is the inventory row for every page on disk", () => {
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

  it("names a row that exists for every renamed page", () => {
    const unknown = Object.entries(renamedRows).flatMap(([title, name]) =>
      inventory.rows.some((row) => row.name === name)
        ? []
        : [`${title} -> ${name}`],
    );

    expect(unknown).toEqual([]);
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

    expect(rowCandidates(ambiguous, "Card")).toHaveLength(2);
    expect(() => statusForPage(ambiguous, "Card")).toThrow(/names 2 rows/);
  });
});
