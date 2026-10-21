import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import type { PackageOrigin } from "./collection-routes";
import {
  componentDocsRoute,
  iconDocsRoute,
  primitiveDocsRoute,
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

export const docsByOrigin = {
  primitives: primitiveDocs,
  icons: iconDocs,
  components: componentDocs,
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

export const sourceByOrigin = {
  primitives: primitiveSource,
  icons: iconSource,
  components: componentSource,
} satisfies Record<PackageOrigin, typeof primitiveSource>;

/** Every mounted package source, in sidebar order. */
export const packageSources = [primitiveSource, iconSource, componentSource];

/** The pages a sidebar section lists, ready for `completeSection`. */
export const sectionPages = (origins: ReadonlyArray<PackageOrigin>) =>
  origins.flatMap((origin) =>
    sourceByOrigin[origin].getPages().map((page) => ({
      name: page.data.title,
      url: page.url,
    })),
  );
