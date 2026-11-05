import { docsRoute } from "./shared";
import {
  chartsDocsRoute,
  componentDocsRoute,
  dataDocsRoute,
  dockDocsRoute,
  editorDocsRoute,
  filesDocsRoute,
  iconDocsRoute,
  mediaDocsRoute,
  effectsDocsRoute,
  primitiveDocsRoute,
  shellDocsRoute,
} from "./shared";

/**
 * The package documentation the site mounts.
 *
 * Each package writes the page a component ships with; the site renders that
 * directory rather than a copy, so the page and the package cannot disagree.
 * This module is pure data: `package-docs.ts` builds the loaders from it and
 * `package-docs.test.ts` holds it to the directories on disk.
 */

/** Which package a page came from. */
export type PackageOrigin =
  | "primitives"
  | "icons"
  | "charts"
  | "components"
  | "data"
  | "editor"
  | "files"
  | "shell"
  | "dock"
  | "media"
  | "fx";

/**
 * Which collection a page came from.
 *
 * The site writes its own pages in `content/docs`; a package writes the page a
 * component ships with in `packages/<pkg>/docs`. Both render through one frame,
 * and `page-edit.ts` needs to know which tree a page's Markdown lives in.
 */
export type PageOrigin = "site" | PackageOrigin;

/**
 * The index a collection serves at its own route when the package writes none.
 *
 * `packages/components/docs` and the other collections that have a site-written
 * index page leave this out: the site page owns the route, so describing a
 * second one here would describe a page nobody serves.
 */
export interface CollectionIndex {
  /** The page's frontmatter title, e.g. `Media surfaces`. */
  readonly title: string;
  /** One sentence, like every other page's description. */
  readonly description: string;
}

/** One mounted package docs directory. */
export interface PackageCollection {
  readonly origin: PackageOrigin;
  /** The package directory, relative to the repository root. */
  readonly dir: string;
  /** The published package the pages belong to, e.g. `@gpuixui/primitives`. */
  readonly packageName: string;
  /** Where the collection's pages render. */
  readonly route: string;
  /** The sidebar folder the pages fill. */
  readonly section: string;
  /** What the note above a page calls the package. */
  readonly kind: string;
  /** The generated index at {@link route}, for a package with no index page. */
  readonly index?: CollectionIndex;
}

const primitives: PackageCollection = {
  origin: "primitives",
  dir: "packages/primitives/docs",
  packageName: "@gpuixui/primitives",
  route: primitiveDocsRoute,
  section: "Primitives",
  kind: "primitive",
};

const icons: PackageCollection = {
  origin: "icons",
  dir: "packages/icons/docs",
  packageName: "@gpuixui/icons",
  route: iconDocsRoute,
  section: "Graphics",
  kind: "icon set",
  index: {
    title: "Icon set",
    description:
      "Every glyph the set ships, with the geometry it paints and its naming rule.",
  },
};

const components: PackageCollection = {
  origin: "components",
  dir: "packages/components/docs",
  packageName: "@gpuixui/components",
  route: componentDocsRoute,
  section: "Components",
  kind: "component",
};

const charts: PackageCollection = {
  origin: "charts",
  dir: "packages/data/docs/charts",
  packageName: "@gpuixui/data",
  route: chartsDocsRoute,
  section: "Graphics",
  kind: "chart",
  // The package writes its own landing page (`charts/index.mdx`), so the site
  // generates no index for this route.
};

const data: PackageCollection = {
  origin: "data",
  dir: "packages/data/docs",
  packageName: "@gpuixui/data",
  route: dataDocsRoute,
  section: "Data display",
  kind: "data surface",
};

const editor: PackageCollection = {
  origin: "editor",
  dir: "packages/editor/docs",
  packageName: "@gpuixui/editor",
  route: editorDocsRoute,
  section: "Workspace",
  kind: "code surface",
  index: {
    title: "Code surfaces",
    description:
      "A code editor, a diff, a Markdown editor and search-and-replace.",
  },
};

const files: PackageCollection = {
  origin: "files",
  dir: "packages/files/docs",
  packageName: "@gpuixui/files",
  route: filesDocsRoute,
  section: "Workspace",
  kind: "file surface",
  index: {
    title: "File surfaces",
    description: "A file tree, a log viewer and an inspector panel.",
  },
};

const shell: PackageCollection = {
  origin: "shell",
  dir: "packages/shell/docs",
  packageName: "@gpuixui/shell",
  route: shellDocsRoute,
  section: "Workspace",
  kind: "shell surface",
  index: {
    title: "Shell surfaces",
    description:
      "The app menu, the status bar and the toolbar that frame a window.",
  },
};

const dock: PackageCollection = {
  origin: "dock",
  dir: "packages/dock/docs",
  packageName: "@gpuixui/dock",
  route: dockDocsRoute,
  section: "Workspace",
  kind: "panel surface",
  index: {
    title: "Panel surfaces",
    description: "Split panes, panel groups and a dock layout for a workspace.",
  },
};

const media: PackageCollection = {
  origin: "media",
  dir: "packages/media/docs",
  packageName: "@gpuixui/media",
  route: mediaDocsRoute,
  section: "Workspace",
  kind: "media surface",
  index: {
    title: "Media surfaces",
    description:
      "Image preview, upload, crop and QR surfaces for a file workflow.",
  },
};

const fx: PackageCollection = {
  origin: "fx",
  dir: "packages/fx/docs",
  packageName: "@gpuixui/fx",
  route: effectsDocsRoute,
  section: "Effects",
  kind: "effect",
  index: {
    title: "Effects",
    description:
      "Decorative motion — particles, stars, shine and ripple, kinetic text — kept out of the core library.",
  },
};

export const packageCollections = [
  primitives,
  icons,
  charts,
  components,
  data,
  editor,
  files,
  shell,
  dock,
  media,
  fx,
] as const;

export const collectionByOrigin = {
  primitives,
  icons,
  charts,
  components,
  data,
  editor,
  files,
  shell,
  dock,
  media,
  fx,
} satisfies Record<PackageOrigin, PackageCollection>;

/**
 * The sidebar folders the package pages fill.
 *
 * Each lane is one flat, alphabetical list: a reader looks for a lane of the
 * library, not for a package boundary. The workspace lane does the same for its
 * five packages — the dock, code, file, chrome and media surfaces are one
 * destination in the sidebar even though each mounts under its own route.
 */
/**
 * Whether a collection owns a page.
 *
 * A collection serves only the pages **its own** directory holds. The charts
 * live in `packages/data/docs/charts`, inside the data package's own docs
 * directory, and the data collection's glob could not be made to leave them
 * out — so the data lane listed the charts page under `/data-display` as
 * well, at a URL that answered **404**.
 *
 * The owner is decided by the page's **path**, which is relative to the
 * collection's own directory: a page at `charts/charts.mdx` sits in the
 * charts collection's directory, so the charts collection owns it and the
 * data collection does not.
 */
export const collectionOwns = (
  origin: PackageOrigin,
  path: string,
): boolean => {
  const collection = collectionByOrigin[origin];
  const nested = packageCollections.filter(
    (candidate) =>
      candidate.origin !== origin &&
      candidate.dir.startsWith(`${collection.dir}/`),
  );
  return !nested.some((candidate) =>
    path.startsWith(`${candidate.dir.slice(collection.dir.length + 1)}/`),
  );
};

/**
 * The mounted collection that owns a route, and the slugs left over.
 *
 * A collection's route may be **nested**: the charts and the icons live under
 * the Graphics section, so their routes are `/graphics/charts` and
 * `/graphics/icons` rather than one segment. A matcher that read a single
 * segment found neither, so `/graphics/charts` answered **404** while every
 * page under it answered — and the build, which prerenders the route of every
 * collection that ships a generated index, failed on it.
 *
 * So the matcher takes the **longest** route that prefixes the path, and the
 * slugs under that route are what the collection is asked for.
 */
export const collectionAt = (slugs: ReadonlyArray<string>) => {
  const path = `${docsRoute}/${slugs.join("/")}`;
  const matches = packageCollections
    .filter(
      (collection) =>
        path === collection.route || path.startsWith(`${collection.route}/`),
    )
    // The longest route wins: `/graphics/charts` is more specific than
    // `/graphics`, and a collection owns only its own pages.
    .toSorted((left, right) => right.route.length - left.route.length);
  const collection = matches[0];
  if (collection === undefined) return undefined;
  const rest = path.slice(collection.route.length).split("/").filter(Boolean);
  return { collection, rest };
};

export const packageSections: ReadonlyArray<{
  readonly name: string;
  readonly origins: ReadonlyArray<PackageOrigin>;
}> = [
  { name: "Components", origins: ["components"] },
  { name: "Primitives", origins: ["primitives"] },
  { name: "Graphics", origins: ["charts", "icons"] },
  { name: "Data display", origins: ["data"] },
  { name: "Workspace", origins: ["dock", "editor", "files", "shell", "media"] },
  { name: "Effects", origins: ["fx"] },
];
