import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { packagePreviews } from "./package-preview";

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

const curatedPages = readdirSync(
  new URL("apps/docs/content/docs/components", root),
)
  .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
  .map((name) => `apps/docs/content/docs/components/${name}`);

const curatedTitles = curatedPages
  .map((path) => /^title:\s*(.+)$/m.exec(read(path))?.[1]?.trim() ?? path)
  .toSorted();

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
  text
    .split("\n")
    .flatMap((line, index) =>
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

  it("names every curated page in the policy's list, and no page it lacks", () => {
    // Bug guarded: the list is prose beside generated navigation, so a page
    // added to `content/docs/components` — or one whose title moved — left the
    // bullet behind while the sidebar grew, and an advertised name with no page
    // was equally silent.
    const policy = read("docs/preview-strategy.md");
    const block =
      policy
        .split("Curated today:")[1]
        ?.split("`src/lib/component-preview.test.ts`")[0] ?? "";
    const listed = block
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\.$/, "")
      .split(",")
      .map((name) => name.trim())
      .toSorted();

    const missing = curatedTitles.filter((title) => !listed.includes(title));
    const extra = listed.filter((title) => !curatedTitles.includes(title));

    expect(curatedTitles.length).toBeGreaterThanOrEqual(30);
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it("names only guard files the site still carries", () => {
    // Bug guarded: the prune deleted `accessibility-page.test.ts` and renamed
    // `native-run-note.test.ts` to `.tsx`, and the policy kept citing both
    // paths, so a reader following a claim about a guard landed on no file.
    const policy = read("docs/preview-strategy.md");
    const cited = [...policy.matchAll(/`(src\/[^`]+\.test\.tsx?)`/g)].flatMap(
      (match) => (match[1] === undefined ? [] : [match[1]]),
    );

    expect(cited.length).toBeGreaterThanOrEqual(20);
    expect(
      cited.filter((path) => !existsSync(new URL(`apps/docs/${path}`, root))),
    ).toEqual([]);
  });

  it("does not claim a preview every component page ships", () => {
    // Bug guarded: the policy said "A page that ships a demo — every component
    // and primitive page does". When this case was written `MultiStepForm`
    // shipped none — the caller owns its state — so that page was strategy 4;
    // every component page mounts one now, and the rule still has to allow a
    // page that ships none. The pages that mount one are measured by
    // `native-run-note.test.ts`; this case keeps the sentence from promising
    // the rest.
    const policy = read("docs/preview-strategy.md").replace(/\s+/g, " ");

    expect(policy).not.toContain("every component and primitive page does");
    expect(policy).toContain(
      "A page that ships a demo mounts it exactly as a curated page does",
    );
    expect(policy).toContain(
      "A page that ships none has only its source and limitations",
    );
  });

  it("names every demo outside the component and primitive lanes", () => {
    // Bug guarded: the policy said every lane but Components and Primitives was
    // strategy 4, while the Property panels page draws its composition and the
    // media lane draws all five of its surfaces. A lane that starts drawing has
    // to ask the policy to say so, and a page that loses its demo has to ask it
    // too.
    //
    // A package page may draw through its own `<ComponentPreview>` or through
    // the site's table (`src/lib/package-preview.ts`), because the package's
    // Markdown is the package's to write; both count as the page drawing.
    const lanes = ["data", "dock", "editor", "files", "media", "shell"];
    const siteMounted = packagePreviews.map(
      (row) => `packages/${row.origin}/docs/${row.path}`,
    );
    const withDemo = packagePages.filter(
      (path) =>
        lanes.some((lane) => path.startsWith(`packages/${lane}/docs/`)) &&
        (read(path).includes("<ComponentPreview") ||
          siteMounted.includes(path)),
    );

    expect(withDemo).toEqual([
      "packages/data/docs/advanced-filter.mdx",
      "packages/data/docs/charts.mdx",
      "packages/data/docs/column-configuration.mdx",
      "packages/data/docs/property-panel.mdx",
      "packages/data/docs/stat-card.mdx",
      "packages/data/docs/table-selection.mdx",
      "packages/data/docs/table-sorting.mdx",
      "packages/data/docs/tree-view.mdx",
      "packages/data/docs/virtual-tree.mdx",
      "packages/data/docs/virtualization.mdx",
      "packages/dock/docs/dock-layout.mdx",
      "packages/dock/docs/panel-group.mdx",
      "packages/dock/docs/split-pane.mdx",
      "packages/editor/docs/code-editor.mdx",
      "packages/editor/docs/diff-viewer.mdx",
      "packages/editor/docs/markdown-editor.mdx",
      "packages/editor/docs/search-replace.mdx",
      "packages/files/docs/file-tree.mdx",
      "packages/files/docs/log-viewer.mdx",
      "packages/files/docs/property-panel.mdx",
      "packages/media/docs/crop-area.mdx",
      "packages/media/docs/drop-zone.mdx",
      "packages/media/docs/file-upload.mdx",
      "packages/media/docs/image-preview.mdx",
      "packages/media/docs/media-player.mdx",
      "packages/media/docs/qr-code.mdx",
      "packages/shell/docs/app-menu.mdx",
      "packages/shell/docs/status-bar.mdx",
      "packages/shell/docs/toolbar.mdx",
    ]);
    const policy = read("docs/preview-strategy.md").replace(/\s+/g, " ");
    expect(policy).toContain("Property panels");
    expect(policy).toContain("The data lane draws ten surfaces");
    expect(policy).toContain("the media lane draws all six of its surfaces");
    expect(policy).toContain("the editor lane draws all four of its own");
    expect(policy).toContain("the files lane draws its three surfaces");
    expect(policy).toContain("the shell lane draws its three surfaces");
    expect(policy).toContain("`src/lib/package-preview.ts`");
  });

  it("states the Related rule without a count the pages can outgrow", () => {
    // Bug guarded: the policy said "31 of the 104 mounted package pages" write
    // `## Related`. The prune then removed thirty of those sections and the
    // collections grew to 140 pages, so both numbers were wrong and the strip's
    // silence read as dead code. The rule is count-free now; the retired
    // figures and the count-shaped sentence must not return.
    const policy = read("docs/preview-strategy.md").replace(/\s+/g, " ");
    const rule =
      /a page that writes `## Related`[^.]*\./.exec(policy)?.[0] ?? "";

    expect(rule).toContain("stays silent");
    expect(rule).not.toMatch(/\d+ of the/);
    expect(policy).not.toContain("31 of the");
    expect(policy).not.toContain("other sixty");
    expect(policy).not.toContain("seventy-odd");
  });
});
