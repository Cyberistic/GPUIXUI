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

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

describe("the expandable-rows preview", () => {
  it("opens and closes one row without closing the other", () => {
    expect(OPEN_ON_MOUNT).toEqual(["harbour"]);

    expect(toggleOpen(OPEN_ON_MOUNT, "notes")).toEqual(["harbour", "notes"]);

    expect(toggleOpen(["harbour", "notes"], "harbour")).toEqual(["notes"]);
    expect(toggleOpen([], "deploy")).toEqual(["deploy"]);
  });

  it("paints the two glyphs the package chooses between", () => {
    const row = read("packages/data/src/table/expandable.tsx");
    expect(row).toContain('name={open ? "chevron-down" : "chevron-right"}');
    expect(row).toContain("export const DEFAULT_EXPANDER_WIDTH = 32;");

    expect(expanderGlyph(false)).toBe("chevron-right");
    expect(expanderGlyph(true)).toBe("chevron-down");

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

    expect(html.match(/class="gx-dt-detail"/g) ?? []).toHaveLength(1);
    expect(html).toContain("harbour-chart.png details");

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
    const detail = css.slice(css.indexOf(".gx-dt-detail {"));
    expect(detail.slice(0, detail.indexOf("}"))).toContain(
      "background: var(--muted);",
    );
    const cell = css.slice(css.indexOf(".gx-dt-detail > * {"));
    expect(cell.slice(0, cell.indexOf("}"))).toContain("padding: 12px;");
  });

  it("keeps the expander track out of the table's columns", () => {
    const html = renderToStaticMarkup(<ExpandableRowsDemo />);

    expect(html.match(/role="columnheader"/g) ?? []).toHaveLength(3);

    expect(html.match(/aria-hidden="true"/g) ?? []).toHaveLength(1);
    expect(html).not.toContain('role="columnheader" aria-hidden');
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
  });
});
