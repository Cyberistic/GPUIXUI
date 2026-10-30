/**
 * GPUIxUI's shadcn registry, as a model.
 *
 * A shadcn registry is an index (`registry.json`) and one JSON per item; the
 * index names the files an item installs, the item carries their content. The
 * site is the registry's host, so both are built from the same component pages
 * and sources the documentation renders — never a hand-kept copy of them.
 *
 * The caveat is part of the document, not a footnote: a shadcn project gets the
 * files, and the files render through GPUix's reconciler against `@gpuix/react`
 * rather than the DOM. `@gpuix/native` (the per-platform binding) and the
 * `@gpuixui/*` sibling packages are what a consumer adds before they run.
 */

import { absoluteUrl } from "./site";

/** The registry's name, as the index and every item address it. */
export const registryName = "gpuixui";

/**
 * The one thing a copied file does not tell a reader.
 *
 * It is repeated in the index and in every item's `docs`, because the failure
 * mode is a plain React app that installs a component and finds the renderer
 * missing — not a broken download.
 */
export const registryCaveat =
  "These are GPUix native components: the files render through GPUix's reconciler against `@gpuix/react`, not the DOM, and need the per-platform `@gpuix/native` binding. The `@gpuixui/*` sibling packages are workspace-only today, so add them from the repository before the copied files run.";

/** The index's description: what the registry is, and what it is not. */
export const registryDescription = `Shadcn registry for GPUIxUI, the native UI component library for GPUix and React. Each item installs a component's source files. ${registryCaveat}`;

/** A file an item installs: its repo path, its target, and its own type. */
export interface RegistryItemFile {
  /** Repository-relative path, e.g. `packages/components/src/accordion.tsx`. */
  readonly path: string;
  /** Where the shadcn CLI writes it, e.g. `@ui/accordion.tsx`. */
  readonly target: string;
  /** A component source is `registry:component`; its logic is `registry:lib`. */
  readonly type: "registry:component" | "registry:lib";
  /** The file's text. The index omits it; the item's own JSON carries it. */
  readonly content: string;
}

/** One registry item, before it is serialised. */
export interface RegistryItem {
  /** Unique in the flat registry: `<package>-<page>`, e.g. `components-accordion`. */
  readonly name: string;
  /** The documented page this item comes from, e.g. `/docs/components/accordion`. */
  readonly url: string;
  readonly title: string;
  readonly description: string;
  readonly type: "registry:component";
  readonly files: ReadonlyArray<RegistryItemFile>;
}

/**
 * The item name.
 *
 * The registry is flat, and eight names are used by two pages in different
 * sections (`progress`, `separator`, `skeleton`, `slider`, `spinner`, `toggle`,
 * `toggle-group`, `property-panel`), so the package is part of the address:
 * `primitives-progress` and `components-progress` are different components.
 * Deriving it from the package, not from a collision list, keeps every address
 * stable when the library grows.
 */
export const itemName = (packageName: string, page: string): string =>
  `${packageName}-${page}`;

/**
 * The module specifiers a source imports, in reading order.
 *
 * Import statements are line-anchored and read up to their own `;`, so a
 * sentence in a doc comment that happens to carry "import … from" is not a
 * dependency, and a multi-line import is still one.
 */
export const importsOf = (source: string): ReadonlyArray<string> =>
  [
    /^[ \t]*(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/gm,
    /^[ \t]*import\s+["']([^"']+)["']/gm,
  ].flatMap((pattern) =>
    [...source.matchAll(pattern)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
  );

/**
 * The npm dependencies a set of files imports.
 *
 * Bare specifiers are kept at their package (`effect/Array` → `effect`,
 * `@gpuix/react/floating` → `@gpuix/react`); relative imports are files the
 * item already installs, and `@gpuixui/*` is the workspace, named in the
 * caveat instead of in a manifest an installer would try to fetch.
 */
export const dependenciesOf = (
  files: ReadonlyArray<RegistryItemFile>,
): ReadonlyArray<string> => {
  const packages = files
    .flatMap((file) => importsOf(file.content))
    .flatMap((specifier) => {
      if (specifier.startsWith(".") || specifier.startsWith("@gpuixui/"))
        return [];
      if (specifier.startsWith("node:")) return [];
      const parts = specifier.split("/");
      return [
        specifier.startsWith("@")
          ? parts.slice(0, 2).join("/")
          : (parts[0] ?? ""),
      ];
    });

  return [...new Set([...packages, "@gpuix/native", "@gpuix/react"])]
    .filter((name) => name !== "")
    .toSorted();
};

/** The author a registry item reports. */
export const registryAuthor = {
  name: "Cyberistic",
  url: "https://github.com/Cyberistic",
} as const;

/** The item's JSON, with each file's content. */
export const itemJson = (item: RegistryItem): string =>
  JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      author: `${registryAuthor.name} <${registryAuthor.url}>`,
      dependencies: dependenciesOf(item.files),
      files: item.files.map((file) => ({
        path: file.path,
        target: file.target,
        type: file.type,
        content: file.content,
      })),
      docs: `[${item.title}](${absoluteUrl(item.url)}) — ${registryCaveat}`,
      meta: { url: item.url, runtime: "gpuix", registry: registryName },
    },
    null,
    2,
  );

/** The index's JSON: every item, with its file list and no content. */
export const indexJson = (items: ReadonlyArray<RegistryItem>): string =>
  JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema/registry.json",
      name: registryName,
      homepage: absoluteUrl("/"),
      description: registryDescription,
      items: items.map((item) => ({
        name: item.name,
        type: item.type,
        title: item.title,
        description: item.description,
        author: `${registryAuthor.name} <${registryAuthor.url}>`,
        files: item.files.map((file) => ({
          path: file.path,
          target: file.target,
          type: file.type,
        })),
        meta: { url: item.url, runtime: "gpuix", registry: registryName },
      })),
    },
    null,
    2,
  );

/** The content type every registry document is served with. */
export const registryContentType = "application/json; charset=utf-8";
