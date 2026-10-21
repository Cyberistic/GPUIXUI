import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { absoluteUrl, siteOrigin } from "./site";

/**
 * The site's origin.
 *
 * Three surfaces must agree on it — the canonical link, the Open Graph URL and
 * the sitemap — and a fourth writes it independently: the deploy stack. This
 * guard keeps the docs site and the thing that publishes it on one host, so a
 * domain move cannot ship canonical URLs pointing at the old one.
 */

/** The domain the deploy stack attaches, read from its one declaration. */
const deployedDomain = (): string | undefined => {
  const stack = readFileSync(
    new URL("../../../../packages/deploy/alchemy.run.docs.ts", import.meta.url),
    "utf8",
  );
  return stack
    .split("\n")
    .find((line) => line.includes("const DOCS_DOMAIN"))
    ?.split('"')[1];
};

describe("the site origin", () => {
  it("is the host the deploy stack publishes", () => {
    expect(deployedDomain()).toBeDefined();
    expect(siteOrigin).toBe("https://" + deployedDomain());
  });

  it("builds an absolute URL for a path, a bare path and the root", () => {
    expect(absoluteUrl("/docs/runtime")).toBe(`${siteOrigin}/docs/runtime`);
    expect(absoluteUrl("docs/runtime")).toBe(`${siteOrigin}/docs/runtime`);
    expect(absoluteUrl("/")).toBe(`${siteOrigin}/`);
  });
});
