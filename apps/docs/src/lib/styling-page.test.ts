import { themes, brandText, filledHover, filledPressed } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { classesToStyle, unsupportedReason } from "../../../../packages/tw/src/index";
import { recipeTw } from "../../../../packages/primitives/src/recipe/registry";
import {
  namedImports,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";
import { sidebarPages } from "./sidebar-pages.test-util";

/**
 * `/docs/styling` is the only page about the layer every component's appearance
 * comes from, so every claim it makes is measured against the compiler:
 *
 * - each class it prints as supported is compiled, and must produce a style with
 *   nothing in `unsupported`;
 * - each class it prints as refused must be refused by `unsupportedReason` and
 *   carried in `unsupported`, with the family the page names;
 * - each theme step it names must resolve to the token the page says it does,
 *   through the registry the primitives actually compile with;
 * - the page's two-registry split is the split the packages compile with, read
 *   from their own seams.
 *
 * A renamed utility, a step that stops resolving, a registry that moves, or a
 * typo in a printed class fails here instead of teaching a class that paints
 * nothing.
 */

const page = readRepo("apps/docs/content/docs/styling.mdx");

/** A table's first-column backticked names, under a `##` or `###` heading. */
const classesUnder = (heading: string): ReadonlyArray<string> => {
  const start = page.search(new RegExp(`^#{2,3} ${heading}$`, "m"));
  expect(start, `no heading "${heading}"`).toBeGreaterThan(-1);
  const after = page.slice(start).split("\n").slice(1).join("\n");
  const next = after.search(/^#{2,3} /m);
  const body = next === -1 ? after : after.slice(0, next);
  return [...body.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map(
    (match) => match[1] ?? "",
  );
};

const theme = themes.dark;

describe("the styling page", () => {
  it("resolves every class it calls supported in the default registry", () => {
    const rows = classesUnder("What the default registry compiles");

    expect(rows.length).toBeGreaterThanOrEqual(10);
    const failures = rows.flatMap((className) => {
      const result = classesToStyle(className, theme);
      if (result.unsupported.length > 0) {
        return [`${className}: ${result.unsupported.join(", ")}`];
      }
      return Object.keys(result.style).length === 0
        ? [`${className}: compiled to nothing`]
        : [];
    });

    expect(failures).toEqual([]);
  });

  it("resolves every theme step through the registry the primitives compile with", () => {
    const rows = classesUnder("What the library's registry adds");

    expect(rows.length).toBeGreaterThanOrEqual(15);
    const failures = rows.flatMap((className) => {
      const result = recipeTw.classesToStyle(className, theme);
      if (result.unsupported.length > 0) {
        return [`${className}: ${result.unsupported.join(", ")}`];
      }
      return Object.keys(result.style).length === 0
        ? [`${className}: compiled to nothing`]
        : [];
    });

    expect(failures).toEqual([]);
  });

  it("resolves each named step to the token it says it reads", () => {
    const compiled = (className: string) =>
      recipeTw.classesToStyle(className, theme).style;

    expect(compiled("h-md").height).toBe(theme.density.controlHeight.md);
    expect(compiled("px-sm")).toEqual({
      paddingLeft: theme.density.controlPaddingX.sm,
      paddingRight: theme.density.controlPaddingX.sm,
    });
    expect(compiled("gap-sm").gap).toBe(theme.spacing.sm);
    expect(compiled("type-body")).toEqual({
      fontSize: theme.typography.body.fontSize,
      lineHeight: theme.typography.body.lineHeight,
      fontWeight: theme.typography.body.fontWeight,
    });
    // The size-only role keeps the inherited weight.
    expect(compiled("type-size-caption")).toEqual({
      fontSize: theme.typography.caption.fontSize,
      lineHeight: theme.typography.caption.lineHeight,
    });
    expect(compiled("rounded-md").borderRadius).toBe(theme.radius.md);
    expect(compiled("size-icon-md")).toEqual({
      width: theme.iconSize.md,
      height: theme.iconSize.md,
    });
    expect(compiled("size-dot-md")).toEqual({
      width: Math.round(theme.iconSize.md / 2),
      height: Math.round(theme.iconSize.md / 2),
    });
    const thumb = theme.iconSize.md - 2 * theme.spacing["2xs"];
    expect(compiled("size-thumb-md")).toEqual({ width: thumb, height: thumb });
    expect(compiled("switch-track-md")).toEqual({
      width: Math.round(theme.iconSize.md * 1.75),
      height: theme.iconSize.md,
    });
    expect(compiled("text-brand").color).toBe(brandText(theme));
    expect(compiled("fill-primary").backgroundColor).toBe(
      filledHover(theme, "primary"),
    );
    expect(compiled("fill-primary-pressed").backgroundColor).toBe(
      filledPressed(theme, "primary"),
    );
    expect(compiled("select-text")).toEqual({
      userSelect: "text",
      selectionColor: theme.colors.selection,
    });
  });

  it("keeps the deliberate border-input difference between the two registries", () => {
    // shadcn's `--input` is a border; this library's `input` role is a fill.
    expect(classesToStyle("border-input", theme).style.borderColor).toBe(
      theme.colors.border,
    );
    expect(
      recipeTw.classesToStyle("border-input", theme).style.borderColor,
    ).toBe(theme.colors.input);
    expect(page).toContain("`border-input`");
  });

  it("refuses every class it calls refused, for the reason it names", () => {
    const rows = classesUnder("What is refused, and why");

    expect(rows.length).toBeGreaterThanOrEqual(8);
    const failures = rows.flatMap((className) => {
      const reason = unsupportedReason(className);
      const carried = classesToStyle(className, theme).unsupported;
      return reason === undefined
        ? [`${className}: no recorded reason`]
        : carried.includes(className)
          ? []
          : [`${className}: not carried in unsupported`];
    });

    expect(failures).toEqual([]);
    // The page's paraphrase of each family, held to the recorded reason.
    expect(unsupportedReason("rotate-45")).toContain("transform");
    expect(unsupportedReason("col-span-2")).toContain("span");
    expect(unsupportedReason("grid-area-main")).toContain("named");
    expect(unsupportedReason("z-50")).toContain("zIndex");
    expect(unsupportedReason("transition-opacity")).toContain("transitions");
    expect(unsupportedReason("placeholder:text-muted-foreground")).toContain(
      "Pseudo-element",
    );
    expect(unsupportedReason("sr-only")).toContain("clipping");
    expect(unsupportedReason("top-1/2")).toContain("Percentage");
    // A typo is refused too, but the table has no reason to record.
    expect(unsupportedReason("notaclass")).toBeUndefined();
    expect(classesToStyle("notaclass", theme).unsupported).toEqual([
      "notaclass",
    ]);
    expect(page).toContain("returns nothing for it");
  });

  it("skips dark: and records a responsive prefix, as the page says", () => {
    // The theme carries both modes, so a `dark:` class has nothing to switch.
    const dark = classesToStyle("dark:bg-input", theme);
    expect(dark.style).toEqual({});
    expect(dark.unsupported).toEqual([]);

    // The runtime has no breakpoints: the utility paints at base, and the token
    // is recorded for the pass that will exist when it does.
    const responsive = classesToStyle("md:text-sm", theme);
    expect(responsive.responsive).toEqual(["md:text-sm"]);
    expect(responsive.style.fontSize).toBe(14);

    expect(page).toContain("skipped");
    expect(page).toContain("recorded on `responsive`");
  });

  it("imports only names the packages publish", () => {
    const snippets = typescriptSnippets(page);

    expect(snippets.length).toBeGreaterThanOrEqual(3);
    expect(unresolvedImports(namedImports(snippets))).toEqual([]);
  });

  it("describes the registries the packages actually compile with", () => {
    const componentsSeam = readRepo(
      "packages/components/src/internal/recipe.ts",
    );
    const primitivesSeam = readRepo(
      "packages/primitives/src/recipe/registry.ts",
    );

    // The components package compiles with the default registry: no third
    // argument, no local `createTw`.
    expect(componentsSeam).toContain("classesToStyle(recipe, theme)");
    expect(componentsSeam).not.toContain("createTw(");
    expect(page).toContain("src/internal/recipe.ts");

    // The primitives package owns the theme-step registry.
    expect(primitivesSeam).toContain("export const recipeTw = createTw({");
    expect(page).toContain("src/recipe/registry.ts");
  });

  it("sits in the sidebar and is the destination the architecture page names", () => {
    const pages = sidebarPages(new URL("../../", import.meta.url));

    expect(pages).toContain("styling");
    expect(pages.indexOf("styling")).toBeGreaterThan(
      pages.indexOf("architecture"),
    );
    expect(readRepo("apps/docs/content/docs/architecture.mdx")).toContain(
      "](/docs/styling)",
    );
  });
});
