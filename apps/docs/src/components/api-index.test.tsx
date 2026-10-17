import { renderToStaticMarkup } from "react-dom/server";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import { ApiIndex } from "./api-index";

/**
 * Guards the generated API reference index (plan 441). The index is the only
 * place a reader can see the whole API surface at once, so the failures worth
 * catching are a delivered component silently missing from it, a link that
 * points at a page or anchor that does not exist, and a row that shows a title
 * but not the props type it documents.
 *
 * Every delivered component owes an API table (`component-pages.test.ts`), so
 * the index lists exactly the non-planned records — not merely the records that
 * happen to declare a type today.
 */
const html = renderToStaticMarkup(<ApiIndex />);
const delivered = components.filter(
  (component) => component.status !== "planned",
);

describe("API index", () => {
  it("lists every delivered component, once", () => {
    const rows = html.match(/data-api-slug="/g) ?? [];
    expect(rows).toHaveLength(delivered.length);
    expect(new Set(delivered.map((component) => component.slug)).size).toBe(
      delivered.length,
    );
  });

  it("links each row to the table on its own page", () => {
    Arr.forEach(delivered, (component) => {
      expect(html).toContain(
        `href="/docs/components/${component.slug}#api-reference"`,
      );
    });
  });

  it("names the props types, not only the component", () => {
    expect(
      delivered
        .filter((component) => component.api.length === 0)
        .map((component) => component.slug),
    ).toEqual([]);
    Arr.forEach(delivered, (component) => {
      Arr.forEach(component.api, (name) => {
        expect(html).toContain(name);
      });
    });
  });

  it("never links a component that has no page yet", () => {
    components
      .filter((component) => component.status === "planned")
      .forEach((component) => {
        expect(html).not.toContain(
          `href="/docs/components/${component.slug}#api-reference"`,
        );
      });
  });
});
