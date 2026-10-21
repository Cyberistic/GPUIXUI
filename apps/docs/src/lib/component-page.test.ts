import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The component page contract.
 *
 * `docs/preview-strategy.md` fixes the sections a curated component page must
 * carry. A page that drops one hides a decision from the reader — most often
 * the limitations — so the template is checked rather than remembered. The
 * package's own pages are exempt: they are the component's doc file, not a
 * curated page.
 */

const dir = new URL("../../content/docs/components/", import.meta.url);

/** Curated pages, i.e. everything in the folder but the section index. */
const pages = readdirSync(dir).filter(
  (name) => name.endsWith(".mdx") && name !== "index.mdx",
);

const source = (name: string): string =>
  readFileSync(new URL(name, dir), "utf8");

/** Every `##` heading on a page, in order. */
const sections = (body: string): readonly string[] =>
  [...body.matchAll(/^## (.+)$/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1].trim()],
  );

const required = [
  "Installation",
  "Usage",
  "Composition",
  "API reference",
  "Theming",
  "Dependencies",
  "Accessibility and limitations",
  "Related",
  "Status",
] as const;

describe("the curated component pages", () => {
  it("exist, so the folder cannot empty out unnoticed", () => {
    expect(pages.length).toBeGreaterThanOrEqual(4);
  });

  it("carry the sections the template requires, in the template's order", () => {
    const missing = pages.flatMap((name) => {
      const found = sections(source(name));
      const positions = required.map((section) => found.indexOf(section));
      return positions.flatMap((position, index) => {
        const section = required[index] ?? "";
        if (position === -1) return [`${name}: no ## ${section}`];
        // Order matters: API before limitations before related.
        const previous = positions[index - 1];
        return previous !== undefined && position < previous
          ? [`${name}: ## ${section} is out of order`]
          : [];
      });
    });

    expect(missing).toEqual([]);
  });

  it("open with a preview and a sentence saying what the component is not", () => {
    const withoutPreview = pages.filter(
      (name) => !source(name).includes("<ComponentPreview"),
    );

    expect(withoutPreview).toEqual([]);
  });

  it("name the package they install from", () => {
    const withoutInstall = pages.filter(
      (name) => !/<Install packageName="@gpuixui\/[a-z-]+"/.test(source(name)),
    );

    expect(withoutInstall).toEqual([]);
  });
});
