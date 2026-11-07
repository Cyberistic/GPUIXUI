import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const listSources = ["list.tsx", "list/row.ts"]
  .map((path) => new URL(`../../components/src/${path}`, import.meta.url))
  .filter((url) => existsSync(url))
  .map((url) => readFileSync(url, "utf8"))
  .join("\n");

const pages = {
  "docs/tokens.md": read("../../../docs/tokens.md").replace(/\s+/g, " "),
  "docs/design-system.md": read("../../../docs/design-system.md").replace(
    /\s+/g,
    " ",
  ),
} as const;

describe("the scope of an override", () => {
  it("resolves a colour through the theme in the shared registry", () => {
    const utilities = read("../../tw/src/utilities.ts");
    expect(utilities).toContain("const ROLE");
    expect(utilities).toContain("theme.colors[role]");
  });

  it("compiles the components' resting recipe from fixed metrics", () => {
    const recipes = read("../../tw/src/recipes.ts");
    const card = recipes.slice(
      recipes.indexOf("export const CARD_BASE"),
      recipes.indexOf("export const CARD_TITLE"),
    );

    expect(card).toContain("rounded-lg");
    expect(card).toContain("px-");
  });

  it("reads the theme for the geometry a component measures", () => {
    expect(read("../../components/src/avatar.tsx")).toContain(
      "theme.radius.full",
    );
    expect(read("../../components/src/tabs.tsx")).toContain("controlHeight(");
    expect(listSources, "the list measures its row box").toMatch(
      /density\.rowHeight|rowHeightOf\(/,
    );
    expect(read("../../components/src/drawer.tsx")).toContain("theme.spacing.");
  });

  it("states the scope on both pages", () => {
    const tokens = pages["docs/tokens.md"];
    expect(tokens).toContain("What an override reaches");
    expect(tokens).toContain("fixed metrics");
    expect(tokens).toContain("`radius.full`");
    expect(tokens).toContain("ADR 0006");

    const design = pages["docs/design-system.md"];
    expect(design).toContain(
      "An override reaches colour everywhere and geometry where a component reads it.",
    );
    expect(design).toContain("fixed metrics");
    expect(design).toContain("`radius.full`");
    expect(design).toContain("ADR 0006");
  });
});
