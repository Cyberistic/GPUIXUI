import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mainContentId, SkipLink } from "./skip-link";

/**
 * The site's bypass link.
 *
 * A docs page puts the whole sidebar before the page it documents, so without
 * a first tab stop that jumps past it a keyboard reader traverses every link
 * again on every navigation. The link only works while two things stay true:
 * the shell renders it **before** the navigation, and every content surface
 * carries the id it targets. Either half alone is the bug this file guards —
 * a link after the sidebar skips nothing, and a link with no target moves
 * focus nowhere.
 *
 * The policy (`docs/preview-strategy.md`) states both halves, so the test
 * reads the site's own documents rather than trusting them to a comment.
 */

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const root = read("../routes/__root.tsx");
const css = read("../styles/app.css");
const policy = read("../../../../docs/preview-strategy.md").replace(
  /\s+/g,
  " ",
);

describe("the skip link", () => {
  it("renders an anchor that targets the content id", () => {
    const markup = renderToStaticMarkup(<SkipLink />);

    expect(markup).toBe(
      `<a class="gx-skip-link" href="#${mainContentId}">Skip to content</a>`,
    );
    expect(mainContentId).toBe("gx-main");
  });

  it("is the first thing the shell renders, before the navigation", () => {
    // The bug guarded: moving the link under `<RootProvider>` puts it after
    // the sidebar in tree order, where Tab reaches it only after every
    // navigation link it exists to bypass.
    const skip = root.indexOf("<SkipLink />");
    const provider = root.indexOf("<RootProvider");

    expect(skip).toBeGreaterThan(-1);
    expect(provider).toBeGreaterThan(-1);
    expect(skip).toBeLessThan(provider);
  });

  it("carries its target on every content surface", () => {
    // Each surface is the page a skip link can land on. A page that keeps a
    // local id or drops `tabIndex` silently turns the link into a no-op.
    const surfaces = [
      "../lib/docs-view.tsx",
      "../components/landing/landing.tsx",
      "../components/docs/live-surface.tsx",
      "../components/not-found.tsx",
    ] as const;

    const missing = surfaces.filter((path) => {
      const source = read(path);
      return !/from "(?:@\/components\/skip-link|\.\.?\/skip-link)"/.test(
        source,
      );
    });
    expect(missing).toEqual([]);

    const targets = surfaces.filter((path) => {
      const source = read(path);
      return !/id=\{mainContentId\}/.test(source);
    });
    expect(targets).toEqual([]);

    // The docs frame is the one surface that also takes focus: it is the
    // article a reader lands on, and without `tabIndex` a fragment navigation
    // scrolls without moving the keyboard's position.
    expect(read("../lib/docs-view.tsx")).toContain("tabIndex={-1}");
  });

  it("stays off-screen until it is focused", () => {
    const rule = /\.gx-skip-link \{([\s\S]*?)\}/.exec(css)?.[1] ?? "";
    const focused = /\.gx-skip-link:focus \{([\s\S]*?)\}/.exec(css)?.[1] ?? "";

    // A bypass link sitting on the page at rest is not a bug, but this one is
    // a 13px bar over the chrome; the pair below is the contract the CSS has.
    expect(rule).toContain("top: -100px");
    expect(focused).toContain("top: 12px");
    // The bar paints from the docs palette (`docs-theme.test.ts` measures every
    // role pair), and its outline is the ring role's non-text contrast.
    expect(rule).toContain("background: var(--background)");
    expect(rule).toContain("color: var(--foreground)");
    expect(focused).toContain("outline: 2px solid var(--ring)");
    // Above the docs chrome, whose own layers stop at 50.
    expect(rule).toContain("z-index: 100");
  });

  it("states the contract in the preview policy", () => {
    expect(policy).toContain("## The site's own keyboard path");
    expect(policy).toContain("skip link");
    expect(policy).toContain(mainContentId);
    expect(policy).toContain("skip-link.test.tsx");
  });
});
