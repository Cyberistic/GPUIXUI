/**
 * The management console on the landing.
 *
 * The block shipped on `/docs/blocks/dashboard-management` and the landing
 * still showed only the activity dashboard, so the page that advertises the
 * compositions never showed the densest one. The section renders the block
 * itself — the same tree the docs page mounts — so a change in the recipe
 * cannot leave a stale screenshot behind.
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Management } from "./landing";

const markup = renderToStaticMarkup(<Management />);

describe("the management console on the landing", () => {
  it("renders the block's own root", () => {
    expect(markup).toContain('class="gx-mgmt"');
    expect(markup).toContain("API keys");
    expect(markup).toContain("Command palette");
  });

  it("links the section to the recipe it shows", () => {
    expect(markup).toContain('href="/docs/blocks/dashboard-management"');
    expect(markup).toContain("Every deploy, one screen.");
  });

  it("says the preview is a rendering, not the native window", () => {
    expect(markup).toContain("Browser preview of the native composition");
  });
});
