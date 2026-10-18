import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SkipLink } from "./skip-link";

/**
 * Guards the skip link's three obligations (plan 496): it points at the page's
 * focusable target, it stays out of the chrome until focused, and it is visible
 * once focused. The browser smoke proves the behaviour; this keeps the markup
 * from drifting silently.
 */
const html = renderToStaticMarkup(<SkipLink href="#nd-page" />);

describe("skip link", () => {
  it("points at the target and names its destination", () => {
    expect(html).toContain('href="#nd-page"');
    expect(html).toContain("Skip to content");
  });

  it("is hidden until focused and visible on focus", () => {
    expect(html).toContain("sr-only");
    expect(html).toContain("focus:not-sr-only");
  });

  it("is the handle the browser smoke reads", () => {
    expect(html).toContain("data-skip-link");
  });
});
