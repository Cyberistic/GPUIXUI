import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/docs/dark-mode` said the application owns the mode and passed `getTheme` to
 * the provider — nothing more. `@gpuixui/tokens` also **follows the desktop's
 * palette** (`paletteToTokens`, `paletteMode`, `watchSystemTheme`,
 * `decodeOmarchyPalette`) and reports what a stored theme lost
 * (`missingTokens`), and none of it had a page on the site: a reader who wanted
 * a window that wears the colours their desktop already chose could only find
 * the API in `docs/tokens.md`.
 *
 * This guard holds the new sections to the package: every seam the follow is
 * made of, every option the watch takes, the poll that replaces a watcher, the
 * order delivery is recorded in, the wash a selection becomes, the names the
 * Omarchy reader understands, and the three kinds of absence the gate refuses.
 * A page that drifts from any of them fails by name.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("apps/docs/content/docs/dark-mode.mdx").replace(/\s+/g, " ");

const systemTheme = read("packages/tokens/src/system-theme.ts");
const omarchy = read("packages/tokens/src/omarchy.ts");

/**
 * Every non-test module the tokens package ships, concatenated.
 *
 * The follow's two declarations moved house once already (`missingTokens` now
 * lives in `missing.ts`, and `audit.ts` only re-publishes it), so a guard that
 * read one path went red while the page was still correct. The page names the
 * seams; which module declares one is the package's business.
 */
const tokensDir = new URL("packages/tokens/src/", root);
const tokensSource = readdirSync(tokensDir, {
  recursive: true,
  encoding: "utf8",
})
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .map((name) => readFileSync(new URL(name, tokensDir), "utf8"))
  .join("\n");

/** The fields an interface declares itself, `?` kept so required is derivable. */
const declared = (source: string, name: string): ReadonlyArray<string> => {
  const body = source.split(`interface ${name}`)[1]?.split("\n}")[0] ?? "";

  return [...body.matchAll(/readonly (\w+)(\??):/g)].flatMap((match) =>
    match[1] === undefined ? [] : [`${match[1]}${match[2] ?? ""}`],
  );
};

/** The fence under a heading, so another sample on the page cannot satisfy it. */
const fenceAfter = (heading: string): string => {
  const start = page.indexOf(heading);
  const fence = page.indexOf("```tsx", start);
  const end = page.indexOf("```", fence + 7);

  return page.slice(fence + 7, end);
};

const followSample = fenceAfter("Follow the desktop's palette");

/** The seams the section is about, and the declaration each must still have. */
const seams: ReadonlyArray<readonly [name: string, declaration: string]> = [
  ["paletteToTokens", "export function paletteToTokens"],
  ["paletteMode", "export function paletteMode"],
  ["watchSystemTheme", "export function watchSystemTheme"],
  ["intervalTimer", "export const intervalTimer"],
  ["decodeOmarchyPalette", "export function decodeOmarchyPalette"],
  ["missingTokens", "export function missingTokens"],
];

describe("the dark-mode page's palette follow", () => {
  it("names every seam the package ships for the follow", () => {
    // Bug guarded: the page stopped at `getTheme`, so a desktop-shaped window
    // had no documented route from the system palette to a theme.
    const absent = seams.filter(([name, declaration]) => {
      const source =
        name === "decodeOmarchyPalette"
          ? omarchy
          : name === "missingTokens"
            ? tokensSource
            : systemTheme;
      return !source.includes(declaration) || !page.includes(name);
    });

    expect(seams.length).toBeGreaterThanOrEqual(6);
    expect(absent.map(([name]) => name)).toEqual([]);
  });

  it("passes every option the watch takes", () => {
    const options = declared(systemTheme, "WatchSystemThemeOptions");
    const required = options.filter((option) => !option.endsWith("?"));

    expect(options.length).toBeGreaterThanOrEqual(6);
    // `read`, `base`, `onChange` and `every` are required; a sample without one
    // is not a call the package accepts.
    expect(required).toEqual(["read", "base", "onChange", "every"]);
    expect(
      required.filter(
        (option) => !new RegExp(`\\b${option}:`).test(followSample),
      ),
    ).toEqual([]);
    expect(
      options.filter((option) => !page.includes(option.replace("?", ""))),
    ).toEqual([]);
  });

  it("states the poll that stands in for a file watcher", () => {
    // The runtime pins no watcher, so the follow is an interval the caller
    // owns — a page that promised a subscription would describe software this
    // package does not ship.
    expect(systemTheme).toContain("return timer.poll(every, tick)");
    expect(systemTheme).not.toContain("watchFile");
    expect(systemTheme).not.toContain("fs.watch");
    expect(page).toContain("no file watcher");
    expect(page).toContain("poll");
    expect(followSample).toContain("every: 2000");
  });

  it("records a change only after the callback returned", () => {
    // A callback that throws must not leave the window on the previous theme
    // with the change marked as delivered, so the key is written after it.
    const tick = systemTheme.split("const tick = (): void => {")[1] ?? "";
    const delivered = tick.indexOf("onChange(");
    const recorded = tick.indexOf("applied = key;");

    expect(delivered).toBeGreaterThan(-1);
    expect(recorded).toBeGreaterThan(delivered);
    expect(page).toContain("recorded once `onChange` returns");
    expect(page).toContain("next tick");
  });

  it("reads a stated mode this release does not ship from the page, and says so", () => {
    // Bug guarded: the page said `paletteMode` falls back to the page's
    // lightness "only when [the palette] states none", but the seam reads every
    // stated name it does not ship from the page too — the upper-cased `Dark` a
    // consumer's decoder writes, an old release's name, a `null` a store kept —
    // because the documented call site hands the answer straight to `getTheme`,
    // which refuses a name it does not know. The narrower rule describes
    // software this package does not ship.
    const body =
      systemTheme
        .split("export function paletteMode")[1]
        ?.split("\n}")[0] ?? "";
    const intro = page.slice(
      page.indexOf("Follow the desktop's palette"),
      page.indexOf("```tsx", page.indexOf("Follow the desktop's palette")),
    );

    // The seam's whole answer: a name it ships is the answer; every other
    // stated name is measured off the page like an absent one.
    expect(body).toContain(
      "isThemeMode(mode) ? mode : pageMode(background)",
    );
    // The refusal the page names is the package's own sentence, not one the
    // page may invent, so the reason cannot drift from `getTheme`.
    expect(read("packages/tokens/src/theme.ts")).toContain(
      "is not a theme mode",
    );
    expect(intro).toContain("does not ship");
    expect(intro).toContain("`getTheme`");
    expect(intro).toContain("refuses");
    expect(intro).toContain("no page");
    expect(page).not.toContain("only when it states none");
  });

  it("teaches the wash a desktop's selection becomes", () => {
    // A desktop's selection is a filled pair; the role here is a translucent
    // wash behind a run that keeps its own text, so the share is the theme's.
    expect(systemTheme).toContain(
      "alpha(selection, alphaOf(base.colors.selection))",
    );
    expect(systemTheme).toContain("selectionWash(palette.selection, base)");
    expect(page).toContain("translucent **wash**");
    expect(page).toContain("base theme's own share");
  });

  it("teaches the Omarchy reader's own names and its report", () => {
    // The decoder reads the file's vocabulary rather than renaming roles, and
    // a line it cannot use is reported instead of becoming a colour.
    const names = ["red", "muted", "color8", "accent", "color4"];

    expect(names.filter((name) => !omarchy.includes(`"${name}"`))).toEqual([]);
    expect(omarchy).toContain("problems: readonly OmarchyProblem[]");
    expect(omarchy).toContain("omarchy/current/theme/");
    expect(names.filter((name) => !page.includes(`\`${name}\``))).toEqual([]);
    expect(page).toContain("`problems`");
  });

  it("names the absence a stored theme reports, in the gate's own kinds", () => {
    // `missingTokens` is the restore path's answer, and its kinds are the
    // refusals the gate makes rather than a list the page invents. The kinds
    // are declared beside the function that returns them, so the guard reads
    // that declaration rather than a file the package may move.
    const declarations = tokensSource.split("export type MissingTokenKind =");
    const kinds =
      declarations[1]
        ?.split(";")[0]
        ?.match(/"(\w+)"/g)
        ?.map((kind) => kind.slice(1, -1)) ?? [];

    expect(declarations.length).toBe(2);
    expect(kinds).toEqual(["group", "step", "family"]);
    expect(page).toContain("`missingTokens(theme)`");
    expect(kinds.filter((kind) => !page.includes(`\`${kind}\``))).toEqual([]);
  });
});
