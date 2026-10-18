import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { previewPageSlugs } from "../scripts/preview-pages.ts";

/**
 * Guards the list of preview pages the hydrated smoke visits (plan 495).
 *
 * The smoke reads every page that carries a labelled preview, and it derives
 * that set from the MDX tree because the script runs on Node, which cannot load
 * the registry's JSX. A derivation that silently returns nothing — a broken
 * regex, a block written differently — would leave the gate green over no
 * pages, so the shape is tested on a fixture and the real tree is counted.
 */

const realPages = fileURLToPath(
  new URL("../content/docs/components/", import.meta.url),
);

/** The slugs of a throwaway page directory, cleaned up on every exit. */
const slugsOf = (
  pages: Readonly<Record<string, string>>,
): ReadonlyArray<string> => {
  const directory = mkdtempSync(join(tmpdir(), "gpuixui-preview-pages-"));
  try {
    Object.entries(pages).forEach(([file, body]) =>
      writeFileSync(join(directory, `${file}.mdx`), body),
    );
    return previewPageSlugs(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

describe("preview page slugs", () => {
  it("returns a page that carries a preview and skips one that does not", () => {
    expect(
      slugsOf({
        button: '<ComponentPreview slug="button" />',
        notes: "No preview on this page.",
      }),
    ).toEqual(["button"]);
  });

  it("keeps one entry per preview page and sorts the list", () => {
    expect(
      slugsOf({
        switch: [
          '<ComponentPreview slug="switch" />',
          '<ComponentPreview slug="switch" />',
        ].join("\n"),
        select: '<ComponentPreview slug="select" />',
      }),
    ).toEqual(["select", "switch"]);
  });

  it("finds every preview on the real pages", () => {
    const slugs = previewPageSlugs(realPages);
    expect(slugs.length).toBeGreaterThan(40);
    expect(slugs).toContain("button");
  });
});
