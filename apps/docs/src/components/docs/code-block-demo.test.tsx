import { syntaxColors, themes } from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { toCssVars } from "../../lib/theme-css";
import { CodeBlockDemo } from "./code-block-demo";

/**
 * The code-block preview, as it renders.
 *
 * The drawing used to be four plain lines in a warm-grey card: no token
 * colours, no language label and a bare `Copy` word. The shipped block feeds
 * `@tanstack/highlight` and paints each run in `syntaxColors(theme)`; the
 * preview has to show the same palette, or a reader comparing the code tab with
 * the drawing would see two different treatments.
 */

const markup = renderToStaticMarkup(<CodeBlockDemo />);

const css = readFileSync(
  new URL("../../styles/demos.css", import.meta.url),
  "utf8",
);

describe("the code-block preview", () => {
  it("shows a realistic snippet with numbered rows", () => {
    expect(markup.match(/class="gx-codeblock-line"/g)?.length).toBe(12);
    expect(markup.match(/class="gx-codeblock-num"/g)?.length).toBe(12);
    expect(markup).toContain('class="gx-codeblock-title">src/charge.ts');
  });

  it("colours every category the snippet uses", () => {
    const roles = ["keyword", "string", "number", "comment", "function"];
    const missing = roles.filter(
      (role) => !markup.includes(`data-token="${role}"`),
    );

    expect(missing).toEqual([]);
  });

  it("takes the palette from the theme bridge, not a literal", () => {
    const palette = syntaxColors(themes.dark);
    const vars = toCssVars(themes.dark);

    expect(vars["--syntax-keyword"]).toBe(palette.keyword);
    expect(vars["--syntax-string"]).toBe(palette.string);
    expect(vars["--syntax-number"]).toBe(palette.number);
    const start = css.indexOf('.gx-codeblock-code [data-token="keyword"] {');
    expect(css.slice(start, css.indexOf("}", start))).toContain(
      "color: var(--syntax-keyword)",
    );
  });

  it("heads the block with the language and a copy icon", () => {
    expect(markup).toContain('class="gx-codeblock-lang">ts');
    expect(markup).toContain('aria-label="Copy"');
    expect(markup).toContain("<svg");
  });
});
