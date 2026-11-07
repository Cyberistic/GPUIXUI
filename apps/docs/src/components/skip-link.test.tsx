import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mainContentId, SkipLink } from "./skip-link";

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
    const skip = root.indexOf("<SkipLink />");
    const provider = root.indexOf("<RootProvider");

    expect(skip).toBeGreaterThan(-1);
    expect(provider).toBeGreaterThan(-1);
    expect(skip).toBeLessThan(provider);
  });

  it("carries its target on every content surface", () => {
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

    expect(read("../lib/docs-view.tsx")).toContain("tabIndex={-1}");
  });

  it("stays off-screen until it is focused", () => {
    const rule = /\.gx-skip-link \{([\s\S]*?)\}/.exec(css)?.[1] ?? "";
    const focused = /\.gx-skip-link:focus \{([\s\S]*?)\}/.exec(css)?.[1] ?? "";

    expect(rule).toContain("top: -100px");
    expect(focused).toContain("top: 12px");

    expect(rule).toContain("background: var(--background)");
    expect(rule).toContain("color: var(--foreground)");
    expect(focused).toContain("outline: 2px solid var(--ring)");

    expect(rule).toContain("z-index: 100");
  });

  it("states the contract in the preview policy", () => {
    expect(policy).toContain("## The site's own keyboard path");
    expect(policy).toContain("skip link");
    expect(policy).toContain(mainContentId);
    expect(policy).toContain("skip-link.test.tsx");
  });
});
