import { platformTheme, themes } from "@gpuixui/tokens";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { roleGuidance, TypeScaleBody } from "./type-scale";

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

describe("the theme page", () => {
  const page = readFileSync(
    new URL("../../../content/docs/themes.mdx", import.meta.url),
    "utf8",
  );

  it("mounts the generated specimen under the style reference", () => {
    expect(page).toContain("### Type scale");
    expect(page).toContain("<TypeScale />");
    expect(page.indexOf("<TypeScale />")).toBeGreaterThan(
      page.indexOf("<StyleReference />"),
    );
  });
});
