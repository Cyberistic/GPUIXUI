import { existsSync, readFileSync } from "node:fs";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { demos } from "../components/docs/demos";
import { collectionByOrigin } from "./collection-routes";
import {
  packagePreviews,
  previewFor,
  type PackagePreview,
} from "./package-preview";

/**
 * The previews the site mounts on a package page.
 *
 * A package page is the package's Markdown, so the site mounts a drawing from
 * `package-preview.ts` instead of editing the file. That makes the table the one
 * place a lane's preview is decided, and nothing in a browser would fail if a
 * row outlived its page or named a demo the registry does not hold — the page
 * would simply render one preview fewer, or throw as it mounts.
 *
 * The reads are synchronous because this is a test boundary, the same way the
 * preview registry's own guard reads the tree.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** The Markdown a row names, resolved through its mounted collection. */
const pagePath = (origin: PackagePreview["origin"], path: string): string =>
  `${collectionByOrigin[origin].dir}/${path}`;

/** The page a row names, as the tree carries it. */
const mounted = (row: PackagePreview): boolean =>
  existsSync(new URL(pagePath(row.origin, row.path), root));

/** A row's address, for a failure message that names the page. */
const address = (row: PackagePreview): string => `${row.origin}/${row.path}`;

describe("the package page previews", () => {
  it("names a page the collection actually mounts, and one row per page", () => {
    const missing = packagePreviews.filter((row) => !mounted(row)).map(address);

    expect(packagePreviews.length).toBeGreaterThanOrEqual(3);
    expect(missing).toEqual([]);

    const addresses = packagePreviews.map(address);
    expect(new Set(addresses).size).toBe(addresses.length);
  });

  it("mounts a demo the registry holds, and one the page does not mount itself", () => {
    const unregistered = packagePreviews
      .filter((row) => demos[row.demo] === undefined)
      .map(address);

    expect(unregistered).toEqual([]);

    // A page that mounts `<ComponentPreview>` itself would get two drawings:
    // the package's above the Markdown, the site's beside it. The row has to go
    // when the package starts drawing its own page.
    const doubleDrawn = packagePreviews
      .filter((row) =>
        read(pagePath(row.origin, row.path)).includes("<ComponentPreview"),
      )
      .map(address);

    expect(doubleDrawn).toEqual([]);
  });

  it("answers only the page a row names", () => {
    const answers = packagePreviews.map((row) =>
      Option.getOrNull(previewFor(row.origin, row.path)),
    );

    expect(answers).toEqual(packagePreviews.map((row) => row.demo));
    expect(Option.isNone(previewFor("files", "no-such-page.mdx"))).toBe(true);
    expect(Option.isNone(previewFor("shell", "file-tree.mdx"))).toBe(true);
  });

  it("is mounted by the package frame, above the page's own Markdown", () => {
    const view = read("apps/docs/src/lib/docs-view.tsx");
    const frame = view.slice(view.indexOf("function PackageContent"));

    expect(frame).toContain("<MountedPreview origin={origin} path={path} />");
    expect(frame.indexOf("<MountedPreview")).toBeLessThan(
      frame.indexOf("<MDX components={mdxComponents} />"),
    );
    // The curated frame is the package's Markdown-free twin and must not mount
    // the site's table: a curated page writes its own preview.
    const site = view.slice(
      view.indexOf("function SiteContent"),
      view.indexOf("function PackageContent"),
    );
    expect(site).not.toContain("<MountedPreview");
  });
});
