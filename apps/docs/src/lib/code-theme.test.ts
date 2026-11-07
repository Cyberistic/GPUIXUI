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

const modes = ["light", "dark"] as const satisfies ReadonlyArray<ThemeMode>;

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

const sources = (extension: string) =>
  walk(join(appDir, "src"), extension).map((file) => ({
    path: relative(appDir, file),
    text: readFileSync(file, "utf8"),
  }));

interface PaintedToken {
  readonly content: string;
  readonly colour: string;
}

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

    expect(rules.map((rule) => rule.settings.foreground)).toEqual(
      syntaxRoles.map((role) => palette[role]),
    );
    expect(rules.every((rule) => (rule.scope ?? []).length > 0)).toBe(true);

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

    expect(section).toContain("syntaxColors(theme)");
    expect(section).toContain("syntaxFailures");
    expect(section).toContain("twenty-four");

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

    expect(config).not.toMatch(/github-(?:light|dark)/);
  });

  it("highlights every render-time block through the wrapper", () => {
    const files = sources(".tsx");
    const wrapper = readFileSync(
      new URL("../components/highlighted-code.tsx", import.meta.url),
      "utf8",
    );

    expect(
      files
        .filter((file) => file.path !== "src/components/highlighted-code.tsx")
        .filter((file) => file.text.includes("DynamicCodeBlock"))
        .map((file) => file.path),
    ).toEqual([]);
    expect(wrapper).toContain("options={codeOptions}");

    expect(
      files.filter((file) => file.text.includes("<HighlightedCode")).length,
    ).toBeGreaterThanOrEqual(6);
  });
});
