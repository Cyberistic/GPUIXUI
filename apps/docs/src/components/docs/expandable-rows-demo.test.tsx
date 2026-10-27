import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { packagePreviews } from "@/lib/package-preview";
import { demos } from "./demos";
import {
  ExpandableRowsDemo,
  HARBOUR,
  LISTED_FILES,
  OPEN_ON_MOUNT,
  detailOf,
  expanderGlyph,
  expanderMark,
  toggleOpen,
} from "./expandable-rows-demo";

/**
 * The Expandable rows preview.
 *
 * `packages/data/docs/expandable-rows.mdx` is the package's Markdown, so the
 * site mounts the drawing from `package-preview.ts` and the page carries no
 * `<ComponentPreview>`. The registry's guard sees the demo and the page mount;
 * what it cannot see is whether the drawing still paints the row's contract —
 * the row is the toggle, the panel is a sibling row on the `muted` strip, the
 * expander track is the package's width, and two rows can be open at once — so
 * the cases below hold the drawing to
 * `packages/data/src/table/expandable.tsx` and its recipes.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

describe("the expandable-rows preview", () => {
  it("opens and closes one row without closing the other", () => {
    expect(OPEN_ON_MOUNT).toEqual(["harbour"]);
    // A press on another row leaves the open panel alone: two can be open.
    expect(toggleOpen(OPEN_ON_MOUNT, "notes")).toEqual(["harbour", "notes"]);
    // A second press on an open row closes only it.
    expect(toggleOpen(["harbour", "notes"], "harbour")).toEqual(["notes"]);
    expect(toggleOpen([], "deploy")).toEqual(["deploy"]);
  });

  it("paints the two glyphs the package chooses between", () => {
    const row = read("packages/data/src/table/expandable.tsx");
    expect(row).toContain('name={open ? "chevron-down" : "chevron-right"}');
    expect(row).toContain("export const DEFAULT_EXPANDER_WIDTH = 32;");

    expect(expanderGlyph(false)).toBe("chevron-right");
    expect(expanderGlyph(true)).toBe("chevron-down");
    // The browser has no icon package here, so the mark is the glyph's shape.
    expect(expanderMark(false)).toBe("▸");
    expect(expanderMark(true)).toBe("▾");
  });

  it("lists the facts the panel shows, and none of the row's own cells", () => {
    const facts = detailOf(HARBOUR);

    expect(facts.map((fact) => fact.label)).toEqual([
      "Kind",
      "Size",
      "Owner",
      "Modified",
    ]);
    // The panel is the object read once: every file answers the same labels.
    const labels = Arr.map(LISTED_FILES, (file) =>
      detailOf(file).map((fact) => fact.key),
    );
    expect(new Set(labels.map((keys) => keys.join(","))).size).toBe(1);
  });

  it("draws a row per record, one panel, and the track the package names", () => {
    const html = renderToStaticMarkup(<ExpandableRowsDemo />);

    expect(html).toContain('role="table"');
    expect(html).toContain('aria-label="Files with details"');
    expect(html.match(/aria-expanded="false"/g) ?? []).toHaveLength(
      LISTED_FILES.length - 1,
    );
    expect(html.match(/aria-expanded="true"/g) ?? []).toHaveLength(1);
    // One panel, under the row the page opens on.
    expect(html.match(/class="gx-er-detail"/g) ?? []).toHaveLength(1);
    expect(html).toContain("harbour-chart.png details");
    // The expander track is data: the package's 32px, not a share.
    expect(html.match(/width:32px/g) ?? []).toHaveLength(
      LISTED_FILES.length + 1,
    );
    expect(html).toContain("1 of 4 panels open");
  });

  it("paints the panel on the strip the recipe names", () => {
    const recipe = read("packages/data/src/table/recipe.ts");
    expect(recipe).toContain("TABLE_DETAIL_ROW =");
    expect(recipe).toContain("bg-muted");
    expect(recipe).toContain("TABLE_DETAIL_CELL =");
    expect(recipe).toContain("text-sm");

    const css = read("apps/docs/src/styles/demos.css");
    const detail = css.slice(css.indexOf(".gx-er-detail {"));
    expect(detail.slice(0, detail.indexOf("}"))).toContain(
      "background: var(--muted);",
    );
    const cell = css.slice(css.indexOf(".gx-er-detail-cell {"));
    expect(cell.slice(0, cell.indexOf("}"))).toContain("padding: 12px;");
  });

  it("keeps the expander track out of the table's columns", () => {
    // Guarded bug: the track was a fourth `columnheader` (and `aria-hidden`, so
    // no reader could meet it), while a body row holds three cells. It is
    // decoration: the package's header cell is empty too.
    const html = renderToStaticMarkup(<ExpandableRowsDemo />);

    expect(html.match(/role="columnheader"/g) ?? []).toHaveLength(3);
    expect(html.match(/role="presentation"/g) ?? []).toHaveLength(1);
    expect(html).not.toContain('aria-label="Expanded"');
  });

  it("is wired to the page the package ships", () => {
    expect(demos["expandable-rows-demo"]).toBeDefined();
    const row = packagePreviews.find(
      (preview) =>
        preview.origin === "data" && preview.path === "expandable-rows.mdx",
    );
    expect(row?.demo).toBe("expandable-rows-demo");

    const page = read("packages/data/docs/expandable-rows.mdx");
    expect(page).not.toContain("<ComponentPreview");
    expect(page).toContain("One panel per row; two rows can be open at once");
    expect(page).toContain("No animation of the panel's height");
  });
});
