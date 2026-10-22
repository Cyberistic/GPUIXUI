import { platformTheme, themes } from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sidebarPages } from "../../lib/sidebar-pages.test-util";
import { roleGuidance, TypeScaleBody } from "./type-scale";

/**
 * The typography specimen.
 *
 * The page claims to show *the* type scale, so the roles it enumerates must be
 * the theme's roles — a role added to `@gpuixui/tokens` and left out here would
 * be a value no docs page mentions. The render guard then checks the specimen
 * actually paints each role's metrics, so the table cannot claim 14/20 while
 * drawing 13/18.
 */

/** The theme's text roles, excluding the two family fields. */
const themeRoles = Object.keys(themes.dark.typography).filter(
  (key) => key !== "sans" && key !== "mono",
);

describe("the type scale", () => {
  it("describes every role the theme has, and no role it does not", () => {
    expect(roleGuidance.map(({ role }) => role).toSorted()).toEqual(
      [...themeRoles].toSorted(),
    );
  });

  it("draws each role with its resolved metrics", () => {
    const theme = platformTheme(themes.dark, "linux");
    const markup = renderToStaticMarkup(<TypeScaleBody theme={theme} />);

    const wrong = roleGuidance.filter(({ role }) => {
      const style = theme.typography[role];
      return !markup.includes(
        `${style.fontSize}/${style.lineHeight} · ${style.fontWeight}`,
      );
    });

    expect(wrong.map(({ role }) => role)).toEqual([]);
  });

  it("takes the mono family for code and the sans family elsewhere", () => {
    const markup = renderToStaticMarkup(<TypeScaleBody theme={themes.dark} />);

    expect(markup.match(/--font-mono/g)).toHaveLength(2);
    expect(markup.match(/--font-sans/g)).toHaveLength(roleGuidance.length - 2);
  });
});

describe("the typography page", () => {
  const page = readFileSync(
    new URL("../../../content/docs/typography.mdx", import.meta.url),
    "utf8",
  );

  it("mounts the generated specimen", () => {
    expect(page).toContain("<TypeScale />");
  });

  it("sits in the sidebar after Theming", () => {
    const pages = sidebarPages(new URL("../../../", import.meta.url));

    expect(pages.indexOf("typography")).toBeGreaterThan(
      pages.indexOf("theming"),
    );
  });

  it("counts the roles and families its description advertises", () => {
    // The description is the page's search snippet, and it said "the ten type
    // roles" while the specimen derives its rows from the theme: a role added to
    // `typography` would leave the sentence counting the previous scale.
    const words = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
      "eleven",
      "twelve",
    ];
    const roles = words[themeRoles.length];
    const families =
      words[Object.keys(themes.dark.typography).length - themeRoles.length];

    expect(roles).toBeDefined();
    expect(families).toBeDefined();
    expect(page).toContain(`The ${roles} type roles`);
    expect(page).toContain(`the ${families} families`);
  });
});
