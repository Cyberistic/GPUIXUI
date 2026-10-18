import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoadmapTable } from "./components/roadmap-table";
import { roadmapTargets } from "./lib/roadmap.generated";

/**
 * Guards the roadmap page (plan 518). The table is rendered React from a
 * generated module, so a page test is the only place that can see both halves:
 * the MDX must keep the block, the sidebar must keep the entry, and the rendered
 * rows must be exactly the generated targets — no hand-written row and no
 * silently dropped one.
 *
 * `node:fs` is deliberate: this is a vitest boundary reading content, like
 * `component-pages.test.ts` and `capability-matrix`'s page tests.
 */

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const page = readFileSync(join(appRoot, "content/docs/roadmap.mdx"), "utf8");
const meta = readFileSync(join(appRoot, "content/docs/meta.json"), "utf8");
const markup = renderToStaticMarkup(<RoadmapTable />);

const targets = [...markup.matchAll(/data-roadmap-target="([^"]+)"/g)].flatMap(
  (match) => (match[1] === undefined ? [] : [match[1]]),
);

describe("the roadmap page", () => {
  it("keeps its frontmatter and renders the generated table", () => {
    expect(page).toContain("title: Roadmap");
    expect(page).toContain(
      "description: Every component target in the inventory",
    );
    expect(page).toContain("<RoadmapTable />");
  });

  it("sits directly after Components in the sidebar", () => {
    expect(meta).toMatch(/"components",\s*"roadmap"/);
  });

  it("names the status vocabulary and no placeholder", () => {
    expect(page).toContain("## What a status means");
    expect(page).toContain("`done`");
    expect(page).not.toMatch(/coming soon|\bTODO\b/);
  });

  it("links the delivered work and the tier evidence", () => {
    const links = [
      "/docs/components",
      "/docs/data-display",
      "/docs/workspace",
      "/docs/capabilities",
      "/docs/patterns",
    ];
    expect(links.filter((href) => !page.includes(`](${href})`))).toEqual([]);
  });
});

describe("the rendered roadmap", () => {
  it("renders exactly the generated targets, in both directions", () => {
    const expected = roadmapTargets.map((target) => target.name);
    expect(targets.filter((name) => !expected.includes(name))).toEqual([]);
    expect(expected.filter((name) => !targets.includes(name))).toEqual([]);
    expect(new Set(targets).size).toBe(targets.length);
  });

  it("renders a heading and a derived count for each tier", () => {
    const missing = ([3, 4, 5] as const).flatMap((tier) => {
      const count = roadmapTargets.filter(
        (target) => target.tier === tier,
      ).length;
      return [
        ...(markup.includes(`id="tier-${tier}"`) ? [] : [`heading ${tier}`]),
        ...(markup.includes(`${count} tracked`) ? [] : [`count ${tier}`]),
      ];
    });
    expect(missing).toEqual([]);
  });

  it("links each tier to the page that explains it", () => {
    const expected = [
      "/docs/data-display",
      "/docs/workspace",
      "/docs/capabilities",
    ];
    expect(
      expected.filter((href) => !markup.includes(`href="${href}"`)),
    ).toEqual([]);
  });

  it("keeps every note readable as spans, not raw Markdown", () => {
    expect(markup).not.toContain("**");
    expect(markup).not.toContain("`");
    expect(markup).toContain("onVisibleRange");
  });
});
