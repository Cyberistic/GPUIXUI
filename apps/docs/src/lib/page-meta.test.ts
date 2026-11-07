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

type Head = ReturnType<typeof docsMetadata> | ReturnType<typeof landingMeta>;

const head = (path: string, title: string, description?: string): Head =>
  docsMetadata({ url: path, title, description });

const read = (name: string): string =>
  readFileSync(new URL(`../routes/${name}`, import.meta.url), "utf8");

const named = (result: Head, name: string): string | undefined =>
  result.meta.flatMap((tag) =>
    "name" in tag && tag.name === name && "content" in tag ? [tag.content] : [],
  )[0];

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
    const result = head("/components/dialog", "Dialog", "A modal surface.");

    expect(descriptionOf(result)).toBe("A modal surface.");
    expect(result.meta[0]).toEqual({ title: `Dialog · ${appName}` });
    expect(pageTitle("Dialog")).toBe(`Dialog · ${appName}`);
  });

  it("publishes an absolute canonical URL for the page", () => {
    const result = head("/primitives/button", "Button");
    const url = `${siteOrigin}/primitives/button`;

    expect(canonicalOf(result)).toBe(url);
    expect(property(result, "og:url")).toBe(url);
  });

  it("keeps the platform switch out of the canonical URL", () => {
    const result = head("/components/button", "Button", "The action.");

    expect(canonicalOf(result)).not.toContain("platform");

    expect(absoluteUrl("/components/button?q=dialog")).toContain("q=dialog");
  });

  it("publishes the site root without doubling the slash", () => {
    expect(canonicalOf(head("/", "Home"))).toBe(`${siteOrigin}/`);
  });

  it("falls back to a real description when a page has none", () => {
    const missing = descriptionOf(head("/runtime", "Runtime"));
    const blank = descriptionOf(head("/runtime", "Runtime", "   "));

    expect(missing).toContain(appName);
    expect(blank).toBe(missing);
  });

  it("is mounted by every docs route and by the landing page", () => {
    const docsRoutes = [read("$.tsx")];

    expect(
      docsRoutes.filter(
        (module) =>
          !module.includes("docsMetadata(") ||
          !module.includes("loaderData ??"),
      ),
    ).toEqual([]);
    expect(read("index.tsx")).toContain("landingMeta()");

    const view = readFileSync(
      new URL("./docs-view.tsx", import.meta.url),
      "utf8",
    );
    expect(view).toContain("url: site.url");
    expect(view).toContain("url: packaged.url");
  });
});

describe("the share card", () => {
  const pages = [head("/getting-started", "Guide"), landingMeta()];

  it("is published by a docs page and by the landing page", () => {
    const missing = pages.filter(
      (result) =>
        property(result, "og:image") !== socialImage.url ||
        named(result, "twitter:image") !== socialImage.url,
    );

    expect(missing).toEqual([]);
  });

  it("declares the image's type, size and alternative text", () => {
    const result = head("/getting-started", "Guide");

    expect(property(result, "og:image:type")).toBe("image/png");
    expect(property(result, "og:image:width")).toBe(String(socialImage.width));
    expect(property(result, "og:image:height")).toBe(
      String(socialImage.height),
    );
    expect(property(result, "og:image:alt")).toBe(socialImage.alt);
    expect(named(result, "twitter:image:alt")).toBe(socialImage.alt);
  });

  it("points at a 1200×630 file that ships in public/", () => {
    expect(socialImage.url).toBe(`${siteOrigin}/og.png`);
    expect(socialImage.width).toBe(1200);
    expect(socialImage.height).toBe(630);
    expect(existsSync(new URL("../../public/og.png", import.meta.url))).toBe(
      true,
    );

    expect(socialImage.url.startsWith("https://")).toBe(true);
  });
});

describe("the landing page's head", () => {
  const result = landingMeta();

  it("names and describes the front door for a share card", () => {
    expect(result.meta[0]).toEqual({ title: landingTitle });
    expect(named(result, "description")).toBe(landingDescription);
    expect(named(result, "twitter:card")).toBe("summary_large_image");
    expect(property(result, "og:title")).toBe(landingTitle);
    expect(property(result, "og:description")).toBe(landingDescription);
  });

  it("publishes its absolute URL without a doubled slash", () => {
    const url = `${siteOrigin}/`;

    expect(canonicalOf(result)).toBe(url);
    expect(property(result, "og:url")).toBe(url);
  });
});
