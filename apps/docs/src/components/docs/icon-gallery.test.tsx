import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { filterIcons, galleryIcons } from "../../lib/icon-gallery";
import { IconGalleryView } from "./icon-gallery";

const noop = (): void => undefined;

const markup = renderToStaticMarkup(
  <IconGalleryView onQueryChange={noop} query="" />,
);

describe("the icon gallery", () => {
  it("draws every icon under its own name", () => {
    expect(galleryIcons.length).toBeGreaterThan(60);
    expect((markup.match(/<figure/g) ?? []).length).toBe(galleryIcons.length);
    expect(
      galleryIcons.filter(
        ({ name }) => !markup.includes(`>${name}</figcaption>`),
      ),
    ).toEqual([]);
  });

  it("draws each icon's shipped markup exactly once", () => {
    const missing = galleryIcons.filter(
      ({ markup: glyph }) => markup.split(glyph).length - 1 !== 1,
    );

    expect(missing).toEqual([]);
  });

  it("takes the glyphs out of the accessibility tree", () => {
    expect((markup.match(/aria-hidden="true"/g) ?? []).length).toBe(
      galleryIcons.length,
    );
  });

  it("opens on the whole set and counts what a query leaves", () => {
    expect(markup).toContain(
      `${galleryIcons.length} of ${galleryIcons.length} icons`,
    );

    const query = "arrow";
    const matches = filterIcons(galleryIcons, query);
    const linked = renderToStaticMarkup(
      <IconGalleryView onQueryChange={noop} query={query} />,
    );

    expect(linked).toContain(
      `${matches.length} of ${galleryIcons.length} icons`,
    );
    expect(
      matches.filter(({ name }) => !linked.includes(`>${name}</figcaption>`)),
    ).toEqual([]);
    expect(
      galleryIcons
        .filter((entry) => !matches.includes(entry))
        .filter(({ name }) => linked.includes(`>${name}</figcaption>`)),
    ).toEqual([]);
  });

  it("labels the filter box for a screen reader", () => {
    expect(markup).toContain("Filter icons by name");
    expect(markup).toContain('type="search"');
  });

  it("mounts once, on the Graphics page, and says which renderer draws it", () => {
    const mount = readFileSync(
      new URL("./icon-gallery.tsx", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const page = readFileSync(
      new URL("../../../../../packages/icons/docs/icon.mdx", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const previews = readFileSync(
      new URL("../../lib/package-preview.ts", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const primitives = readFileSync(
      new URL("../../../content/docs/primitives/index.mdx", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(mount).toContain("useIndexQuery()");
    expect(mount).toContain(
      "<IconGalleryView onQueryChange={chooseQuery} query={query} />",
    );

    expect(previews).toContain(
      '{ origin: "icons", path: "icon.mdx", demo: "icon-gallery-demo" }',
    );

    expect(primitives).not.toContain("<IconGallery");
    expect(primitives).toContain("](/graphics/icons/icon)");

    expect(page).toContain("drawn from the markup the package ships");
    expect(page).toContain("style.color");
  });
});
