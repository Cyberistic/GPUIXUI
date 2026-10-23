import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `docs/preview-strategy.md` is the site's policy document: the page template,
 * the honesty rule for previews, and the guard that holds each claim.
 *
 * Bug guarded: a merge of `agent/docs-prune` left its conflict block in the
 * committed file — `<<<<<<< HEAD`, the page-edit section, `=======`, the
 * curated-template paragraph, `>>>>>>> origin/agent/docs-prune` — between the
 * template table and the sections below it. It also left the Related section
 * twice, once claiming "No mounted page writes `## Related`" while the other
 * copy said 31 of 104 do. Both halves of the conflict were wanted; the markers
 * and the duplicated claim were not. Every site test stayed green, because
 * nothing read the policy as a document.
 *
 * The scan is repo-wide on purpose. Five agents merge into this checkout, so a
 * conflict marker can land in a policy document or a rendered page without any
 * one workstream seeing it; a marker in a page is shipped prose to a reader.
 *
 * The reads are synchronous because this is a test boundary and the rest of the
 * site's suites walk the tree the same way (`package-docs.test.ts`).
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const markdownUnder = (directory: string): ReadonlyArray<string> =>
  readdirSync(new URL(directory, root), { recursive: true })
    .map(String)
    .filter((name) => /\.mdx?$/.test(name))
    .map((name) => `${directory}/${name}`);

const policyDocs = readdirSync(new URL("docs", root))
  .filter((name) => name.endsWith(".md"))
  .map((name) => `docs/${name}`);

const sitePages = markdownUnder("apps/docs/content/docs");

const packagePages = readdirSync(new URL("packages", root), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) =>
    existsSync(new URL(`packages/${entry.name}/docs`, root))
      ? markdownUnder(`packages/${entry.name}/docs`)
      : [],
  );

const documents = [
  ...policyDocs,
  "apps/docs/README.md",
  ...sitePages,
  ...packagePages,
];

/** The two lines a merge writes; `=======` alone is a setext heading. */
const conflictMarkers = (text: string): ReadonlyArray<number> =>
  text.split("\n").flatMap((line, index) =>
    /^(<<<<<<<|>>>>>>>) /.test(line) ? [index + 1] : [],
  );

describe("the preview strategy document", () => {
  it("reads the policy, the site and every package page", () => {
    // Floors, so a walk that stopped matching cannot pass on an empty list.
    expect(policyDocs.length).toBeGreaterThanOrEqual(5);
    expect(sitePages.length).toBeGreaterThanOrEqual(40);
    expect(packagePages.length).toBeGreaterThanOrEqual(100);
    expect(documents).toContain("docs/preview-strategy.md");
  });

  it("keeps every document free of merge-conflict markers", () => {
    const marked = documents.flatMap((path) => {
      const lines = conflictMarkers(read(path));

      return lines.length === 0 ? [] : [`${path}: ${lines.join(", ")}`];
    });

    expect(marked).toEqual([]);
  });

  it("states the template guard each kind of page answers to", () => {
    const policy = read("docs/preview-strategy.md").replace(/\s+/g, " ");

    expect(policy).toContain(
      "`src/lib/component-page.test.ts` checks every curated page",
    );
    expect(policy).toContain("**resolves the API table**");
    expect(policy).toContain(
      "`src/lib/package-page-template.test.ts` holds every package page",
    );
  });

  it("keeps one Related paragraph and no claim that no page writes one", () => {
    const policy = read("docs/preview-strategy.md").replace(/\s+/g, " ");
    const paragraphs = policy.match(
      /`related-strip\.test\.tsx` holds the rendered line/g,
    );

    expect(paragraphs).toHaveLength(1);
    expect(policy).not.toContain("No mounted page writes `## Related`");
    expect(policy).toContain("the silence for a page that writes the section");
  });
});
