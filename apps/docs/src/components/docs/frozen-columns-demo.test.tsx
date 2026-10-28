import { readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { paintableSize } from "@gpuixui/data/internal/size";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { packagePreviews } from "@/lib/package-preview";
import { demos } from "./demos";
import {
  FROZEN_RECORDS,
  READABLE_HEIGHT,
  UNREADABLE_HEIGHT,
  FrozenColumnsDemo,
  mirroredOffsets,
} from "./frozen-columns-demo";

/**
 * The Frozen columns preview.
 *
 * `packages/data/docs/frozen-columns.mdx` is the package's Markdown, so the
 * site mounts the drawing from `package-preview.ts` and the page carries no
 * `<ComponentPreview>`. The registry's guard sees the demo and the page mount;
 * what it cannot see is whether the drawing still keeps the measured
 * composition — one offset mirrors two scrollers vertically, only the data pane
 * pans sideways, and a height the layout cannot paint is the pane's share — so
 * the cases below hold the drawing to the package's own `paintableSize` and to
 * `packages/data/src/table/frozen.tsx`'s contract.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

describe("the frozen-columns preview", () => {
  it("mirrors one vertical offset and leaves the frozen column still", () => {
    // A wheel over the frozen pane: both panes take the y, the data pane keeps
    // the horizontal offset it had, and the frozen column has no x at all.
    expect(
      mirroredOffsets("frozen", { scrollTop: 96, scrollLeft: 0 }, 120),
    ).toEqual({
      frozen: { scrollTop: 96, scrollLeft: 0 },
      data: { scrollTop: 96, scrollLeft: 120 },
    });

    // A sideways scroll belongs to the data pane; the frozen column stays put.
    expect(
      mirroredOffsets("data", { scrollTop: 24, scrollLeft: 140 }, 0),
    ).toEqual({
      frozen: { scrollTop: 24, scrollLeft: 0 },
      data: { scrollTop: 24, scrollLeft: 140 },
    });
  });

  it("reads the grid's height with the package's own rule", () => {
    // The composition imports `paintableSize`; these are its answers, not a
    // second rule: a share that cannot paint is no height, and zero is a size.
    expect(Option.getOrNull(paintableSize(READABLE_HEIGHT))).toBe(200);
    expect(Option.getOrNull(paintableSize(0))).toBe(0);
    expect(Option.isNone(paintableSize(UNREADABLE_HEIGHT))).toBe(true);
    expect(Option.isNone(paintableSize(Number.POSITIVE_INFINITY))).toBe(true);
    expect(Option.isNone(paintableSize(-1))).toBe(true);

    const frozen = read("packages/data/src/table/frozen.tsx");
    expect(frozen).toContain(
      'import { paintableSize } from "../internal/size.js"',
    );
    expect(frozen).toContain("paintableSize(height)");
    expect(read("packages/data/docs/frozen-columns.mdx")).toContain(
      "reads as **no height**",
    );
  });

  it("draws two scrollers, one row per record in each pane", () => {
    const html = renderToStaticMarkup(<FrozenColumnsDemo />);

    expect(html).toContain('role="table"');
    expect(html).toContain('aria-label="Files"');
    expect(html).toContain('data-pane="frozen"');
    expect(html).toContain('data-pane="data"');
    expect(html.match(/ data-row="/g) ?? []).toHaveLength(
      FROZEN_RECORDS.length * 2,
    );
    // The grid is the caller's 200px box at rest.
    expect(html).toContain("height:200px");
    // The first record is chosen for the whole grid, in both panes.
    expect(html.match(/aria-selected="true"/g) ?? []).toHaveLength(2);
    expect(html).toContain("chosen r1");
  });

  it("paints the selected row with the roles the table's recipe names", () => {
    const recipe = read("packages/data/src/table/recipe.ts");
    expect(recipe).toContain("bg-selected text-selected-foreground");

    const css = read("apps/docs/src/styles/demos.css");
    const selected = css.slice(
      css.indexOf('.gx-dt-row[data-selected="true"] {'),
    );
    expect(selected.slice(0, selected.indexOf("}"))).toContain(
      "background: var(--selected);",
    );
    // The rule crosses the washed fill, so it is the selected divider role.
    expect(selected.slice(0, selected.indexOf("}"))).toContain(
      "border-bottom-color: var(--divider-selected);",
    );
    // Only the data pane pans: the frozen body hides its horizontal overflow.
    const body = css.slice(css.indexOf(".gx-dt-frozen-pane {"));
    expect(body.slice(0, body.indexOf("}"))).toContain("overflow-x: hidden;");
  });

  it("offers the readable height and the one the layout cannot paint", () => {
    expect(READABLE_HEIGHT).toBe(200);
    expect(Number.isNaN(UNREADABLE_HEIGHT)).toBe(true);
  });

  it("is wired to the page the package ships", () => {
    expect(demos["frozen-columns-demo"]).toBeDefined();
    const row = packagePreviews.find(
      (preview) =>
        preview.origin === "data" && preview.path === "frozen-columns.mdx",
    );
    expect(row?.demo).toBe("frozen-columns-demo");

    const page = read("packages/data/docs/frozen-columns.mdx");
    expect(page).not.toContain("<ComponentPreview");
    expect(page).toContain("No sticky pinning");
    expect(page).toContain("the frozen column is a second scroller");
  });
});
