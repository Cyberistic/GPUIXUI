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

describe("the site origin", () => {
  it("is the host the deploy stack publishes", () => {
    const stack = readFileSync(
      new URL(
        "../../../../packages/deploy/alchemy.run.docs.ts",
        import.meta.url,
      ),
      "utf8",
    );
    const domain = /const DOCS_DOMAIN = "([^"]+)"/.exec(stack)?.[1];

    expect(domain).toBeDefined();
    expect(siteOrigin).toBe(`https://${domain}`);
  });

  it("builds an absolute URL for a path, a bare path and the root", () => {
    expect(absoluteUrl("/docs/runtime")).toBe(`${siteOrigin}/docs/runtime`);
    expect(absoluteUrl("docs/runtime")).toBe(`${siteOrigin}/docs/runtime`);
    expect(absoluteUrl("/")).toBe(`${siteOrigin}/`);
  });
});
