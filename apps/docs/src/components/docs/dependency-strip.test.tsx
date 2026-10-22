import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DependencyStrip } from "./dependency-strip";

/**
 * The strip is the only place a package page states what its component is
 * built on, so it has to print the generated list with a working link, name the
 * module the list was read from, and stay silent where the author already wrote
 * the section.
 *
 * `drawer` is a page the package mounts at its own URL; `dialog` is shadowed by
 * a curated page, so the strip is never rendered for it in the app even though
 * the index still describes its module.
 */

const render = (url: string): string =>
  renderToStaticMarkup(<DependencyStrip url={url} />);

describe("the dependency strip", () => {
  it("prints the packages the component imports, each linked to its page", () => {
    const markup = render("/docs/components/drawer");

    expect(markup).toContain("Built on");
    expect(markup).toContain('href="/docs/runtime">@gpuix/react</a>');
    expect(markup).toContain('href="/docs/icons/icon">@gpuixui/icons</a>');
    expect(markup).toContain('href="/docs/styling">@gpuixui/tw</a>');
    expect(markup).toContain('href="/docs/architecture#the-packages"');
  });

  it("names the module the imports were read from", () => {
    // The reader should be able to check the list against the source.
    expect(render("/docs/components/drawer")).toContain("drawer.tsx");
    expect(render("/docs/primitives/button")).toContain("Button.tsx");
  });

  it("renders nothing where the page writes its own Dependencies section", () => {
    expect(render("/docs/primitives/tooltip")).toBe("");
  });

  it("renders nothing for a page the index does not know", () => {
    expect(render("/docs/components/not-a-page")).toBe("");
    expect(render("/docs/primitives")).toBe("");
  });
});
