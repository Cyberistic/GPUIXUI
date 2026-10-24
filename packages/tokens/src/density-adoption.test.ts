/**
 * The density a component actually reads.
 *
 * Density is documented as the axis that resizes controls, and only half of the
 * tree follows it: the primitives compile against a density-driven registry,
 * while the components package compiles against `@gpuixui/tw`'s **default**
 * registry — shadcn's fixed metrics (ADR 0006) — and keeps density only for the
 * boxes that have to line up with the density-driven controls beside them (a
 * control's `controlHeight`, a list row's `rowHeight`). A page that said
 * "components read `controlHeight` instead of hardcoding numbers" sent a consumer
 * to switch density and find every card, menu panel and tab unchanged, so each
 * page states the split and this suite reads both compile seams.
 */

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** Every component source under a package, with the tests left out. */
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

/**
 * Every source under a package's `src/`, keyed by its path below that directory
 * (`components/src/list.tsx`). The basename alone is not enough here: the tree
 * row and its virtual twin live in two directories and both are read.
 */
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

/**
 * Whether a source builds a box at the row height. Two routes reach the step:
 * the theme's own group (`density.rowHeight`) and the primitives' density seam
 * (`rowHeightOf(theme)`), which reads the same step and paints the library's
 * row for a theme a store gave back without the group. The data package's own
 * `rowHeightOf` normalises a caller's number and never takes the theme, so it
 * is not mistaken for the token's reader.
 */
const readsRowHeight = (text: string): boolean =>
  text.includes("density.rowHeight") || /rowHeightOf\(\s*theme\s*\)/.test(text);

/**
 * Whether a two-line row adds one spacing step above the row height, through
 * either route: the theme's own group (`spacing.md`) or a guarded read that
 * paints the library's step for a theme a store gave back without it. A row
 * built at the bare step lays its second line inside the first line's box.
 */
const addsSpacingStep = (text: string): boolean =>
  /\+\s*(?:theme\.spacing\.md|spaceValue\(\s*theme,\s*"md"\s*\))/.test(text);

/**
 * The sources that build a box at the row height, derived from the tree rather
 * than listed by hand. `@gpuixui/tw` is included because its `row-height`
 * utility resolves the same step for a caller's class name; the tokens package
 * is not, because its reader is the report below rather than a paint.
 */
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

  /**
   * Whether a source resolves a control's box through the primitives' density
   * seam rather than indexing the theme's group.
   */
  const resolvesDensity = (text: string): boolean =>
    text.includes("controlHeightOf(theme, size)") &&
    text.includes("controlPaddingOf(theme, size)") &&
    !text.includes("theme.density.controlHeight[");

  it("resolves a control's box through the primitives' density seam", () => {
    // The class strings name steps; the registry asks the seam for the box, its
    // side and its padding, and the seam paints the theme's own numbers or the
    // library's preset for a density group a store gave back without.
    expect(resolvesDensity(primitives)).toBe(true);
    // The shape the seam replaced: it answered `undefined` for a theme a store
    // gave back without the group, so the first control laid out with no box.
    expect(
      resolvesDensity("{ height: theme.density.controlHeight[size] }"),
    ).toBe(false);

    expect(density).toContain("theme.density?.controlHeight");
    expect(density).toContain("theme.density?.controlPaddingX");
    expect(density).toContain("libraryDensity.controlHeight");
    expect(density).toContain("libraryDensity.controlPaddingX");
  });

  it("reads the default registry in the components' seam", () => {
    // `classesToStyle` without a density registry is the fixed shadcn table, so
    // the recipe's padding, gaps, radii and type do not move with the theme. The
    // file names density in prose to say so; what it must not do is read it.
    expect(components).toContain("classesToStyle");
    expect(components).not.toMatch(/theme\.density|controlHeight\(/);
  });

  it("says which seam paints a control box, and which answers absence", () => {
    // The two packages answer a theme that lost the density group differently:
    // the primitives paint the library's preset through their own seam, while a
    // component builds a box from the token helper, which answers `undefined`.
    // A page that named one answer for both sent a consumer to the wrong one.
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
    // The exception is what makes the two halves line up: a list row is built at
    // the theme's row height, and a component's control box is a control height.
    // The route to the step is the row's own choice — `readsRowHeight` admits
    // both the theme's group and the seam that reads it — so a row that takes
    // the seam does not red this suite, while a row that stops reading the step,
    // or loses the second line's space, still fails by name.
    const list = read("../../components/src/list.tsx");
    expect(readsRowHeight(list), "list.tsx reads no row height").toBe(true);
    expect(addsSpacingStep(list), "list.tsx adds no second-line space").toBe(
      true,
    );
    const readers = sources("../../components/src/").filter(([, text]) =>
      text.includes("controlHeight("),
    );
    expect(
      readers.length,
      "components reading a control height",
    ).toBeGreaterThan(8);
  });

  it("holds the list row's two boxes to the step, not to one route to it", () => {
    // Both routes are the same box: the seam reads the theme's own step and
    // paints the library's row for a theme a store truncated, so the guard
    // cannot prefer one spelling without holding the fix hostage.
    const seam =
      'height: dense ? rowHeightOf(theme) : rowHeightOf(theme) + spaceValue(theme, "md")';
    const raw =
      "height: dense ? theme.density.rowHeight : theme.density.rowHeight + theme.spacing.md";
    [seam, raw].forEach((box) => {
      expect(readsRowHeight(box), box).toBe(true);
      expect(addsSpacingStep(box), box).toBe(true);
    });
    // The controls: a single-line box adds no space, the second line is the
    // documented `md` step and not another step, and a control box is not a row.
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
    // The catalogue taught the registry's raw index expression, which is now a
    // seam: a theme a store gave back without the group paints the library's
    // preset instead of answering `undefined` for the first control laid out.
    const catalogue = pages["docs/tokens.md"];
    expect(catalogue).toContain("controlHeightOf");
    expect(catalogue).toContain("packages/primitives/src/core/theme.ts");
    expect(catalogue).toContain("library's preset");
    expect(catalogue).not.toContain("theme.density.controlHeight[size]");
    expect(pages["docs/design-system.md"]).toContain("controlHeightOf");
  });

  it("retracts the claim that every component reads the scales", () => {
    // The sentence a consumer followed to a density switch that resized nothing.
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).not.toContain(
        "Components read `controlHeight(theme, size)` and `controlPaddingX(theme, size)` instead of hardcoding numbers.",
      );
    });
  });
});

describe("the row height's readers", () => {
  // The step's JSDoc used to say "Table, list, menu and tree row height": a
  // menu row is a `controlHeight.sm` box and a data-table row is laid out by its
  // cells, so a consumer sizing a row from that sentence would have reached for
  // a token neither reads. The list below is derived from the tree, not typed.
  const readers = rowHeightReaders();

  it("derives the boxes a theme builds at the row height", () => {
    expect(new Set(readers)).toEqual(
      new Set([
        "packages/components/src/list.tsx",
        "packages/data/src/tree/row.tsx",
        "packages/data/src/virtual/tree.tsx",
        "packages/files/src/log/log-viewer.tsx",
        "packages/primitives/src/components/ScrollArea.tsx",
        "packages/tw/src/calc.ts",
      ]),
    );
    // The data package's own normaliser takes a caller's number, not the theme,
    // so it is not a reader of this step.
    expect(readsRowHeight("rowHeightOf(namedRowHeight)")).toBe(false);
  });

  it("names every one of those sources in the step's own documentation", () => {
    // A reader that lands in another package must be added to the step's JSDoc,
    // and one that stops reading it must be dropped: the set above is the only
    // source of the paths, so neither direction can pass in silence.
    const scale = read("./scale.ts");
    readers.forEach((path) =>
      expect(scale, `${path} reads the row height but is not named`).toContain(
        path,
      ),
    );
  });

  it("resolves a scroller's line through the primitives' density seam", () => {
    // The one reader inside the primitives takes the seam that answers the
    // library's row for a theme a store truncated past the density group, so a
    // keypress cannot reach a raw group read mid-screen.
    expect(read("../../primitives/src/components/ScrollArea.tsx")).toContain(
      "rowHeightOf(theme)",
    );
    expect(read("../../primitives/src/core/theme.ts")).toContain(
      "libraryDensity.rowHeight",
    );
    expect(read("./scale.ts")).toContain("rowHeightOf");
    expect(pages["docs/tokens.md"]).toContain("rowHeightOf");
  });

  it("leaves a menu row and a table row to the steps they do read", () => {
    // The premise of the retraction: a menu row is built at the `sm` control
    // height, and a table row has no row token at all.
    const menu = read("../../components/src/menu/item.tsx");
    expect(menu).toContain('controlHeight(theme, "sm")');
    expect(menu).not.toContain("density.rowHeight");
    expect(read("../../data/src/table/table.tsx")).not.toContain(
      "density.rowHeight",
    );
  });

  it("retracts the row heights it never read", () => {
    const retracted = "Table, list, menu and tree row height";
    expect(read("./scale.ts")).not.toContain(retracted);
    expect(read("./theme.ts")).not.toContain(retracted);
    expect(read("./scale.ts")).toContain("neither reads this step");
  });
});

describe("the pages that teach the row height", () => {
  // The catalogue's density section and the design system's §6 both name the
  // step, and both stated only "a list row" while the tree, the log viewer and
  // the scroller read it too.
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
    // The example raised `md` alone while the page said a row and the default
    // control beside it share a height — the documented brand was the drift.
    expect(pages["docs/tokens.md"]).toContain(
      "density: { controlHeight: { md: 34 }, rowHeight: 34 }",
    );
  });
});
