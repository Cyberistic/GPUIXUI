import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { platformTheme, themes } from "@gpuixui/tokens";
import { demos } from "../components/docs/demos";
import { packagePreviews } from "./package-preview";
import { toCssVars } from "./theme-css";

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
const mounts = (): ReadonlyArray<readonly [string, string]> => [
  ...pages().flatMap(([name, body]) =>
    [...body.matchAll(/<ComponentPreview\s+name="([^"]+)"/g)].flatMap((match) =>
      match[1] === undefined ? [] : [[match[1], name] as const],
    ),
  ),
  // A package page is the package's Markdown, so the site mounts its drawing
  // from `package-preview.ts`; those rows count as mounts from this side.
  ...packagePreviews.map(
    (row) => [row.demo, `${row.origin}/${row.path}`] as const,
  ),
];

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** The declarations of the first `selector { … }` block in a style sheet. */
const block = (css: string, selector: string): string => {
  const pattern = new RegExp(
    `^[ \\t]*${selector.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{`,
    "m",
  );
  const match = pattern.exec(css);
  if (match === null) throw new Error(`no ${selector} block`);
  return css.slice(match.index, css.indexOf("}", match.index));
};

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

  it("are announced where a reader learns previews exist", () => {
    // A curated page a reader never hears about is a preview nobody opens.
    // The strategy's "Curated today" line is held to the folder, so a new page
    // cannot land unannounced.
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

describe("the preview chrome", () => {
  it("draws one card, not fumadocs' card inside the page's own frame", () => {
    // Bug guarded: `.gx-component` drew a border, radius and `--card` fill,
    // and the fumadocs `Tabs` root inside it drew `rounded-xl border
    // bg-fd-secondary` too — every component page opened in a double card.
    // The tab shell is flattened; the frame keeps the only border.
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
    // Bug guarded: the preview panel was inset by fumadocs' `p-4` and painted
    // `bg-fd-background`, so its rounded content box read as a second card.
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
    // Bug guarded: `.gx-demo` carried `radial-gradient(720px 220px …)` as its
    // sole background, a blue wash no other surface had. The gradient is gone;
    // the scene now carries Kitze's 16px dot field in the theme's own ink.
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
    // Bug guarded: `.gx-demo-tabs` had no width in the scene's flex row, so
    // the selected panel's text sized the box and choosing another tab moved
    // the strip (574px → 623px) under the pointer. One declared width holds it.
    const css = read("apps/docs/src/styles/demos.css");

    expect(block(css, ".gx-demo-tabs")).toContain("width: min(100%, 460px)");
  });
});

describe("the preview's window frame", () => {
  it("reads the theme's surface corner instead of a literal offset", () => {
    // The defect: `.gx-shell` drew `calc(var(--radius) + 6px)`, so a Windows
    // preview (md 4) painted a 10px window while Fluent's surface corner is 8.
    // A window is a surface, so it reads the theme's `lg` step directly.
    const css = read("apps/docs/src/styles/demos.css");
    const shell = css.slice(
      css.indexOf("/* ---- layouts: the window frame"),
      css.indexOf("/* ---- dock:"),
    );
    expect(shell).toContain("border-radius: var(--radius-lg)");
    expect(shell).not.toContain("calc(var(--radius) + 6px)");

    const windows = toCssVars(platformTheme(themes.dark, "win32"));
    expect(windows["--radius-lg"]).toBe("8px");
  });
});
