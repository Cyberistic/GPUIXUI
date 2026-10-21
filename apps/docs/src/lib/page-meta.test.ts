import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { docsMetadata, pageTitle } from "./page-meta";
import { absoluteUrl, siteOrigin } from "./site";
import { appName } from "./shared";

/**
 * A docs page's metadata.
 *
 * Every page used to inherit one title from the root layout, so the only way to
 * tell seventy tabs apart was to read the URL. The guards below fix what a page
 * must publish: its own title, a description, and an absolute canonical URL the
 * platform switch does not fork (the switch is a query string).
 *
 * The route modules are read from disk because a route's `head` only runs inside
 * the Start build; the text is what mounts it.
 */

type Head = ReturnType<typeof docsMetadata>;

const head = (path: string, title: string, description?: string): Head =>
  docsMetadata({ url: path, title, description });

const named = (result: Head, name: string) =>
  result.meta.find((tag) => "name" in tag && tag.name === name);

const property = (result: Head, name: string) =>
  result.meta.find((tag) => "property" in tag && tag.property === name);

const descriptionOf = (result: Head): string => {
  const tag = named(result, "description");

  expect(tag, "no description meta tag").toBeDefined();
  return tag && "content" in tag ? (tag.content ?? "") : "";
};

const canonicalOf = (result: Head): string | undefined =>
  result.links.find((link) => link.rel === "canonical")?.href;

describe("a docs page's head", () => {
  it("names the page, not the site", () => {
    const result = head(
      "/docs/components/dialog",
      "Dialog",
      "A modal surface.",
    );

    expect(descriptionOf(result)).toBe("A modal surface.");
    expect(result.meta[0]).toEqual({ title: `Dialog · ${appName}` });
    expect(pageTitle("Dialog")).toBe(`Dialog · ${appName}`);
  });

  it("publishes an absolute canonical URL for the page", () => {
    const result = head("/docs/primitives/button", "Button");
    const url = `${siteOrigin}/docs/primitives/button`;

    expect(canonicalOf(result)).toBe(url);
    expect(property(result, "og:url")?.content).toBe(url);
  });

  it("keeps the platform switch out of the canonical URL", () => {
    const result = head("/docs/components/button", "Button", "The action.");

    expect(canonicalOf(result)).not.toContain("platform");
    // The switch still travels in a shareable link; only the canonical drops it.
    expect(absoluteUrl("/docs/components/button?platform=win32")).toContain(
      "platform=win32",
    );
  });

  it("does not double the slash for the docs index or the landing page", () => {
    expect(canonicalOf(head("/docs", "Introduction"))).toBe(
      `${siteOrigin}/docs`,
    );
    expect(canonicalOf(head("/", "Home"))).toBe(`${siteOrigin}/`);
  });

  it("falls back to a real description when a page has none", () => {
    const missing = descriptionOf(head("/docs/runtime", "Runtime"));
    const blank = descriptionOf(head("/docs/runtime", "Runtime", "   "));

    expect(missing).toContain(appName);
    expect(blank).toBe(missing);
  });

  it("is mounted by every docs route and by the landing page", () => {
    const read = (name: string): string =>
      readFileSync(new URL(`../routes/${name}`, import.meta.url), "utf8");

    const docsRoutes = [read("docs/index.tsx"), read("docs/$.tsx")];

    expect(
      docsRoutes.filter(
        (module) =>
          !module.includes("docsMetadata(") ||
          !module.includes("loaderData ??"),
      ),
    ).toEqual([]);
    expect(read("index.tsx")).toContain('absoluteUrl("/")');

    // The loader's `path` is the file a "Copy page" reads; the canonical URL is
    // the page's `url`. Passing the file path shipped
    // `/components/dialog.mdx` as a canonical, which is why this is checked.
    const view = readFileSync(
      new URL("./docs-view.tsx", import.meta.url),
      "utf8",
    );
    expect(view).toContain("url: site.url");
    expect(view).toContain("url: packaged.url");
  });
});
