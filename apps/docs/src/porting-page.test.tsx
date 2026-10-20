import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { bySlug } from "@/component-meta/registry";
import { roadmapTargets } from "@/lib/roadmap.generated";
import {
  portedComponents,
  portedConcepts,
  shadcnNames,
  unportedComponents,
} from "@/lib/porting";
import { search } from "@/lib/search";
import { source } from "@/lib/source";
import { absentStylingConcepts } from "@/lib/styling";
import { getMDXComponents } from "./components/mdx";
import {
  PortingComponents,
  PortingConcepts,
  PortingGaps,
} from "./components/porting-tables";

/**
 * Guards `/docs/porting-from-shadcn` (plan 611). The page exists to answer the
 * question a shadcn/ui reader arrives with, and every answer is a claim about
 * this repository: a mapped component must be a delivered registry record, a
 * "no counterpart" row must be a Tier 3–5 target that is still `todo`, and a
 * React idiom must name a file that exists and a page that explains it.
 *
 * The failures worth catching: a renamed component leaves the table pointing at
 * a page that 404s, a roadmap target ships and the page keeps calling it
 * missing, an evidence path rots, a table is unregistered for MDX (the page
 * then renders empty — plan 581's class), and the page claims CSS support the
 * runtime does not have.
 */
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const contentRoot = join(repoRoot, "apps/docs/content/docs");
const pagePath = join(contentRoot, "porting-from-shadcn.mdx");
const pageUrl = "/docs/porting-from-shadcn";

const pageUrls = new Set(source.getPages().map((page) => page.url));

const sidebar = Schema.Struct({ pages: Schema.Array(Schema.String) });
const decodeSidebar = Schema.decodeUnknownSync(Schema.fromJsonString(sidebar));

describe("the shadcn/ui porting page", () => {
  it("maps every shadcn component to a delivered record", () => {
    const unresolved = portedComponents.flatMap((component) => {
      const record = bySlug.get(component.slug);
      if (record === undefined)
        return [`${component.shadcn} → ${component.slug}`];
      if (record.status === "planned") {
        return [`${component.shadcn} → ${component.slug} is planned`];
      }
      return [];
    });
    expect(unresolved).toEqual([]);
  });

  it("names each shadcn component and each record once", () => {
    const duplicates = shadcnNames.filter(
      (name, index) => shadcnNames.indexOf(name) !== index,
    );
    const slugs = portedComponents.map((component) => component.slug);
    const repeated = slugs.filter(
      (slug, index) => slugs.indexOf(slug) !== index,
    );
    expect(duplicates).toEqual([]);
    expect(repeated).toEqual([]);
  });

  it("writes a real note for every row", () => {
    const empty = [
      ...portedComponents.map((row) => [row.shadcn, row.note] as const),
      ...portedConcepts.map(
        (row) => [row.concept, `${row.shadcn} ${row.here}`] as const,
      ),
      ...unportedComponents.map((row) => [row.shadcn, row.note] as const),
    ]
      .filter(([, text]) => text.trim().length === 0)
      .map(([name]) => name);
    expect(empty).toEqual([]);
  });

  it("only calls a shipped target missing", () => {
    const deliveredTitles = new Set(
      [...bySlug.values()].map((record) => record.title),
    );
    const drifting = unportedComponents.flatMap((component) => {
      const target = roadmapTargets.find(
        (entry) => entry.name === component.roadmap,
      );
      if (target === undefined) return [`${component.roadmap} is not a target`];
      if (target.status !== "todo") {
        return [`${component.roadmap} is ${target.status}`];
      }
      if (deliveredTitles.has(component.roadmap)) {
        return [`${component.roadmap} is a delivered record`];
      }
      return [];
    });
    expect(drifting).toEqual([]);
  });

  it("points every concept at a file that exists and a page it serves", () => {
    const broken = portedConcepts.flatMap((concept) => {
      const missingEvidence = existsSync(join(repoRoot, concept.evidence))
        ? []
        : [`${concept.concept}: ${concept.evidence}`];
      const missingPage = pageUrls.has(concept.href)
        ? []
        : [`${concept.concept}: ${concept.href}`];
      return [...missingEvidence, ...missingPage];
    });
    expect(broken).toEqual([]);
  });

  it("renders one row per data entry", () => {
    const components = renderToStaticMarkup(<PortingComponents />);
    const concepts = renderToStaticMarkup(<PortingConcepts />);
    const gaps = renderToStaticMarkup(<PortingGaps />);
    expect(components.match(/data-porting-from="/g)).toHaveLength(
      portedComponents.length,
    );
    expect(concepts.match(/data-porting-concept="/g)).toHaveLength(
      portedConcepts.length,
    );
    expect(gaps.match(/data-porting-gap="/g)).toHaveLength(
      unportedComponents.length,
    );
    expect(portedComponents.length).toBeGreaterThan(30);
    expect(portedConcepts.length).toBeGreaterThan(4);
    expect(unportedComponents.length).toBeGreaterThan(2);
  });

  it("links every mapped record to its own page", () => {
    const html = renderToStaticMarkup(<PortingComponents />);
    expect(html).toContain('href="/docs/components/confirm-dialog"');
    portedComponents.forEach((component) => {
      expect(html).toContain(`href="/docs/components/${component.slug}"`);
    });
  });

  it("is registered for MDX and ordered in the sidebar", () => {
    expect(getMDXComponents().PortingComponents).toBe(PortingComponents);
    expect(getMDXComponents().PortingConcepts).toBe(PortingConcepts);
    expect(getMDXComponents().PortingGaps).toBe(PortingGaps);
    expect(pageUrls.has(pageUrl)).toBe(true);
    const meta = decodeSidebar(
      readFileSync(join(contentRoot, "meta.json"), "utf8"),
    );
    const order = meta.pages.indexOf("porting-from-shadcn");
    expect(order).toBe(meta.pages.indexOf("getting-started") + 1);
    expect(meta.pages[order + 1]).toBe("showcase");
  });

  it("keeps the tables and headings the page promises", () => {
    const page = readFileSync(pagePath, "utf8");
    const required = [
      "<PortingComponents />",
      "<PortingConcepts />",
      "<PortingGaps />",
      "## What maps across",
      "## What changes in the code",
      "## A port in practice",
      "## What has no counterpart yet",
    ];
    expect(required.filter((block) => !page.includes(block))).toEqual([]);
  });

  it("counts no row total in prose", () => {
    const page = readFileSync(pagePath, "utf8");
    const counted =
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+shadcn\s+components/i;
    expect(page).not.toMatch(counted);
  });

  it("links the page that owns the CSS vocabulary instead of denying it", () => {
    const concepts = absentStylingConcepts.map((concept) => concept.concept);
    expect(concepts).toContain("className and CSS classes");
    expect(concepts).toContain("Stylesheets and Tailwind");
    expect(readFileSync(pagePath, "utf8")).toContain("/docs/styling");
  });
});

describe(
  "the adoption vocabulary reaches the page",
  { timeout: 120_000 },
  () => {
    it.each(["migration", "shadcn", "aschild"])(
      "%s reaches the page",
      async (query) => {
        const [first] = await search(query);
        expect(first?.url).toBe(pageUrl);
      },
    );
  },
);
