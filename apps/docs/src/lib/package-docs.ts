import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import {
  collectionOwns,
  packageCollections,
  type PackageOrigin,
} from "./collection-routes";
import { servedPages } from "./curated-twins";
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
 * The loaders for the package-owned documentation.
 *
 * `defineDocs` is a macro: the directory and options must be string and boolean
 * literals, so each collection is written out here. Everything else — routes,
 * sidebar folders, note copy — comes from `collection-routes.ts`.
 */

const primitiveDocs = defineDocs({
  dir: "../../packages/primitives/docs",
  docs: {
    files: ["**/*.mdx"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

const iconDocs = defineDocs({
  dir: "../../packages/icons/docs",
  docs: {
    files: ["**/*.mdx"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

const componentDocs = defineDocs({
  dir: "../../packages/components/docs",
  docs: {
    files: ["**/*.mdx"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

const dataDocs = defineDocs({
  dir: "../../packages/data/docs",
  docs: {
    // The charts live in their own directory so the Graphics category can
    // mount them on their own route; the data lane mounts the rest.
    files: ["**/*.mdx", "!charts/**"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

const chartsDocs = defineDocs({
  dir: "../../packages/data/docs/charts",
  docs: {
    files: ["**/*.mdx"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

const editorDocs = defineDocs({
  dir: "../../packages/editor/docs",
  docs: {
    files: ["**/*.mdx"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

const filesDocs = defineDocs({
  dir: "../../packages/files/docs",
  docs: {
    files: ["**/*.mdx"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

const shellDocs = defineDocs({
  dir: "../../packages/shell/docs",
  docs: {
    files: ["**/*.mdx"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

const dockDocs = defineDocs({
  dir: "../../packages/dock/docs",
  docs: {
    files: ["**/*.mdx"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

const mediaDocs = defineDocs({
  dir: "../../packages/media/docs",
  docs: {
    files: ["**/*.mdx"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

const fxDocs = defineDocs({
  dir: "../../packages/fx/docs",
  docs: {
    files: ["**/*.mdx"],
    async: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

export const docsByOrigin = {
  primitives: primitiveDocs,
  icons: iconDocs,
  charts: chartsDocs,
  components: componentDocs,
  data: dataDocs,
  editor: editorDocs,
  files: filesDocs,
  shell: shellDocs,
  dock: dockDocs,
  media: mediaDocs,
  fx: fxDocs,
} satisfies Record<PackageOrigin, typeof primitiveDocs>;

const primitiveSource = loader({
  source: primitiveDocs.toFumadocsSource(),
  baseUrl: primitiveDocsRoute,
});

const iconSource = loader({
  source: iconDocs.toFumadocsSource(),
  baseUrl: iconDocsRoute,
});

const componentSource = loader({
  source: componentDocs.toFumadocsSource(),
  baseUrl: componentDocsRoute,
});

const dataSource = loader({
  source: dataDocs.toFumadocsSource(),
  baseUrl: dataDocsRoute,
});

const chartsSource = loader({
  source: chartsDocs.toFumadocsSource(),
  baseUrl: chartsDocsRoute,
});

const editorSource = loader({
  source: editorDocs.toFumadocsSource(),
  baseUrl: editorDocsRoute,
});

const filesSource = loader({
  source: filesDocs.toFumadocsSource(),
  baseUrl: filesDocsRoute,
});

const shellSource = loader({
  source: shellDocs.toFumadocsSource(),
  baseUrl: shellDocsRoute,
});

const dockSource = loader({
  source: dockDocs.toFumadocsSource(),
  baseUrl: dockDocsRoute,
});

const mediaSource = loader({
  source: mediaDocs.toFumadocsSource(),
  baseUrl: mediaDocsRoute,
});

const fxSource = loader({
  source: fxDocs.toFumadocsSource(),
  baseUrl: effectsDocsRoute,
});

export const sourceByOrigin = {
  primitives: primitiveSource,
  icons: iconSource,
  charts: chartsSource,
  components: componentSource,
  data: dataSource,
  editor: editorSource,
  files: filesSource,
  shell: shellSource,
  dock: dockSource,
  media: mediaSource,
  fx: fxSource,
} satisfies Record<PackageOrigin, typeof primitiveSource>;

/** Every mounted package source, in sidebar order. */
export const packageSources = packageCollections.map(
  (collection) => sourceByOrigin[collection.origin],
);

/**
 * The pages a sidebar section lists, ready for `completeSection`.
 *
 * A primitive page a curated page in another section replaces is not listed
 * twice (`curated-twins.ts`).
 *
 * A collection serves only the files **its own** directory holds. The charts
 * live in `packages/data/docs/charts`, inside the data package's own docs
 * directory, and the data collection's glob could not be made to leave them
 * out — so the data lane listed the charts page under `/data-display` as
 * well, at a URL that answered **404**. The owner is decided by the
 * directory, and the **longest** matching directory wins: the charts
 * directory is inside the data one, so the charts collection owns the file.
 */
export const sectionPages = (origins: ReadonlyArray<PackageOrigin>) =>
  origins.flatMap((origin) =>
    servedPages(sourceByOrigin[origin].getPages())
      .filter((page) => collectionOwns(origin, page.path))
      .map((page) => ({
        name: page.data.title,
        url: page.url,
      })),
  );
