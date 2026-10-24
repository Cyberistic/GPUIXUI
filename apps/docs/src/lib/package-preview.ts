import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { PackageOrigin } from "./collection-routes";

/**
 * The previews the site mounts on a package page.
 *
 * A package page is the page the package ships with, rendered as the Markdown it
 * is, so the site cannot add a line to it. A lane whose pages therefore show no
 * drawing used to be strategy 4 by accident rather than by decision. This table
 * is the site's half: the page it names gets the demo it names, mounted above
 * the Markdown the package wrote, and the package's file stays the package's.
 *
 * A drawing belongs in a demo module either way, so the table adds no second
 * copy of a surface — `component-preview.test.ts` holds these demos to the same
 * registry the curated pages read, and `package-preview.test.ts` holds every row
 * to a page the site serves.
 */

/** One package page the site previews, and the drawing it gets. */
export interface PackagePreview {
  /** The collection the page belongs to. */
  readonly origin: PackageOrigin;
  /** The page's path inside the collection, e.g. `file-tree.mdx`. */
  readonly path: string;
  /** The registered demo the site mounts for it. */
  readonly demo: string;
}

/** The package pages the site previews, and the drawing each one gets. */
export const packagePreviews: ReadonlyArray<PackagePreview> = [
  { origin: "files", path: "file-tree.mdx", demo: "file-tree-demo" },
  { origin: "files", path: "log-viewer.mdx", demo: "log-viewer-demo" },
  {
    origin: "files",
    path: "property-panel.mdx",
    demo: "files-property-panel-demo",
  },
  { origin: "data", path: "table-sorting.mdx", demo: "table-sorting-demo" },
  { origin: "data", path: "table-selection.mdx", demo: "table-selection-demo" },
  { origin: "data", path: "stat-card.mdx", demo: "stat-card-demo" },
  { origin: "shell", path: "toolbar.mdx", demo: "toolbar-demo" },
  { origin: "shell", path: "app-menu.mdx", demo: "app-menu-demo" },
  { origin: "shell", path: "status-bar.mdx", demo: "status-bar-demo" },
];

/** The drawing the site mounts for a package page, when it names one. */
export const previewFor = (
  origin: PackageOrigin,
  path: string,
): Option.Option<string> =>
  Option.map(
    Arr.findFirst(
      packagePreviews,
      (preview) => preview.origin === origin && preview.path === path,
    ),
    (preview) => preview.demo,
  );
