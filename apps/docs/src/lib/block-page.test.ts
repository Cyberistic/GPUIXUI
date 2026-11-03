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
 * The dashboard page is also where a chart's runtime rule is explained, and that
 * explanation drifted once: it said GPUix paints `<svg source>` "natively, so
 * this is not a DOM widget", while the measured rule is one tint per element.
 * The claims are held to the capability record, and the recipe is held to the
 * charts `@gpuixui/data` actually ships.
 */

const here = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const pageDir = new URL("../../content/docs/blocks/", import.meta.url);
const registry = here("../components/docs/blocks.tsx");

interface BlockEntry {
  readonly key: string;
  readonly slug: string;
}

/** The `name`/`slug` pair of each registry entry, read from its own source. */
const entries: ReadonlyArray<BlockEntry> = [
  ...registry.matchAll(
    /^ {2}"?([a-z0-9-]+)"?: \{\n {4}name: "([a-z0-9-]+)",\n {4}slug: "([a-z0-9-]+)",/gm,
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
  (file) => file.endsWith(".mdx") && file !== "index.mdx" && file !== "all.mdx",
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
    const problems = entries.flatMap(({ key, slug }) => {
      const page = pageFor(slug);
      // A collection page (the sidebar family) mounts one example per section
      // instead of one `<BlockPreview>`; its own guard holds the sixteen.
      const mounted =
        page.includes(`<BlockPreview name="${key}" />`) ||
        page.includes("<SidebarExample ");
      return mounted ? [] : [`${slug}.mdx does not mount ${key}`];
    });

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

  it("teaches one conversation dress per platform the block paints", () => {
    // Bug guarded: the page said "three platform dresses" and listed macOS,
    // Windows 11 and Linux while the block ships a fourth, Omarchy.
    const block = here("../components/docs/conversations-block.tsx");
    const names = [
      ...(
        block.split("export type ConversationPlatform = ")[1]?.split(";")[0] ??
        ""
      ).matchAll(/"(\w+)"/g),
    ].flatMap((match) => match[1] ?? []);
    const labels: Readonly<Record<string, string>> = {
      macos: "macOS",
      windows: "Windows 11",
      linux: "Linux (Breeze dark)",
      omarchy: "Omarchy",
    };
    const words = ["zero", "one", "two", "three", "four", "five"];
    const page = pageFor("conversations").replace(/\s+/g, " ");

    expect(names).toEqual(["macos", "windows", "linux", "omarchy"]);
    expect(page).toContain(`## The ${words[names.length]} dresses`);
    names.forEach((name) => {
      expect(page).toContain(`**${labels[name]}**`);
    });
    expect(page).not.toMatch(/three platform dresses|all three/);
  });
});

describe("the dashboard page", () => {
  const dashboard = pageFor("dashboard");
  const recipe = here(
    "../../../../examples/blocks/src/dashboard/dashboard.tsx",
  );

  it("describes the block it mounts, not a reproduction of it", () => {
    // Bug guarded: the page called the preview a "browser reproduction" because
    // the recipe was a hand-drawn picture of a dashboard. The preview now mounts
    // the native block, so a page that still calls it a reproduction is lying
    // about what the reader is looking at.
    expect(dashboard).toContain('<BlockPreview name="dashboard-01" />');
    expect(dashboard).not.toContain("browser reproduction");
    expect(dashboard).not.toContain("drawn by hand");
  });

  it("names the parts the recipe composes", () => {
    // Bug guarded: the page's composition list named charts the recipe did not
    // import, so a reader who pasted it got a screen that did not match the list.
    expect(recipe).toContain('} from "@gpuixui/data"');
    expect(recipe).toContain('} from "@gpuixui/components/sidebar"');
    expect(recipe).toContain('} from "@gpuixui/components/tabs"');
    expect(
      ["Sidebar", "LineChart", "Table", "Tabs", "Badge", "ToggleGroup"].flatMap(
        (part) => (dashboard.includes(part) ? [] : [part]),
      ),
    ).toEqual([]);
  });

  it("hands the recipe no placeholder geometry", () => {
    // A `markup="/* … */"` string is not geometry: it is a comment where a
    // chart should be, and a reader who pasted the recipe got a blank panel.
    expect(recipe).not.toMatch(/markup="\/\*/);
    expect(recipe).not.toContain("no chart component");
    expect(dashboard).not.toContain("Charts are a gap");
  });
});
