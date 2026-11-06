import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CollectionIndexBody } from "./collection-index";
import type { CollectionIndexView } from "@/lib/collection-index";

const media: CollectionIndexView = {
  url: "/media",
  title: "Media surfaces",
  description: "Image preview, upload, crop and QR surfaces.",
  packageName: "@gpuixui/media",
  pages: [
    {
      title: "FileUpload",
      description: "A queue of files with per-file state, progress and retry.",
      url: "/media/file-upload",
    },
    {
      title: "QRCode",
      description: "A QR symbol the caller owns the data for.",
      url: "/media/qr-code",
    },
  ],
};

describe("the generated collection index", () => {
  it("lists every page with the link and the sentence it ships", () => {
    const html = renderToStaticMarkup(<CollectionIndexBody index={media} />);

    expect(html).toContain("2 pages in @gpuixui/media");
    expect(html).toContain("generated from the package");

    expect([...html.matchAll(/<tr/g)]).toHaveLength(media.pages.length + 1);
    media.pages.forEach((page) => {
      expect(html).toContain(`href="${page.url}"`);
      expect(html).toContain(page.title);
      expect(html).toContain(page.description);
    });
  });

  it("says one page in the singular", () => {
    const icons: CollectionIndexView = {
      ...media,
      url: "/icons",
      title: "Icon set",
      packageName: "@gpuixui/icons",
      pages: [
        {
          title: "Icon",
          description: "One glyph, its geometry and its naming rule.",
          url: "/graphics/icons/icon",
        },
      ],
    };

    expect(
      renderToStaticMarkup(<CollectionIndexBody index={icons} />),
    ).toContain("1 page in @gpuixui/icons");
  });
});
