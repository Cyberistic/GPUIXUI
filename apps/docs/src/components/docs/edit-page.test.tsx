import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditPage } from "./edit-page";

/**
 * The footer link to the Markdown a page renders.
 *
 * The reader who finds a wrong sentence is the one who can fix it, so the link
 * has to open the file the site actually reads — and say which file that is.
 * A curated page shadows a package page at the same URL, which is why the site
 * origin and the package origin must not print each other's path.
 */

describe("the edit link", () => {
  it("opens the package's Markdown for a package page, and names it", () => {
    const markup = renderToStaticMarkup(
      <EditPage origin="components" path="dialog.mdx" />,
    );

    expect(markup).toContain(
      'href="https://github.com/Cyberistic/GPUIXUI/edit/master/packages/components/docs/dialog.mdx"',
    );
    expect(markup).toContain(">Edit this page on GitHub</a>");
    expect(markup).toContain(
      "<code>packages/components/docs/dialog.mdx</code>",
    );
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noreferrer noopener"');
  });

  it("opens the site's own file for a curated page, not the page it shadows", () => {
    const markup = renderToStaticMarkup(
      <EditPage origin="site" path="components/dialog.mdx" />,
    );

    expect(markup).toContain(
      'href="https://github.com/Cyberistic/GPUIXUI/edit/master/apps/docs/content/docs/components/dialog.mdx"',
    );
    expect(markup).not.toContain("packages/components/docs");
  });

  it("is mounted at the foot of every page, from the page's own origin and path", () => {
    // The frame is the only place that holds both values, and a literal path
    // beside a page is the drift the derived link exists to remove.
    const view = readFileSync(
      new URL("../../lib/docs-view.tsx", import.meta.url),
      "utf8",
    );

    expect(view).toContain("<EditPage origin={origin} path={path} />");
  });
});
