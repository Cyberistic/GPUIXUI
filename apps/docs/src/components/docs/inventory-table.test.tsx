import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { componentIndex } from "../../lib/component-index-data";
import { inventory } from "../../lib/inventory-data";
import { inventoryPage } from "../../lib/inventory-page";
import { InventoryTable } from "./inventory-table";

/**
 * The implementation-status page's markup.
 *
 * Bug guarded: the page is the only place the whole inventory is visible at
 * once, and it groups by the document's own headings. The animated catalogue
 * is a section of its own, not rows appended to Tier 5, and a row links only
 * to a page that really documents it.
 */

const view = inventoryPage(inventory, componentIndex);

const markup = renderToStaticMarkup(<InventoryTable />);

const escape = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

/** A row's own markup, located by the name the table carries on the element. */
const rowMarkup = (name: string): string => {
  const start = markup.indexOf(`data-component="${escape(name)}"`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = markup.indexOf("</tr>", start);
  return markup.slice(start, end);
};

describe("the implementation-status table", () => {
  it("prints every row once, under its own heading", () => {
    const names = [...markup.matchAll(/data-component="([^"]+)"/g)].map(
      (match) => match[1],
    );

    expect(names).toHaveLength(inventory.rows.length);
    expect(new Set(names).size).toBe(inventory.rows.length);
    expect(
      inventory.sections.filter(
        (section) => !markup.includes(escape(section.title)),
      ),
    ).toEqual([]);
  });

  it("keeps the animated catalogue out of Tier 5", () => {
    expect(markup).toContain('data-section="animated-primitives"');
    expect(markup.indexOf("Animated primitives (plan 600)")).toBeGreaterThan(
      markup.indexOf("Tier 5 — specialised"),
    );

    const animated = view.sections.find(
      (section) => section.section.tier === "animated",
    );
    const tierFive = view.sections.find(
      (section) => section.section.tier === 5,
    );

    expect(animated).toBeDefined();
    expect(tierFive).toBeDefined();
    expect(animated?.rows.length).toBeGreaterThanOrEqual(30);
    expect(tierFive?.rows.length).toBeLessThan(20);
  });

  it("prints the summary counts it derived, not a typed number", () => {
    expect(markup).toContain(`${view.total} rows`);
    expect(markup).toContain(`${view.counts.shipped} shipped`);
    expect(markup).toContain(`${view.counts.pending} to build`);
    expect(markup).toContain(`${view.counts.unsupported} unsupported`);
  });

  it("links a documented row and leaves an undocumented one plain", () => {
    expect(rowMarkup("Typing text")).toContain(
      'href="/components/typing-text"',
    );
    expect(rowMarkup("Buttons")).toContain('href="/components/button"');
    expect(rowMarkup("Terminal surfaces")).not.toContain("href=");
  });

  it("prints the support verdict through the shared label", () => {
    expect(rowMarkup("Typing text")).toContain("yes");
    expect(rowMarkup("Typing text")).toContain(
      "reveals a string a character at a time",
    );
  });

  it("is the page's whole body and the sidebar carries it", () => {
    const page = readFileSync(
      new URL("../../../content/docs/status.mdx", import.meta.url),
      "utf8",
    );
    const meta = readFileSync(
      new URL("../../../content/docs/meta.json", import.meta.url),
      "utf8",
    );

    expect(page).toContain(
      'import { InventoryTable } from "@/components/docs/inventory-table";',
    );
    expect(page).toContain("<InventoryTable />");
    expect(page).toContain("COMPONENTS.md");
    expect(page).toContain("not a sixth tier");
    expect(meta).toContain('"status"');
  });
});
