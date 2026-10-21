import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  docsMetadata,
  landingDescription,
  landingMeta,
  landingTitle,
  pageTitle,
  socialImage,
} from "./page-meta";
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

type Head = ReturnType<typeof docsMetadata> | ReturnType<typeof landingMeta>;

const head = (path: string, title: string, description?: string): Head =>
  docsMetadata({ url: path, title, description });

const read = (name: string): string =>
  readFileSync(new URL(`../routes/${name}`, import.meta.url), "utf8");

/** The content of the first `name="…"` tag, if the head publishes one. */
const named = (result: Head, name: string): string | undefined =>
  result.meta.flatMap((tag) =>
    "name" in tag && tag.name === name && "content" in tag ? [tag.content] : [],
  )[0];

/** The content of the first `property="…"` tag, if the head publishes one. */
const property = (result: Head, name: string): string | undefined =>
  result.meta.flatMap((tag) =>
    "property" in tag && tag.property === name && "content" in tag
      ? [tag.content]
      : [],
  )[0];

const descriptionOf = (result: Head): string => {
  const description = named(result, "description");

  expect(description, "no description meta tag").toBeDefined();
  return description ?? "";
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
    expect(property(result, "og:url")).toBe(url);
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
    const docsRoutes = [read("docs/index.tsx"), read("docs/$.tsx")];

    expect(
      docsRoutes.filter(
        (module) =>
          !module.includes("docsMetadata(") ||
          !module.includes("loaderData ??"),
      ),
    ).toEqual([]);
    expect(read("index.tsx")).toContain("landingMeta()");

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

describe("the share card", () => {
  const pages = [head("/docs/patterns", "Patterns"), landingMeta()];

  it("is published by a docs page and by the landing page", () => {
    const missing = pages.filter(
      (result) =>
        property(result, "og:image") !== socialImage.url ||
        named(result, "twitter:image") !== socialImage.url,
    );

    expect(missing).toEqual([]);
  });

  it("declares the image's type, size and alternative text", () => {
    const result = head("/docs/patterns", "Patterns");

    expect(property(result, "og:image:type")).toBe("image/png");
    expect(property(result, "og:image:width")).toBe(String(socialImage.width));
    expect(property(result, "og:image:height")).toBe(
      String(socialImage.height),
    );
    expect(property(result, "og:image:alt")).toBe(`${appName} mark`);
    expect(named(result, "twitter:image:alt")).toBe(socialImage.alt);
  });

  it("points at a file that ships in public/", () => {
    expect(socialImage.url).toBe(`${siteOrigin}/logo.png`);
    expect(existsSync(new URL("../../public/logo.png", import.meta.url))).toBe(
      true,
    );
    // A share URL is absolute; a relative path renders as a broken card.
    expect(socialImage.url.startsWith("https://")).toBe(true);
  });
});

describe("the landing page's head", () => {
  const result = landingMeta();

  it("names and describes the front door for a share card", () => {
    // The landing is a route, not a collection document, so it skipped
    // `docsMetadata` entirely: a shared link showed a title and no description.
    expect(result.meta[0]).toEqual({ title: landingTitle });
    expect(named(result, "description")).toBe(landingDescription);
    expect(named(result, "twitter:card")).toBe("summary");
    expect(property(result, "og:title")).toBe(landingTitle);
    expect(property(result, "og:description")).toBe(landingDescription);
  });

  it("publishes its absolute URL without a doubled slash", () => {
    const url = `${siteOrigin}/`;

    expect(canonicalOf(result)).toBe(url);
    expect(property(result, "og:url")).toBe(url);
  });
});
