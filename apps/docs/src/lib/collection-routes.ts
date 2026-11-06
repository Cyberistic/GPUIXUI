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

export type PageOrigin = "site" | PackageOrigin;

export interface CollectionIndex {
  readonly title: string;

  readonly description: string;
}

export interface PackageCollection {
  readonly origin: PackageOrigin;

  readonly dir: string;

  readonly packageName: string;

  readonly route: string;

  readonly section: string;

  readonly kind: string;

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

export const collectionAt = (slugs: ReadonlyArray<string>) => {
  const path = `${docsRoute}/${slugs.join("/")}`;
  const matches = packageCollections
    .filter(
      (collection) =>
        path === collection.route || path.startsWith(`${collection.route}/`),
    )

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
