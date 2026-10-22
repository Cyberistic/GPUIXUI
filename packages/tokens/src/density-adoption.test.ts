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

describe("the density both packages read", () => {
  const primitives = read("../../primitives/src/recipe/registry.ts");
  const components = read("../../components/src/internal/recipe.ts");

  it("reads the theme's metrics in the primitives' registry", () => {
    // The primitives' class strings name steps, and the registry resolves the
    // box, its side and its padding against the active density.
    expect(primitives).toContain("theme.density.controlHeight[size]");
    expect(primitives).toContain("theme.density.controlPaddingX[size]");
    expect(primitives).toContain("theme.density.controlHeight[size]");
  });

  it("reads the default registry in the components' seam", () => {
    // `classesToStyle` without a density registry is the fixed shadcn table, so
    // the recipe's padding, gaps, radii and type do not move with the theme. The
    // file names density in prose to say so; what it must not do is read it.
    expect(components).toContain("classesToStyle");
    expect(components).not.toMatch(/theme\.density|controlHeight\(/);
  });

  it("still keeps the boxes that share an edge with a density-driven control", () => {
    // The exception is what makes the two halves line up: a list row is built at
    // the theme's row height, and a component's control box is a control height.
    expect(read("../../components/src/list.tsx")).toContain(
      "theme.density.rowHeight",
    );
    const readers = sources("../../components/src/").filter(([, text]) =>
      text.includes("controlHeight("),
    );
    expect(
      readers.length,
      "components reading a control height",
    ).toBeGreaterThan(8);
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

  it("retracts the claim that every component reads the scales", () => {
    // The sentence a consumer followed to a density switch that resized nothing.
    Object.entries(pages).forEach(([page, text]) => {
      expect(text, page).not.toContain(
        "Components read `controlHeight(theme, size)` and `controlPaddingX(theme, size)` instead of hardcoding numbers.",
      );
    });
  });
});
