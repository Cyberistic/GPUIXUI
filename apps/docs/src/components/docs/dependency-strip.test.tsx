import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DependencyStrip } from "./dependency-strip";

/**
 * The strip is the only place a component page states what its component is
 * built on, so it has to print the generated list with a working link, name the
 * module the list was read from, and stay silent where the author already wrote
 * the section.
 *
 * `drawer` is a page the package mounts at its own URL; `button` is a curated
 * page whose module the package does not document at that URL, so it proves the
 * index reads the page's own `<ComponentSource>` rather than the shadowed page.
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

  it("renders a curated page's dependency list from the module it shows", () => {
    // The curated button page documents the primitives' action; the components
    // package has no page at this URL, so the entry can only come from the
    // page's own source block. Its imports are the primitives' ones.
    const button = render("/docs/components/button");

    expect(button).toContain("Built on");
    expect(button).toContain("Button.tsx");
    expect(button).toContain('href="/docs/styling">@gpuixui/tw</a>');
    expect(button).toContain('href="/docs/motion">@gpuixui/motion</a>');
  });

  it("renders a curated page the package documents at another URL", () => {
    // `table` lives in the data package at /docs/data-display/table; the
    // curated page shows the same module at /docs/components/table.
    expect(render("/docs/components/table")).toContain("table.tsx");
  });

  it("renders nothing for a page the index does not know", () => {
    expect(render("/docs/components/not-a-page")).toBe("");
    expect(render("/docs/primitives")).toBe("");
  });
});
