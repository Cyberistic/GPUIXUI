import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sidebarPages } from "./sidebar-pages.test-util";

/**
 * The block pages.
 *
 * A block is a page-level recipe: a browser reproduction plus the real
 * `@gpuixui/*` source. The reproduction comes from `blocks.tsx`, and a page
 * whose `BlockPreview` name is not in that registry throws at render, while a
 * registered block with no page is dead code nothing links to. Neither shows up
 * in the build, so the two are held together here.
 *
 * The dashboard page is also where the chart gap is explained, and that
 * explanation drifted: it said GPUix paints `<svg source>` "natively, so this is
 * not a DOM widget", while the measured rule is one tint per element. The
 * claims are held to the capability record.
 */

const here = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const pageDir = new URL("../../content/docs/blocks/", import.meta.url);
const registry = here("../components/docs/blocks.tsx");
const record = here("../../../../docs/gpuix-capabilities.md");

interface BlockEntry {
  readonly key: string;
  readonly slug: string;
}

/** The `name`/`slug` pair of each registry entry, read from its own source. */
const entries: ReadonlyArray<BlockEntry> = [
  ...registry.matchAll(
    /^ {2}"([a-z0-9-]+)": \{\n {4}name: "([a-z0-9-]+)",\n {4}slug: "([a-z0-9-]+)",/gm,
  ),
].flatMap((match) => {
  const [, key, name, slug] = match;
  if (key === undefined || name === undefined || slug === undefined) {
    throw new Error("a blocks.tsx entry did not match name/slug");
  }
  // The map key and the block's own name are two spellings of one identity.
  if (key !== name) throw new Error(`block ${key} names itself ${name}`);
  return [{ key, slug }];
});

const pageFiles = readdirSync(pageDir).filter(
  (file) => file.endsWith(".mdx") && file !== "index.mdx",
);
const pageFor = (slug: string): string =>
  here(`../../content/docs/blocks/${slug}.mdx`);

const isPageList = (value: unknown): value is ReadonlyArray<string> =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

describe("the block pages", () => {
  it("registers every page, and has a page for every registered block", () => {
    expect(entries.length).toBeGreaterThanOrEqual(3);

    // Both directions, without sorting: a page with no block is a preview that
    // throws, and a block with no page is code nothing links to.
    const registered = entries.map(({ slug }) => `${slug}.mdx`);
    expect(pageFiles.filter((file) => !registered.includes(file))).toEqual([]);
    expect(registered.filter((file) => !pageFiles.includes(file))).toEqual([]);
  });

  it("mounts the registry key each page names", () => {
    const problems = entries.flatMap(({ key, slug }) =>
      pageFor(slug).includes(`<BlockPreview name="${key}" />`)
        ? []
        : [`${slug}.mdx does not mount BlockPreview name="${key}"`],
    );

    expect(problems).toEqual([]);
  });

  it("lists every page in the Blocks sidebar", () => {
    const meta: unknown = JSON.parse(
      here("../../content/docs/blocks/meta.json"),
    );
    const listed =
      typeof meta === "object" && meta !== null && "pages" in meta
        ? meta.pages
        : undefined;

    expect(isPageList(listed)).toBe(true);
    const pages = isPageList(listed) ? listed : [];
    expect(entries.filter(({ slug }) => !pages.includes(slug))).toEqual([]);
    expect(sidebarPages(new URL("../../", import.meta.url))).toContain(
      "blocks",
    );
  });
});

describe("the dashboard page's chart gap", () => {
  const dashboard = pageFor("dashboard");

  it("labels the preview and states the one-tint rule", () => {
    expect(record).toContain("as one tint");
    expect(dashboard).toContain("browser reproduction");
    expect(dashboard).toContain("one tint");
    expect(dashboard).toContain("stacked");
    expect(dashboard).not.toContain("not a DOM widget");
  });

  it("hands the recipe the same rule", () => {
    const recipe = here("../components/docs/dashboard.tsx");

    expect(recipe).toContain("one stacked <Chart>");
    expect(recipe).toContain("style={{ color }}");
  });
});
