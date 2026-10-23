import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { filterIcons, galleryIcons } from "../../lib/icon-gallery";
import { IconGalleryView } from "./icon-gallery";

/**
 * The gallery as it renders.
 *
 * The page mounts this component instead of listing icon names by hand, so the
 * guard is that the markup carries every entry of the model — a tile dropped
 * here has no other symptom — that each glyph is the shipped string, and that a
 * query narrows the grid to exactly the tiles the model names. The last case
 * reads the mount and the page, which a server render cannot show: the filter
 * has to reach the URL, and the page has to say that the browser paints the
 * geometry with the page's ink rather than with GPUix's tint.
 */

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
    // Two tiles sharing geometry would mean one entry was painted from the
    // wrong name; the registry already refuses duplicate shapes, so any repeat
    // here is the gallery's.
    const missing = galleryIcons.filter(
      ({ markup: glyph }) => markup.split(glyph).length - 1 !== 1,
    );

    expect(missing).toEqual([]);
  });

  it("takes the glyphs out of the accessibility tree", () => {
    // The name is the figcaption's text; an announced SVG would read the shape
    // twice, and a decorative icon must not claim a role.
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

  it("filters through the URL, and the page says which renderer draws it", () => {
    const mount = readFileSync(
      new URL("./icon-gallery.tsx", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    const page = readFileSync(
      new URL("../../../content/docs/primitives/index.mdx", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");

    expect(mount).toContain("useIndexQuery()");
    expect(mount).toContain(
      "<IconGalleryView onQueryChange={chooseQuery} query={query} />",
    );
    // The page mounts the URL-backed component and links the reference half.
    expect(page).toContain("<IconGallery />");
    expect(page).toContain("](/docs/icons/icon)");
    // Honesty: the drawings are the package's geometry, painted by the browser.
    expect(page).toContain("drawn from the markup the package ships");
    expect(page).toContain("style.color");
  });
});
