import { describe, expect, it } from "vitest";
import { absoluteUrl, SITE_URL } from "./site";

/**
 * Guards the site's public origin (plan 418): canonical links, OpenGraph and the
 * sitemap must be absolute, or a crawler cannot resolve them. The failures it
 * catches are a relative URL sneaking back in and a doubled or missing slash at
 * the origin boundary.
 */
describe("site URL", () => {
  it("is an absolute https origin without a trailing slash", () => {
    expect(SITE_URL).toMatch(/^https:\/\/[^/]+$/);
  });

  it("joins root-relative and bare paths to the origin", () => {
    expect(absoluteUrl("/docs/installation")).toBe(
      `${SITE_URL}/docs/installation`,
    );
    expect(absoluteUrl("docs/installation")).toBe(
      `${SITE_URL}/docs/installation`,
    );
  });

  it("keeps the origin path for the home page", () => {
    expect(absoluteUrl("/")).toBe(`${SITE_URL}/`);
  });
});
