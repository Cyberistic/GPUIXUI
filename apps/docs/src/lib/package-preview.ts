import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import type { PackageOrigin } from "./collection-routes";

export interface PackagePreview {
  readonly origin: PackageOrigin;

  readonly path: string;

  readonly demo: string;
}

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
  { origin: "data", path: "table-filtering.mdx", demo: "table-filter-demo" },
  { origin: "data", path: "tree-view.mdx", demo: "tree-view-demo" },
  { origin: "data", path: "virtual-tree.mdx", demo: "virtual-tree-demo" },
  { origin: "data", path: "stat-card.mdx", demo: "stat-card-demo" },
  { origin: "data", path: "key-value.mdx", demo: "key-value-demo" },
  { origin: "data", path: "data-toolbar.mdx", demo: "data-toolbar-demo" },
  {
    origin: "data",
    path: "expandable-rows.mdx",
    demo: "expandable-rows-demo",
  },
  {
    origin: "data",
    path: "frozen-columns.mdx",
    demo: "frozen-columns-demo",
  },
  {
    origin: "data",
    path: "advanced-filter.mdx",
    demo: "advanced-filter-demo",
  },
  { origin: "data", path: "virtualization.mdx", demo: "virtualization-demo" },
  {
    origin: "data",
    path: "column-configuration.mdx",
    demo: "column-configuration-demo",
  },
  { origin: "data", path: "charts/charts.mdx", demo: "charts-demo" },
  { origin: "icons", path: "icon.mdx", demo: "icon-gallery-demo" },
  { origin: "shell", path: "toolbar.mdx", demo: "toolbar-demo" },
  { origin: "shell", path: "app-menu.mdx", demo: "app-menu-demo" },
  { origin: "shell", path: "status-bar.mdx", demo: "status-bar-demo" },
];

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
