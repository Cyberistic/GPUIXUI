import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RelatedComponents } from "./related-components";

/**
 * Guards the 404 the first real component page exposed (plan 422): `Buttons`
 * relates to `Button groups`, which is still `planned` and has no page, so an
 * unconditional link sent the reader to a missing route. A planned related
 * record must render as a label; the link returns when the page exists.
 */
describe("related components", () => {
  it("labels a planned record instead of linking to a page that does not exist", () => {
    const html = renderToStaticMarkup(<RelatedComponents slug="button" />);
    expect(html).toContain("Button groups (planned)");
    expect(html).not.toContain('href="/docs/components/button-group"');
  });

  it("renders nothing for an unknown component", () => {
    expect(renderToStaticMarkup(<RelatedComponents slug="nope" />)).toBe("");
  });
});
