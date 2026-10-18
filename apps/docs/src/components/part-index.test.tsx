import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { components } from "@/component-meta/registry";
import { getMDXComponents } from "./mdx";
import { PartIndex } from "./part-index";

/**
 * Guards the generated parts index on `/docs/component-api` (plan 482). A
 * compound component's parts are its public API — `DialogTitle`,
 * `TabsTrigger`, `BreadcrumbItem` — and plan 479 made every record declare
 * them. The index is the one page a reader can scan them from, so the failures
 * worth catching are a compound record silently missing, a link to a page that
 * does not exist, and a part name the record declares but the index drops.
 */
const html = renderToStaticMarkup(<PartIndex />);
const compound = components.filter((component) => component.parts.length > 0);

describe("part index", () => {
  /**
   * The bug this guards (measured 2026-10-18): the page used `<PartIndex />`
   * before it was added to the MDX component map, so the built page rendered
   * without an `<h1>` or `<main>` and only the production crawl noticed. A
   * component the tests render directly is not automatically available to MDX.
   */
  it("is registered for MDX, not only for its own test", () => {
    expect(getMDXComponents().PartIndex).toBe(PartIndex);
  });

  it("lists every component that declares parts, once", () => {
    const rows = html.match(/data-part-slug="/g) ?? [];
    expect(rows).toHaveLength(compound.length);
    expect(compound.length).toBeGreaterThan(20);
    expect(new Set(compound.map((component) => component.slug)).size).toBe(
      compound.length,
    );
  });

  it("links each record to its own page", () => {
    compound.forEach((component) => {
      expect(html).toContain(`href="/docs/components/${component.slug}"`);
    });
  });

  it("names every declared part", () => {
    const missing = compound.flatMap((component) =>
      component.parts
        .filter((part) => !html.includes(`<code>${part.name}</code>`))
        .map((part) => `${component.slug}: ${part.name}`),
    );
    expect(missing).toEqual([]);
  });

  it("marks the stateful and workspace records the template gives extra sections", () => {
    compound
      .filter((component) => component.pattern !== "static")
      .forEach((component) => {
        expect(html).toContain(`>${component.pattern}</span>`);
      });
  });

  it("omits a single-region component, which has no parts to list", () => {
    components
      .filter((component) => component.parts.length === 0)
      .forEach((component) => {
        expect(html).not.toContain(`data-part-slug="${component.slug}"`);
      });
  });
});
