import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sidebarPages } from "./sidebar-pages.test-util";

const here = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const pageDir = new URL("../../content/docs/blocks/", import.meta.url);
const registry = here("../components/docs/blocks.tsx");

interface BlockEntry {
  readonly key: string;
  readonly slug: string;
}

const entries: ReadonlyArray<BlockEntry> = [
  ...registry.matchAll(
    /^ {2}"?([a-z0-9-]+)"?: \{\n {4}name: "([a-z0-9-]+)",\n {4}slug: "([a-z0-9-]+)",/gm,
  ),
].flatMap((match) => {
  const [, key, name, slug] = match;
  if (key === undefined || name === undefined || slug === undefined) {
    throw new Error("a blocks.tsx entry did not match name/slug");
  }

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

const prose = (page: string): string =>
  page
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

describe("the block pages", () => {
  it("registers every page, and has a page for every registered block", () => {
    expect(entries.length).toBeGreaterThanOrEqual(3);

    const registered = entries.map(({ slug }) => `${slug}.mdx`);
    expect(pageFiles.filter((file) => !registered.includes(file))).toEqual([]);
    expect(registered.filter((file) => !pageFiles.includes(file))).toEqual([]);
  });

  it("mounts the registry key each page names", () => {
    const problems = entries.flatMap(({ key, slug }) => {
      const page = pageFor(slug);

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

  it("links every block to the file that paints it", () => {
    const files = [...registry.matchAll(/^ {4}file: "([^"]+)",$/gm)].flatMap(
      (match) => match[1] ?? [],
    );
    const missing = files.filter(
      (file) => !existsSync(new URL(`../../../../${file}`, import.meta.url)),
    );

    expect(files).toHaveLength(entries.length);
    expect(missing).toEqual([]);
    expect(here("../components/docs/block-preview.tsx")).toContain(
      "Block source on GitHub",
    );
  });

  it("keeps every block page to its preview and one sentence", () => {
    const verbose = entries
      .filter(({ slug }) => slug !== "sidebar")
      .flatMap(({ slug }) => {
        const words = prose(pageFor(slug)).trim().split(/\s+/).filter(Boolean);
        return words.length > 40 ? [`${slug}: ${words.length} words`] : [];
      });

    expect(verbose).toEqual([]);
  });
});

describe("the dashboard's charts", () => {
  const drawing = here("../components/docs/dashboard.tsx");
  const recipe = drawing;

  it("draws with the package's chart geometry, not a second implementation", () => {
    expect(drawing).toContain('from "@gpuixui/data/chart/logic"');
    expect(drawing).toContain("stackedBarMarks");
    expect(drawing).toContain("groupedBarMarks");
    expect(drawing).toContain("ringSegments");
    expect(drawing).not.toContain("hourlyBars");
  });

  it("curves every block chart through the package, not a local spline", () => {
    for (const file of ["dashboard-01.tsx", "charts-demo.tsx"]) {
      const source = here(`../components/docs/${file}`);
      expect(source, file).not.toContain("chart-smooth");
      expect(source, file).toContain("curvePath");
    }
    expect(
      existsSync(
        new URL("../components/docs/chart-smooth.ts", import.meta.url),
      ),
    ).toBe(false);
  });

  it("composes the charts the data package ships", () => {
    expect(recipe).toContain('} from "@gpuixui/data"');
    expect(
      ["BarChart", "DonutChart", "StackedBar"].flatMap((part) =>
        recipe.includes(part) ? [] : [part],
      ),
    ).toEqual([]);
  });

  it("hands the recipe no placeholder geometry", () => {
    expect(recipe).not.toMatch(/markup="\/\*/);
    expect(recipe).not.toContain("no chart component");
  });
});
