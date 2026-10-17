import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bySlug } from "@/component-meta/registry";
import { previewsBySlug } from "./approximations";

/**
 * Guards the page/preview registry agreement (plan 434). A preview that exists
 * but is on no page is dead code; a page that names a preview the registry does
 * not know renders nothing and the reader is silently told nothing. Both
 * directions must fail here.
 */

const pageDirectory = fileURLToPath(
  new URL("../../../content/docs/components/", import.meta.url),
);

const pages = readdirSync(pageDirectory)
  .filter((file) => file.endsWith(".mdx"))
  .map((file) => ({
    file,
    body: readFileSync(join(pageDirectory, file), "utf8"),
  }));

const blockSlugs = (body: string): ReadonlyArray<string> =>
  [...body.matchAll(/<ComponentPreview slug="([^"]+)"/g)].map(
    (match) => match[1] ?? "",
  );

describe("component preview registry", () => {
  it("puts every registered preview on its component's page", () => {
    const missing = [...previewsBySlug.keys()].filter((slug) => {
      const page = pages.find((candidate) => candidate.file === `${slug}.mdx`);
      return page === undefined || !blockSlugs(page.body).includes(slug);
    });
    expect(missing).toEqual([]);
  });

  it("only lets a page name a registered preview", () => {
    const unregistered = pages.flatMap((page) =>
      blockSlugs(page.body)
        .filter((slug) => !previewsBySlug.has(slug))
        .map((slug) => `${page.file}: ${slug}`),
    );
    expect(unregistered).toEqual([]);
  });

  it("only registers previews for delivered components", () => {
    const planned = [...previewsBySlug.keys()].filter(
      (slug) => bySlug.get(slug)?.status === "planned",
    );
    expect(planned).toEqual([]);
  });
});
