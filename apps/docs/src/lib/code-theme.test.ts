import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  contrastFloors,
  contrastRatio,
  syntaxColors,
  syntaxRoleFloors,
  syntaxRoles,
  themes,
  type SyntaxRole,
  type ThemeMode,
} from "@gpuixui/tokens";
import { highlightHast } from "fumadocs-core/highlight/shiki";
import { defaultShikiFactory } from "fumadocs-core/highlight/shiki/full";
import { describe, expect, it } from "vitest";
import { appCssSchemes } from "./app-css.test-util";
import { codeThemes } from "./code-theme";

/**
 * The docs site's code blocks used to highlight with Fumadocs' bundled
 * `github-light`/`github-dark` themes — a third party's palette on the one
 * surface that was not the library's. `code-theme.ts` builds both Shiki themes
 * from `@gpuixui/tokens`' measured syntax palette; this suite holds the build to
 * that palette, the rendered colours to the token scopes, and every role to its
 * contrast floor on the surface a code block paints.
 */

const modes = ["light", "dark"] as const satisfies ReadonlyArray<ThemeMode>;

/** The app directory, and every file below `src/` with a given extension. */
const appDir = fileURLToPath(new URL("../../", import.meta.url));
const walk = (dir: string, extension: string): ReadonlyArray<string> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory()
      ? walk(full, extension)
      : entry.name.endsWith(extension)
        ? [full]
        : [];
  });

/** Every source file below `src/`, with the app-relative path the ledger uses. */
const sources = (extension: string) =>
  walk(join(appDir, "src"), extension).map((file) => ({
    path: relative(appDir, file),
    text: readFileSync(file, "utf8"),
  }));

/** One highlighted token, as the grammar split it and the theme painted it. */
interface PaintedToken {
  readonly content: string;
  readonly colour: string;
}

/**
 * The tokens a snippet highlights into.
 *
 * The grammar decides a token's boundaries, not the style: a name can arrive
 * glued to the spaces around it (`" count = "`), so a case matches a token by
 * the text it contains rather than by an exact string.
 *
 * `highlightHast` is the call that loads the language by name — the site's
 * highlighter type takes a grammar object, not an id — and the tokens are then
 * read back off the same highlighter for a colour per token.
 */
const paintedTokens = async (
  lang: "typescript" | "tsx",
  mode: ThemeMode,
  code: string,
): Promise<ReadonlyArray<PaintedToken>> => {
  const highlighter = await defaultShikiFactory.getOrInit();
  const themes = { light: codeThemes[mode] };
  await highlightHast(highlighter, code, { lang, themes, defaultColor: false });

  const { tokens } = highlighter.codeToTokens(code, {
    lang,
    theme: codeThemes[mode].name,
  });

  return tokens
    .flat()
    .map((token) => ({ content: token.content, colour: token.color ?? "" }));
};

const snippet = [
  'const brand = "#A78BFA"; // the mark',
  "let count = 42;",
  "const enabled = true;",
  "const typed: number = 0;",
  "function paint(value: string) { return value; }",
].join("\n");

describe("the docs' code theme", () => {
  it.each(modes)("builds %s from the syntax palette, rule for rule", (mode) => {
    const palette = syntaxColors(themes[mode]);
    const theme = codeThemes[mode];
    const [defaultRule, ...rules] = theme.settings;

    // The palette's own order, one rule per token type, each its own colour.
    expect(rules.map((rule) => rule.settings.foreground)).toEqual(
      syntaxRoles.map((role) => palette[role]),
    );
    expect(rules.every((rule) => (rule.scope ?? []).length > 0)).toBe(true);
    // Plain text — a token no narrower scope names — is the palette's variable
    // ink, never the runtime's fallback.
    expect(defaultRule).toEqual({
      settings: { foreground: palette.variable },
    });
  });

  it.each(modes)(
    "paints %s tokens in their own type's colour",
    async (mode) => {
      const palette = syntaxColors(themes[mode]);
      const tokens = await paintedTokens("typescript", mode, snippet);
      const expected: ReadonlyArray<readonly [string, SyntaxRole]> = [
        ["const", "keyword"],
        ["let", "keyword"],
        ["=", "operator"],
        // The grammar splits a string into its quote punctuation and its content;
        // the content is the token the palette's `string` role paints.
        ["#A78BFA", "string"],
        ["// the mark", "comment"],
        ["brand", "constant"],
        ["count", "variable"],
        ["number", "typeBuiltin"],
        ["42", "number"],
        ["true", "boolean"],
        ["paint", "function"],
      ];
      const wrong = expected.flatMap(([text, role]) =>
        tokens.some(
          (token) =>
            token.content.includes(text) && token.colour === palette[role],
        )
          ? []
          : [`${text}: no token is ${role} (${palette[role]})`],
      );
      // The snippet has to exercise the roles the cases name, so a palette value
      // no token reaches fails rather than passes on an empty check.
      const unused = expected.flatMap(([, role]) =>
        tokens.some((token) => token.colour === palette[role]) ? [] : [role],
      );

      expect(wrong).toEqual([]);
      expect(unused).toEqual([]);
    },
  );

  it("paints a tag and its attribute from the palette too", async () => {
    const palette = syntaxColors(themes.dark);
    const tokens = await paintedTokens("tsx", "dark", '<Card title="Brand" />');
    const painted = (text: string, colour: string): boolean =>
      tokens.some(
        (token) => token.content.trim() === text && token.colour === colour,
      );

    expect(painted("Card", palette.tag)).toBe(true);
    expect(painted("title", palette.attribute)).toBe(true);
  });

  it("emits both schemes as the variables the stylesheet reads", async () => {
    const highlighter = await defaultShikiFactory.getOrInit();
    const tree = await highlightHast(highlighter, "const brand = 1;", {
      lang: "typescript",
      themes: { light: codeThemes.light, dark: codeThemes.dark },
      defaultColor: false,
    });
    const markup = JSON.stringify(tree);

    // Fumadocs' stylesheet paints a span from `--shiki-light` and switches to
    // `--shiki-dark` under `.dark`; a theme without both would leave one scheme
    // unreadable.
    expect(markup).toContain(syntaxColors(themes.light).keyword);
    expect(markup).toContain(syntaxColors(themes.dark).keyword);
    expect(markup).toContain("--shiki-light");
    expect(markup).toContain("--shiki-dark");
  });

  it.each(modes)("clears every role's floor on the %s code surface", (mode) => {
    const palette = syntaxColors(themes[mode]);
    const surface = appCssSchemes[mode]["--card"];
    const below = syntaxRoles.flatMap((role) => {
      const floor = contrastFloors[syntaxRoleFloors[role]];
      const ratio = contrastRatio(palette[role], surface);
      return ratio === undefined || ratio < floor
        ? [
            `${mode}: ${role} ${palette[role]} on ${surface ?? "no card"} — ${
              ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
            }:1 (needs ${floor}:1)`,
          ]
        : [];
    });

    expect(surface).toBeDefined();
    expect(below).toEqual([]);
  });

  it("teaches the palette in the token record", () => {
    const record = readFileSync(
      new URL("../../../../docs/tokens.md", import.meta.url),
      "utf8",
    );
    const start = record.indexOf("## Syntax palette");
    const end = record.indexOf("\n## ", start + 1);
    const section = start === -1 ? "" : record.slice(start, end);

    // The fact a consumer needs: the palette is the theme's, the host's own
    // fallback is foreign, and the audit is `syntaxFailures`.
    expect(section).toContain("syntaxColors(theme)");
    expect(section).toContain("syntaxFailures");
    expect(section).toContain("twenty-four");
    // The site's own half is a claim a reader can follow to the file.
    expect(
      readFileSync(new URL("./code-theme.ts", import.meta.url), "utf8"),
    ).toContain("syntaxColors(themes[mode])");
  });

  it("is the theme the docs build highlights with", () => {
    const config = readFileSync(
      new URL("../../source.config.ts", import.meta.url),
      "utf8",
    );

    expect(config).toContain('from "./src/lib/code-theme"');
    expect(config).toContain("rehypeCodeOptions: codeOptions");
    // A bundled theme here would mean the site paints a foreign palette again.
    expect(config).not.toMatch(/github-(?:light|dark)/);
  });

  it("highlights every render-time block through the wrapper", () => {
    const files = sources(".tsx");
    const wrapper = readFileSync(
      new URL("../components/highlighted-code.tsx", import.meta.url),
      "utf8",
    );

    // `DynamicCodeBlock` defaults to the bundled GitHub themes whenever it is
    // used without options, so a direct call is a block on a foreign palette.
    expect(
      files
        .filter((file) => file.path !== "src/components/highlighted-code.tsx")
        .filter((file) => file.text.includes("DynamicCodeBlock"))
        .map((file) => file.path),
    ).toEqual([]);
    expect(wrapper).toContain("options={codeOptions}");
    // The wrapper is the only path, and the site has blocks that take it.
    expect(
      files.filter((file) => file.text.includes("<HighlightedCode")).length,
    ).toBeGreaterThanOrEqual(6);
  });
});
