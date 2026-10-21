import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { componentIndex } from "../../lib/component-index-data";
import { ComponentIndex } from "./component-index";

/**
 * The index's rendered rows.
 *
 * The page mounts this component instead of listing pages by hand, so the guard
 * is that the rendered list carries every row of the generated index — a page
 * dropped here has no other symptom — and that the count and the control are
 * what a reader sees before typing.
 */

const markup = renderToStaticMarkup(<ComponentIndex />);

describe("the component index", () => {
  it("renders every page in the index", () => {
    expect(componentIndex.length).toBeGreaterThan(60);
    expect(
      componentIndex.filter((entry) => !markup.includes(entry.url)),
    ).toEqual([]);
    expect(
      componentIndex.filter((entry) => !markup.includes(entry.title)),
    ).toEqual([]);
  });

  it("prints the full count before a query narrows it", () => {
    expect(markup).toContain(
      `${componentIndex.length} of ${componentIndex.length} pages`,
    );
  });

  it("labels the filter box for a screen reader", () => {
    expect(markup).toContain(
      "Filter components by name, part, prop or purpose",
    );
    expect(markup).toContain('type="search"');
  });
});
