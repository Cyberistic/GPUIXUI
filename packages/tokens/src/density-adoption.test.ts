import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const sources = (root: string): ReadonlyArray<readonly [string, string]> => {
  const base = new URL(root, import.meta.url);
  const walk = (url: URL): ReadonlyArray<readonly [string, string]> =>
    readdirSync(url, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) {
        return walk(new URL(`${entry.name}/`, url));
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        return [];
      }
      if (entry.name.includes(".test.")) {
        return [];
      }
      return [[entry.name, readFileSync(new URL(entry.name, url), "utf8")]];
    });
  return walk(base);
};

const pages = {
  "docs/tokens.md": read("../../../docs/tokens.md").replace(/\s+/g, " "),
  "docs/design-system.md": read("../../../docs/design-system.md").replace(
    /\s+/g,
    " ",
  ),
} as const;

const sourcesIn = (root: string): ReadonlyArray<readonly [string, string]> => {
  const walk = (
    url: URL,
    prefix = "",
  ): ReadonlyArray<readonly [string, string]> =>
    readdirSync(url, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) {
        return walk(new URL(`${entry.name}/`, url), `${prefix}${entry.name}/`);
      }
      if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
        return [];
      }
      if (entry.name.includes(".test.")) {
        return [];
      }
      return [
        [
          `${prefix}${entry.name}`,
          readFileSync(new URL(entry.name, url), "utf8"),
        ],
      ];
    });
  return walk(new URL(root, import.meta.url));
};

const readsRowHeight = (text: string): boolean =>
  text.includes("density.rowHeight") || /rowHeightOf\(\s*theme\s*\)/.test(text);

const addsSpacingStep = (text: string): boolean =>
  /\+\s*(?:theme\.spacing\.md|spaceValue\(\s*theme,\s*"md"\s*\))/.test(text);

const rowHeightReaders = (): ReadonlyArray<string> =>
  ["components", "data", "files", "primitives", "tw"].flatMap((pkg) =>
    sourcesIn(`../../${pkg}/src/`)
      .filter(([, text]) => readsRowHeight(text))
      .map(([path]) => `packages/${pkg}/src/${path}`),
  );

describe("the density both packages read", () => {
  const primitives = read("../../primitives/src/recipe/registry.ts");
  const density = read("../../primitives/src/core/theme.ts");
  const components = read("../../components/src/internal/recipe.ts");

  const resolvesDensity = (text: string): boolean =>
    text.includes("controlHeightOf(theme, size)") &&
    text.includes("controlPaddingOf(theme, size)") &&
    !text.includes("theme.density.controlHeight[");

  it("resolves a control's box through the primitives' density seam", () => {
    expect(resolvesDensity(primitives)).toBe(true);

    expect(
      resolvesDensity("{ height: theme.density.controlHeight[size] }"),
    ).toBe(false);

    expect(density).toContain("theme.density?.controlHeight");
    expect(density).toContain("theme.density?.controlPaddingX");
    expect(density).toContain("libraryDensity.controlHeight");
    expect(density).toContain("libraryDensity.controlPaddingX");
  });

  it("reads the default registry in the components' seam", () => {
    expect(components).not.toMatch(/theme\.density|controlHeight\(/);
  });

  it("says which seam paints a control box, and which answers absence", () => {
    const direct = sourcesIn("../../components/src/").filter(([, text]) =>
      text.includes("controlHeight("),
    );
    expect(
      direct.length,
      "components reading the token helper",
    ).toBeGreaterThan(8);
    expect(
      sourcesIn("../../components/src/").some(([, text]) =>
        text.includes("controlHeightOf("),
      ),
    ).toBe(false);

    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain("`controlHeightOf`");
      expect(text, page).toContain("library's preset");
      expect(text, page).toContain("no height");
      expect(text, page).toContain("`@gpuixui/components`");
    });
  });

  it("still keeps the boxes that share an edge with a density-driven control", () => {
    const boxes = sourcesIn("../../components/src/")
      .filter(([path]) => path === "list.tsx" || path.startsWith("list/"))
      .filter(([, text]) => readsRowHeight(text));
    expect(
      boxes.map(([path]) => `components/src/${path}`),
      "list sources reading the row height",
    ).toHaveLength(1);
    expect(
      addsSpacingStep(boxes.at(0)?.[1] ?? ""),
      "the list row adds no second-line space",
    ).toBe(true);
    const readers = sources("../../components/src/").filter(([, text]) =>
      text.includes("controlHeight("),
    );
    expect(
      readers.length,
      "components reading a control height",
    ).toBeGreaterThan(8);
  });

  it("holds the list row's two boxes to the step, not to one route to it", () => {
    const seam =
      'height: dense ? rowHeightOf(theme) : rowHeightOf(theme) + spaceValue(theme, "md")';
    const raw =
      "height: dense ? theme.density.rowHeight : theme.density.rowHeight + theme.spacing.md";
    [seam, raw].forEach((box) => {
      expect(readsRowHeight(box), box).toBe(true);
      expect(addsSpacingStep(box), box).toBe(true);
    });

    expect(addsSpacingStep("height: rowHeightOf(theme)")).toBe(false);
    expect(addsSpacingStep("rowHeightOf(theme) + theme.spacing.lg")).toBe(
      false,
    );
    expect(readsRowHeight("height: theme.density.controlHeight.md")).toBe(
      false,
    );
  });
});

describe("the pages that teach density", () => {
  it("states the split and names the decision", () => {
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).toContain("shadcn's fixed metrics");
      expect(text, page).toContain("ADR 0006");
      expect(text, page).toContain("rowHeight");
      expect(text, page).toContain("controlHeight");
    });
  });

  it("names the seam a control's box is resolved through, and its fallback", () => {
    const catalogue = pages["docs/tokens.md"];
    expect(catalogue).toContain("controlHeightOf");
    expect(catalogue).toContain("packages/primitives/src/core/theme.ts");
    expect(catalogue).toContain("library's preset");
    expect(catalogue).not.toContain("theme.density.controlHeight[size]");
    expect(pages["docs/design-system.md"]).toContain("controlHeightOf");
  });

  it("retracts the claim that every component reads the scales", () => {
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).not.toContain(
        "Components read `controlHeight(theme, size)` and `controlPaddingX(theme, size)` instead of hardcoding numbers.",
      );
    });
  });
});

describe("the row height's readers", () => {
  const readers = rowHeightReaders();

  it("derives the boxes a theme builds at the row height", () => {
    expect(new Set(readers)).toEqual(
      new Set([
        "packages/components/src/list.tsx",
        "packages/data/src/tree/row.tsx",
        "packages/data/src/virtual/tree.tsx",
        "packages/files/src/log/log-viewer.tsx",
        "packages/files/src/tree/file-tree.tsx",
        "packages/primitives/src/components/ScrollArea.tsx",
        "packages/tw/src/calc.ts",
      ]),
    );

    expect(readsRowHeight("rowHeightOf(namedRowHeight)")).toBe(false);
  });

  it("resolves a scroller's line through the primitives' density seam", () => {
    expect(read("../../primitives/src/components/ScrollArea.tsx")).toContain(
      "rowHeightOf(theme)",
    );
    expect(read("../../primitives/src/core/theme.ts")).toContain(
      "libraryDensity.rowHeight",
    );
    expect(pages["docs/tokens.md"]).toContain("rowHeightOf");
  });

  it("leaves a menu row and a table row to the steps they do read", () => {
    const menu = read("../../components/src/menu/item.tsx");
    expect(menu).toContain('controlHeight(theme, "sm")');
    expect(menu).not.toContain("density.rowHeight");
    expect(read("../../data/src/table/table.tsx")).not.toContain(
      "density.rowHeight",
    );
  });
});

describe("the pages that teach the row height", () => {
  it("name the painters, the alignment and the two boxes that are not rows", () => {
    Object.entries(pages).forEach(([page, text]) => {
      const flat = text.toLowerCase();
      expect(flat, page).toContain("dense list row");
      expect(flat, page).toContain("tree row");
      expect(flat, page).toContain("log");
      expect(flat, page).toContain("scroller");
      expect(flat, page).toContain("controlheight.md");
      expect(flat, page).toContain("menu row");
      expect(flat, page).toContain("data-table row");
      expect(flat, page).toContain("neither");
      expect(flat, page).not.toContain("table, list, menu and tree row height");
    });
  });

  it("names the sources the rows are built in", () => {
    const catalogue = pages["docs/tokens.md"];
    rowHeightReaders().forEach((path) =>
      expect(catalogue, path).toContain(path),
    );
  });

  it("moves the row with the control in the per-size override example", () => {
    expect(pages["docs/tokens.md"]).toContain(
      "density: { controlHeight: { md: 34 }, rowHeight: 34 }",
    );
  });
});
