import { readFileSync } from "node:fs";
import { lightTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { classesToStyle } from "../../../../packages/tw/src/index";

/**
 * The curated Inline edit page, held to the source it describes.
 *
 * `component-page-truth.test.ts` reads the curated set for the claims every page
 * makes — the runtime pin, the native count, the inventory status and the
 * packages the source imports. This file holds what is particular to this page:
 * the corner it prints is the one the recipe compiles (not the theme's radius,
 * which the platform switch moves), the preview rules take the heights and roles
 * the component paints, and the finish rule the page teaches is the one the
 * model and the source implement.
 *
 * `node:fs` is the test's own read of a checked-in file, not runtime I/O.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

const page = read("apps/docs/content/docs/components/inline-edit.mdx");
const source = read("packages/components/src/inline-edit.tsx");
const recipes = read("packages/tw/src/recipes.ts");
const css = read("apps/docs/src/styles/demos.css");

/** One CSS block, from its selector to the closing brace. */
const block = (sheet: string, selector: string): string => {
  const start = sheet.indexOf(`${selector} {`);
  return start === -1 ? "" : sheet.slice(start, sheet.indexOf("}", start));
};

/** The Dependencies table's package cells. */
const dependencies = (): ReadonlyArray<string> => {
  const start = page.indexOf("## Dependencies");
  const section = page.slice(start, page.indexOf("\n## ", start + 1));
  return section
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .flatMap((line) => {
      const cell = line.replace(/^\|/, "").split("|")[0]?.trim();
      return cell === undefined || cell === "Package" || cell.startsWith("---")
        ? []
        : [cell.replace(/`/g, "")];
    });
};

describe("the Inline edit page", () => {
  it("lists no package the component does not import", () => {
    // The other direction — every import is listed — is the curated set's case.
    // A table row nobody imports sends a reader after a dependency they do not
    // need, and suppresses the site's generated strip while it is there.
    const imported = new Set(
      [...source.matchAll(/(?:from\s+|import\s+)"([^"]+)"/g)].flatMap((match) =>
        match[1] === undefined ? [] : [match[1]],
      ),
    );

    expect(
      dependencies().filter(
        (name) => name !== "this package" && !imported.has(name),
      ),
    ).toEqual([]);
    expect(dependencies()).toContain("this package");
  });

  it("prints the corner the recipe compiles, not the theme's step", () => {
    // `INLINE_EDIT_DISPLAY`/`INLINE_EDIT_INPUT` name `rounded-sm`, and the tw
    // registry's sm is a fixed 4px — it does not follow `radius`, which the
    // platform switch moves.
    const display = /const INLINE_EDIT_DISPLAY =\s*\n?\s*"([^"]*)"/.exec(
      recipes,
    )?.[1];
    const input = /const INLINE_EDIT_INPUT =\s*\n?\s*"([^"]*)"/.exec(
      recipes,
    )?.[1];
    const radius = (value: string): number => {
      const name = /\brounded-[\w-]+/.exec(value)?.[0] ?? "";
      const style = classesToStyle(name, lightTheme).style.borderRadius;
      return typeof style === "number" ? style : -1;
    };

    expect(radius(display ?? "")).toBe(4);
    expect(radius(input ?? "")).toBe(4);
    // Every corner the page prints is the compiled one: a table with one stale
    // row must not pass because the other row is still right.
    const printed = [...page.matchAll(/fixed (\d+)px/g)].map(
      (match) => match[1] ?? "",
    );
    expect(printed.length).toBeGreaterThanOrEqual(2);
    expect(printed.filter((value) => value !== "4")).toEqual([]);
    expect(page).toContain("rounded-sm");
    expect(block(css, ".gx-inline-display")).toContain("border-radius: 4px");
    expect(block(css, ".gx-inline-input")).toContain("border-radius: 4px");
  });

  it("takes the display and the editor from the values the component paints", () => {
    const display = block(css, ".gx-inline-display");
    const editor = block(css, ".gx-inline-input");

    expect(display).toContain("min-height: var(--control-height-sm)");
    expect(source).toContain('minHeight: controlHeight(theme, "sm")');
    expect(block(css, ".gx-inline-display:hover:not(:disabled)")).toContain(
      "background: var(--accent)",
    );
    expect(block(css, ".gx-inline-display:hover:not(:disabled)")).toContain(
      "color: var(--accent-foreground)",
    );
    expect(display).toContain("color: var(--foreground)");
    expect(block(css, ".gx-inline-display > [data-empty]")).toContain(
      "color: var(--muted-foreground)",
    );
    expect(editor).toContain("height: var(--control-height-md)");
    expect(editor).toContain("background: var(--background)");
    expect(editor).toContain("border: 1px solid var(--input)");
    expect(editor).toContain("color: var(--input-foreground)");
    expect(source).toContain('height: controlHeight(theme, "md")');
  });

  it("teaches the finish, the focus and the app's gate", () => {
    expect(page).toContain("**One finish per edit.**");
    expect(page).toContain("**Blur is a commit, not a cancel.**");
    expect(page).toContain("`Escape` is the only discard");
    expect(page).toContain("the component reports, the caller decides");
    expect(page).toContain("An empty string is a valid committed value");
    expect(page).toContain("no `aria-invalid` and no `aria-describedby`");
  });

  it("mounts both previews its demos register", () => {
    expect(page).toContain('<ComponentPreview name="inline-edit-workflow" />');
    expect(page).toContain('<ComponentPreview name="inline-edit-states" />');
    const demos = read("apps/docs/src/components/docs/inline-edit-demo.tsx");
    expect(demos).toContain("export const inlineEditWorkflowSource");
    expect(demos).toContain("export const inlineEditStatesSource");
    expect(
      [...demos.matchAll(/from "@gpuixui\/components"/g)].length,
    ).toBeGreaterThanOrEqual(2);
  });
});
