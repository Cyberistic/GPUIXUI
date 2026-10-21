import { readFileSync } from "node:fs";
import { contrastFloors, contrastRatio } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";

/**
 * The two theming pages state facts about `@gpuixui/tokens` that the package
 * changes.
 *
 * Both drifted once: `/docs/themes` printed "24 role pairs" after the contrast
 * table grew to 28, `/docs/theming`'s brand snippet painted the dark
 * theme's near-black label on a violet fill — 4.24:1, under the 4.5:1 floor the
 * package's own contract enforces — and the same page printed "47 semantic
 * roles" as a literal. A reader copying that snippet shipped the
 * defect the docs describe how to avoid.
 *
 * A page cannot drift again: the pair count is interpolated from
 * `contrastPairs` in the page itself, so it has no number to fall behind, the
 * colour-role count is interpolated from `colorRoles`, and the brand snippet is
 * measured here.
 */

const page = (name: string): string =>
  readFileSync(new URL(`../../content/docs/${name}`, import.meta.url), "utf8");

/** The `## Contrast` section of a page, without its following siblings. */
const section = (body: string, heading: string): string => {
  const start = body.indexOf(`## ${heading}`);
  const end = body.indexOf("\n## ", start + 1);
  return start === -1 ? "" : body.slice(start, end === -1 ? undefined : end);
};

/**
 * The colours the brand snippet sets, as the snippet writes them. Reading the
 * page rather than a copy is the point: the snippet is what a reader copies.
 */
const snippetColours = (body: string): Readonly<Record<string, string>> => {
  const snippet = body
    .split("```")
    .filter(
      (fence) =>
        fence.includes("export const") && fence.includes("createTheme({"),
    )
    .join("");
  return Object.fromEntries(
    [...snippet.matchAll(/(\w+): "(#[0-9A-Fa-f]{6})"/g)].flatMap((match) =>
      match[1] === undefined || match[2] === undefined
        ? []
        : [[match[1], match[2]]],
    ),
  );
};

describe("the theme page", () => {
  it("derives the contrast pair count instead of printing one", () => {
    const contrast = section(page("themes.mdx"), "Contrast");

    expect(contrast).toContain("contrastPairs.length");
    expect(contrast).not.toMatch(/\b\d+ role pairs\b/);
  });

  it("imports the count it derives", () => {
    expect(page("themes.mdx")).toContain(
      'import { contrastPairs } from "@gpuixui/tokens";',
    );
  });
});

describe("the theming page's role count", () => {
  it("derives the number of colour roles instead of printing one", () => {
    const body = page("theming.mdx");

    expect(body).toContain('import { colorRoles } from "@gpuixui/tokens";');
    expect(body).toContain("{colorRoles.length} semantic roles");
    expect(body).toContain("There are {colorRoles.length} of them");
    // A printed count is the defect this guards: it cannot follow the package.
    expect(body).not.toMatch(/\b\d+ semantic roles\b/);
    expect(body).not.toMatch(/There are \d+ of them/);
  });
});

describe("the theming page's brand snippet", () => {
  const colours = snippetColours(page("theming.mdx"));

  it("owns the label colour of the fill it overrides", () => {
    expect(colours.primary).toBeDefined();
    expect(colours.primaryForeground).toBeDefined();
  });

  it("paints that label at the package's secondary-text floor", () => {
    const fill = colours.primary ?? "";
    const label = colours.primaryForeground ?? "";
    const measured = contrastRatio(label, fill);

    expect(measured).toBeDefined();
    expect(measured ?? 0).toBeGreaterThanOrEqual(contrastFloors.secondary);
  });
});
