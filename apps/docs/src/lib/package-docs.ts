import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import type { PackageOrigin } from "./collection-routes";
import {
  componentDocsRoute,
  dataDocsRoute,
  dockDocsRoute,
  editorDocsRoute,
  filesDocsRoute,
  iconDocsRoute,
  mediaDocsRoute,
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

export const docsByOrigin = {
  primitives: primitiveDocs,
  icons: iconDocs,
  components: componentDocs,
  data: dataDocs,
  editor: editorDocs,
  files: filesDocs,
  shell: shellDocs,
  dock: dockDocs,
  media: mediaDocs,
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

export const sourceByOrigin = {
  primitives: primitiveSource,
  icons: iconSource,
  components: componentSource,
  data: dataSource,
  editor: editorSource,
  files: filesSource,
  shell: shellSource,
  dock: dockSource,
  media: mediaSource,
} satisfies Record<PackageOrigin, typeof primitiveSource>;

/** Every mounted package source, in sidebar order. */
export const packageSources = [
  primitiveSource,
  iconSource,
  componentSource,
  dataSource,
  editorSource,
  filesSource,
  shellSource,
  dockSource,
  mediaSource,
];

/** The pages a sidebar section lists, ready for `completeSection`. */
export const sectionPages = (origins: ReadonlyArray<PackageOrigin>) =>
  origins.flatMap((origin) =>
    sourceByOrigin[origin].getPages().map((page) => ({
      name: page.data.title,
      url: page.url,
    })),
  );
