import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { componentIndex } from "./component-index-data";
import { groupOf } from "./inventory";
import { inventory } from "./inventory-data";
import {
  countGroups,
  inventoryPage,
  sectionId,
  type InventoryPageRow,
} from "./inventory-page";

/**
 * The implementation-status page's data.
 *
 * `COMPONENTS.md` is grouped by the headings it is written under. The parser
 * used to leave the last tier open across a non-tier heading, so the plan 600
 * animated catalogue was counted as Tier 5 — 34 components in the wrong
 * section, and a page that grouped the inventory would have printed a tier the
 * document does not have. The tests below derive the sections from the document
 * and hold the page's own grouping to them.
 */

const view = inventoryPage(inventory, componentIndex);

const rowNamed = (name: string): InventoryPageRow => {
  const found = view.sections
    .flatMap((section) => section.rows)
    .find((entry) => entry.row.name === name);
  if (found === undefined) throw new Error(`no row named ${name}`);
  return found;
};

describe("the inventory page", () => {
  it("places every row once, under the heading it was written under", () => {
    const rendered = view.sections.flatMap((section) =>
      section.rows.map((entry) => entry.row.name),
    );

    expect(view.sections.map((section) => section.section)).toEqual(
      inventory.sections,
    );
    expect(rendered.toSorted()).toEqual(
      inventory.rows.map((row) => row.name).toSorted(),
    );
    expect(view.total).toBe(inventory.rows.length);
    expect(view.shipped).toBe(
      inventory.rows.filter((row) => groupOf(row.status) === "shipped").length,
    );
    expect(view.sections.every((section) => section.rows.length > 0)).toBe(
      true,
    );
  });

  it("reports the animated catalogue as its own section, not Tier 5", () => {
    const animated = view.sections.find(
      (section) => section.section.tier === "animated",
    );
    const tierFive = view.sections.find(
      (section) => section.section.tier === 5,
    );

    expect(animated?.section.title).toBe("Animated primitives (plan 600)");
    expect(animated?.id).toBe("animated-primitives");
    expect(animated?.rows.length).toBeGreaterThanOrEqual(30);
    expect(
      animated?.rows.some((entry) => entry.row.name === "Typing text"),
    ).toBe(true);
    expect(
      tierFive?.rows.some((entry) => entry.row.name === "Typing text"),
    ).toBe(false);
    // The specialised tier is the 15 rows the document writes before the
    // catalogue; before the fix it was 49, because the catalogue joined it.
    expect(tierFive?.rows.length).toBeLessThan(20);
    expect(view.sections.map((section) => section.id)).toEqual([
      "tier-1",
      "tier-2",
      "tier-3",
      "tier-4",
      "tier-5",
      "animated-primitives",
    ]);
  });

  it("links a row to the page that reports it", () => {
    expect(rowNamed("Typing text").url).toEqual(
      Option.some("/components/typing-text"),
    );
    expect(rowNamed("Buttons").url).toEqual(Option.some("/components/button"));
    expect(rowNamed("Tables").url).toEqual(Option.some("/components/table"));
  });

  it("leaves a row with no page plain instead of guessing an address", () => {
    expect(Option.isNone(rowNamed("Terminal surfaces").url)).toBe(true);
  });

  it("counts every status group, not only shipped and pending", () => {
    const counts = countGroups(inventory.rows);

    expect(
      counts.shipped + counts.pending + counts.blocked + counts.unsupported,
    ).toBe(inventory.rows.length);
    expect(counts.unsupported).toBe(
      inventory.rows.filter((row) => groupOf(row.status) === "unsupported")
        .length,
    );
    expect(counts.shipped).toBeGreaterThan(0);
  });

  it("derives an anchor a reader can link", () => {
    expect(sectionId(3)).toBe("tier-3");
    expect(sectionId("animated")).toBe("animated-primitives");
  });
});
