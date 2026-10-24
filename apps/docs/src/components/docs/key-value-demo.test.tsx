import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { packagePreviews } from "@/lib/package-preview";
import { demos } from "./demos";
import {
  FILE_ENTRIES,
  LABEL_WIDTHS,
  UNUSABLE_CHOICE,
  WIDE_CHOICE,
  KeyValueDemo,
  labelTrack,
  trackReadout,
} from "./key-value-demo";

/**
 * The Key-value displays preview.
 *
 * `packages/data/docs/key-value.mdx` is the package's Markdown, so the site
 * mounts the drawing from `package-preview.ts` and the page carries no
 * `<ComponentPreview>`. The registry's guard sees the demo and the page mount;
 * what it cannot see is whether the drawing still paints the list's one
 * measured rule — a **fixed** label track, with a width the layout cannot paint
 * read as the package's own default — so the cases below hold the drawing to
 * `packages/data/src/surfaces/key-value.tsx`.
 */

const root = new URL("../../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

describe("the key-value preview", () => {
  it("reads the label track the package paints", () => {
    // The premise is the package's own guard, read from its source: the drawing
    // must not teach a fallback the component does not apply.
    const list = read("packages/data/src/surfaces/key-value.tsx");
    expect(list).toContain("export const DEFAULT_LABEL_WIDTH = 120;");
    expect(list).toContain("labelWidth = DEFAULT_LABEL_WIDTH");
    expect(list).toContain("Number.isFinite(labelWidth) && labelWidth > 0");

    expect(
      [undefined, 120, 168, 0, -4, Number.NaN, Number.POSITIVE_INFINITY].map(
        labelTrack,
      ),
    ).toEqual([120, 120, 168, 120, 120, 120, 120]);
    // A fractional width is kept, because the layout can paint it.
    expect(labelTrack(160.5)).toBe(160.5);
  });

  it("offers one width the layout cannot paint, and says what it reads", () => {
    expect(LABEL_WIDTHS).toHaveLength(3);
    expect(LABEL_WIDTHS.map((choice) => choice.id)).toEqual([
      "default",
      "wide",
      "unusable",
    ]);
    expect(Number.isNaN(UNUSABLE_CHOICE.width)).toBe(true);

    expect(trackReadout(WIDE_CHOICE)).toContain(
      "every value begins at the track's edge",
    );
    expect(trackReadout(UNUSABLE_CHOICE)).toContain(
      "NaN reads as the 120px default",
    );
    expect(trackReadout(UNUSABLE_CHOICE)).not.toContain("every value begins");
  });

  it("draws every row of the record in one label column", () => {
    const html = renderToStaticMarkup(<KeyValueDemo />);

    expect(html).toContain('role="list"');
    expect(html).toContain('aria-label="File properties"');
    expect(html.match(/role="listitem"/g) ?? []).toHaveLength(
      FILE_ENTRIES.length,
    );
    // The label track is the fixed width the package paints, not a share.
    expect(html.match(/width:120px/g) ?? []).toHaveLength(FILE_ENTRIES.length);
    FILE_ENTRIES.forEach((entry) => {
      expect(html).toContain(`>${entry.label}<`);
      expect(html).toContain(`>${entry.value}<`);
    });
    expect(html).toContain("label column 120px");
  });

  it("paints the two roles the package's recipe names", () => {
    const recipe = read("packages/data/src/surfaces/recipe.ts");
    expect(recipe).toContain("KEY_VALUE_ROW =");
    expect(recipe).toContain("text-muted-foreground");
    expect(recipe).toContain("text-foreground");

    const css = read("apps/docs/src/styles/demos.css");
    const label = css.slice(css.indexOf(".gx-kv-label {"));
    expect(label.slice(0, label.indexOf("}"))).toContain(
      "color: var(--muted-foreground);",
    );
    const value = css.slice(css.indexOf(".gx-kv-value {"));
    expect(value.slice(0, value.indexOf("}"))).toContain(
      "color: var(--foreground);",
    );
    // The track is data (a caller width), so the sheet names no fixed width.
    expect(css).not.toContain(".gx-kv-label { width:");
  });

  it("is wired to the page the package ships", () => {
    expect(demos["key-value-demo"]).toBeDefined();
    const row = packagePreviews.find(
      (preview) =>
        preview.origin === "data" && preview.path === "key-value.mdx",
    );
    expect(row?.demo).toBe("key-value-demo");

    const page = read("packages/data/docs/key-value.mdx");
    expect(page).not.toContain("<ComponentPreview");
    expect(page).toContain("The label column is fixed, not measured");
    expect(page).toContain("An unusable `width` reads as the default");
  });
});
