import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotFoundBody } from "./not-found";

/**
 * Bug guarded (plan 439): the not-found body opened its own `<main>` inside
 * `HomeLayout`'s `<main id="nd-home-layout">`, so every 404 shipped two page
 * landmarks. The built-site smoke found it; this keeps the default suite able
 * to fail on the same regression without a FrameworkProvider or a server.
 */
const html = renderToStaticMarkup(<NotFoundBody />);

describe("not found body", () => {
  it("opens no landmark of its own", () => {
    // HomeLayout owns the page's only <main>; the body must not nest one.
    expect(html).not.toContain("<main");
  });

  it("names the page and offers the way back", () => {
    expect(html).toContain("Page not found");
    expect(html).toContain('href="/docs"');
  });
});
