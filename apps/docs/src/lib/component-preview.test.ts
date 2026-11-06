import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demos } from "../components/docs/demos";
import { packagePreviews } from "./package-preview";

const contentDir = new URL("../../content/docs/", import.meta.url);
const root = new URL("../../../../", import.meta.url);

const sitePages = (): ReadonlyArray<readonly [string, string]> =>
  readdirSync(contentDir, {
    encoding: "utf8",
    recursive: true,
  })
    .filter((name) => name.endsWith(".mdx"))
    .map(
      (name) =>
        [
          `content/docs/${name}`,
          readFileSync(new URL(name, contentDir), "utf8"),
        ] as const,
    );

const packagePages = (): ReadonlyArray<readonly [string, string]> =>
  readdirSync(new URL("packages/", root), { withFileTypes: true }).flatMap(
    (entry) => {
      if (!entry.isDirectory()) return [];
      const docs = new URL(`packages/${entry.name}/docs/`, root);
      if (!existsSync(docs)) return [];
      return readdirSync(docs)
        .filter((name) => name.endsWith(".mdx"))
        .map(
          (name) => [name, readFileSync(new URL(name, docs), "utf8")] as const,
        );
    },
  );

const pages = (): ReadonlyArray<readonly [string, string]> => [
  ...sitePages(),
  ...packagePages(),
];

const mounts = (): ReadonlyArray<readonly [string, string]> => [
  ...pages().flatMap(([name, body]) =>
    [...body.matchAll(/<ComponentPreview\s+name="([^"]+)"/g)].flatMap((match) =>
      match[1] === undefined ? [] : [[match[1], name] as const],
    ),
  ),

  ...packagePreviews.map(
    (row) => [row.demo, `${row.origin}/${row.path}`] as const,
  ),
];

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const block = (css: string, selector: string): string => {
  const pattern = new RegExp(
    `^[ \\t]*${selector.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{`,
    "m",
  );
  const match = pattern.exec(css);
  if (match === null) throw new Error(`no ${selector} block`);
  return css.slice(match.index, css.indexOf("}", match.index));
};

const curated = (): ReadonlyArray<{
  readonly slug: string;
  readonly title: string;
}> =>
  readdirSync(new URL("apps/docs/content/docs/components/", root))
    .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
    .flatMap((name) => {
      const body = read(`apps/docs/content/docs/components/${name}`);
      if (!body.includes("<ComponentPreview")) return [];
      const title = /^title:\s*(.+)$/m.exec(body)?.[1]?.trim();
      return [{ slug: name.replace(/\.mdx$/, ""), title: title ?? "" }];
    });

describe("the component previews", () => {
  it("mount at least one demo, so the scan cannot pass on an empty set", () => {
    expect(mounts().length).toBeGreaterThanOrEqual(Object.keys(demos).length);
  });

  it("name a registered demo on every page", () => {
    const missing = mounts()
      .filter(([key]) => demos[key] === undefined)
      .map(([key, page]) => `${page}: no demo named "${key}"`);

    expect(missing).toEqual([]);
  });

  it("are mounted by a page, so no demo ships dead", () => {
    const referenced = new Set(mounts().map(([key]) => key));

    expect(Object.keys(demos).filter((key) => !referenced.has(key))).toEqual(
      [],
    );
  });

  it("mounts each drawing as its own element, not as a call", () => {
    for (const file of [
      "apps/docs/src/components/docs/component-preview.tsx",
      "apps/docs/src/components/landing/landing.tsx",
    ]) {
      const code = read(file)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(code, file).not.toMatch(/demo\.render\(\)/);
      expect(code, file).toContain("<Drawing />");
    }
  });

  it("carry the native source a reader copies, not an empty code tab", () => {
    const empty = Object.entries(demos)
      .filter(([, demo]) => demo.source.trim().length === 0)
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it("are announced where a reader learns previews exist", () => {
    const pages = curated();
    const strategy = read("docs/preview-strategy.md");
    const list = /Curated today: ([^.]+)\./.exec(strategy)?.[1] ?? "";

    expect(pages.length).toBeGreaterThanOrEqual(5);
    expect(
      pages
        .filter((page) => page.title.length === 0 || !list.includes(page.title))
        .map((page) => page.slug),
    ).toEqual([]);
  });

  it("says the carousel preview draws the corner the recipe fixes", () => {
    const recipes = read("packages/tw/src/recipes.ts");
    const at = recipes.indexOf("export const CAROUSEL_TRACK =");
    expect(
      at === -1 ? "" : recipes.slice(at).split("\n").slice(0, 2).join("\n"),
      "the carousel track lost its fixed radius step",
    ).toContain("rounded-lg");

    const css = read("apps/docs/src/styles/demos.css");
    const carousel = css.slice(css.indexOf("/* ---- carousel:"));
    expect(carousel).toContain("border-radius: calc(var(--radius) + 2px)");

    const strategy = read("docs/preview-strategy.md");
    expect(strategy).toContain("carousel's track corner");
    expect(strategy).toContain("calc(var(--radius) + 2px)");
    expect(strategy).toContain("fixed 8px");
  });

  it("says the table preview's row follows the density the native row fixes", () => {
    const recipes = read("packages/data/src/table/recipe.ts");
    expect(recipes).toContain('export const TABLE_CELL = "px-3 py-2 text-sm";');
    const at = recipes.indexOf("export const TABLE_ROW =");
    const row = at === -1 ? "" : (recipes.slice(at).split("\n")[0] ?? "");
    expect(row, "the table row recipe lost its one-line form").toContain(
      "flex flex-row items-center shrink-0",
    );
    expect(row, "the native row grew a height of its own").not.toMatch(
      /\b(?:h-|height)/,
    );

    const css = read("apps/docs/src/styles/demos.css");
    const start = css.indexOf(".gx-table-row {");
    expect(start, "the table preview has no row rule").toBeGreaterThan(-1);
    const previewRow = css.slice(start, css.indexOf("}", start));
    expect(previewRow).toContain("--control-height-sm");
    expect(previewRow).toContain("--spacing-md");

    const strategy = read("docs/preview-strategy.md");
    expect(strategy).toContain("table's row height");
    expect(strategy).toContain("px-3 py-2 text-sm");
    expect(strategy).toContain("36px");
    expect(strategy).toContain("var(--control-height-sm)");
    expect(strategy).toContain("var(--spacing-md)");

    expect(strategy).toContain("The rule and the header are **not**");
    expect(strategy).toContain("dividerOn");
    expect(strategy).toContain("--divider-accent");
  });

  it("says where a probe frame lands, and whether the repository ignores it", () => {
    const claim = "gitignored";
    const rules = read(".gitignore")
      .split("\n")
      .map((line) => line.trim().replace(/\/$/, ""))
      .filter((line) => /^\/?\.artifacts($|\/)/.test(line));
    const strategy = read("docs/preview-strategy.md");

    expect(strategy).toContain(".artifacts/live/");
    expect(strategy).toContain("local evidence");
    expect(strategy).toContain("delete");
    expect(
      strategy.includes(claim),
      "the policy's ignore claim disagrees with .gitignore",
    ).toBe(rules.length > 0);
  });

  it("says the overlay preview draws a corner the native surface does not", () => {
    const recipes = read("packages/tw/src/recipes.ts");
    const at = recipes.indexOf("export const DIALOG_CONTENT =");
    const dialog =
      at === -1 ? "" : recipes.slice(at).split("\n").slice(0, 2).join("\n");
    expect(dialog, "the dialog recipe lost its fixed radius").toContain(
      "rounded-4xl",
    );

    const css = read("apps/docs/src/styles/demos.css");
    expect(css).toContain("border-radius: calc(var(--radius) + 8px)");

    const strategy = read("docs/preview-strategy.md");
    expect(strategy).toContain("calc(var(--radius) + 8px)");
    expect(strategy).toContain("rounded-4xl");
    expect(strategy).toContain("elevation.lg");
    expect(strategy).toContain("differ in radius");
  });
});

describe("the preview chrome", () => {
  it("draws one card, not fumadocs' card inside the page's own frame", () => {
    const app = read("apps/docs/src/styles/app.css");
    const frame = block(app, ".gx-component");
    const tabs = block(app, ".gx-component-tabs");

    expect(frame).toContain("border: 1px solid var(--border)");
    expect(frame).toContain("background: var(--card)");
    expect(tabs).toContain("border: 0");
    expect(tabs).toContain("border-radius: 0");
    expect(tabs).toContain("background: transparent");
  });

  it("gives the panel a flat surface and leaves the code panel without dots", () => {
    const app = read("apps/docs/src/styles/app.css");
    const panel = block(app, ".gx-component-panel");

    expect(panel).toContain("padding: 0");
    expect(panel).toContain("border-radius: 0");
    expect(panel).toContain("background: transparent");
    expect(block(app, ".gx-component-code")).toContain(
      "background: var(--card)",
    );
  });

  it("paints the dotted scene grid instead of a preview-background wash", () => {
    const css = read("apps/docs/src/styles/demos.css");
    const scene = block(css, ".gx-demo");

    expect(scene).not.toContain("radial-gradient(720px");
    expect(scene).toContain(
      "color-mix(in srgb, var(--foreground) 9%, transparent)",
    );
    expect(scene).toContain("background-size: 16px 16px");
    expect(scene).toContain("background-color: var(--background)");
  });

  it("gives the tabs scene one width, so a tab press cannot resize it", () => {
    const css = read("apps/docs/src/styles/demos.css");

    expect(block(css, ".gx-demo-tabs")).toContain("width: min(100%, 460px)");
  });
});
