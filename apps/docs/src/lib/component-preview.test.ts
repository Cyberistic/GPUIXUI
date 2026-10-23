import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { demos } from "../components/docs/demos";

/**
 * The preview registry, held to the pages that mount it.
 *
 * `<ComponentPreview name="…">` throws at render when the name is not in
 * `demos`, which a reader meets as a crashed page rather than a failed build.
 * The two lists are therefore checked from both sides: every page names a
 * registered demo, and every registered demo is named by a page. The second
 * direction is the one that rots quietly — a demo whose page was rewritten keeps
 * shipping dead code, and a renamed key leaves a page that only fails in the
 * browser.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const contentDir = new URL("../../content/docs/", import.meta.url);
const root = new URL("../../../../", import.meta.url);

/**
 * Every `.mdx` a preview can be mounted from: the site's own pages at any
 * depth, plus each package's docs directory (a package page now mounts a
 * preview the same way a curated page does).
 */
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

/** Every `.mdx` a package writes under `packages/<pkg>/docs`. */
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

/** Every page the site or a package mounts, as `[name, body]`. */
const pages = (): ReadonlyArray<readonly [string, string]> => [
  ...sitePages(),
  ...packagePages(),
];

/** Every demo key a page mounts, with the page it mounts from. */
const mounts = (): ReadonlyArray<readonly [string, string]> =>
  pages().flatMap(([name, body]) =>
    [...body.matchAll(/<ComponentPreview\s+name="([^"]+)"/g)].flatMap((match) =>
      match[1] === undefined ? [] : [[match[1], name] as const],
    ),
  );

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** The curated pages: everything in `content/docs/components/` but the index. */
const curated = (): ReadonlyArray<{
  readonly slug: string;
  readonly title: string;
}> =>
  readdirSync(new URL("apps/docs/content/docs/components/", root))
    .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
    .map((name) => {
      const body = read(`apps/docs/content/docs/components/${name}`);
      const title = /^title:\s*(.+)$/m.exec(body)?.[1]?.trim();
      return { slug: name.replace(/\.mdx$/, ""), title: title ?? "" };
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

  it("carry the native source a reader copies, not an empty code tab", () => {
    const empty = Object.entries(demos)
      .filter(([, demo]) => demo.source.trim().length === 0)
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it("announce every curated page where a reader learns previews exist", () => {
    // A curated page a reader never hears about is a preview nobody opens. The
    // two places that say which pages carry one — `/docs/theming`'s switch
    // section and the strategy's "Curated today" line — are held to the folder,
    // so a sixth page cannot land unannounced.
    const pages = curated();
    const theming = read("apps/docs/content/docs/theming.mdx");
    const switchSection = theming.slice(
      theming.indexOf("### The switch on this site"),
      theming.indexOf("### The look picker"),
    );
    const strategy = read("docs/preview-strategy.md");
    const announced = new Set(
      [
        ...switchSection.matchAll(/\]\(\/docs\/components\/([a-z0-9-]+)\)/g),
      ].flatMap((match) => (match[1] === undefined ? [] : [match[1]])),
    );
    const list = /Curated today: ([^.]+)\./.exec(strategy)?.[1] ?? "";

    expect(pages.length).toBeGreaterThanOrEqual(5);
    expect(
      pages
        .filter((page) => !announced.has(page.slug))
        .map((page) => page.slug),
    ).toEqual([]);
    expect(
      pages
        .filter((page) => page.title.length === 0 || !list.includes(page.title))
        .map((page) => page.slug),
    ).toEqual([]);
  });

  it("says the carousel preview draws the corner the recipe fixes", () => {
    // The track's `rounded-lg` is the recipe registry's fixed 8px, while the
    // preview draws the platform radius plus two. Without the note, a reader
    // switching to a platform whose `radius.md` is 8 believes the preview's
    // corner is the shipped one.
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
    // `TABLE_CELL` is shadcn's fixed `px-3 py-2 text-sm`, so a native row is an
    // 8px inset around a 20px line in every platform, while the preview's row is
    // `controlHeight.sm + spacing.md` and resizes with the platform switch. A
    // reader comparing the two heights has to be told which is which.
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
    // The rule and the header are not approximations: the drawn header is the
    // card (the native one paints no strip) and each row's line is the derived
    // rule the shipped row paints.
    expect(strategy).toContain("The rule and the header are **not**");
    expect(strategy).toContain("dividerOn");
    expect(strategy).toContain("--divider-accent");
  });

  it("says where a probe frame lands, and whether the repository ignores it", () => {
    // The policy called the frames "verification-only and gitignored" while
    // `.gitignore` carried no rule for `.artifacts/`, so a probe run left an
    // untracked directory one `git add -A` from a large commit. The claim is
    // read against the file that decides it: the page may call the directory
    // ignored only while a rule for it exists.
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
    // The native dialog compiles `rounded-4xl` (a fixed 32px) and paints the
    // theme's `elevation.lg` beside the recipe's ring, while `.gx-dialog` draws
    // the platform radius plus 8px and one CSS shadow. Without the note, a
    // reader switching platforms believes the native corner moved with the
    // preview.
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
