/**
 * GPUIxUI's shadcn registry, as a model.
 *
 * A shadcn registry is an index (`registry.json`) and one JSON per item; the
 * index names the files an item installs, the item carries their content. The
 * site is the registry's host, so both are built from the same component pages
 * and sources the documentation renders — never a hand-kept copy of them.
 *
 * A component's source imports `@gpuixui/*`, whose packages are private to the
 * workspace, so an item alone would install files that resolve nowhere. Two
 * rules keep an install closed: every workspace import is rewritten to a
 * relative path inside the install root, and the files those imports need are
 * shipped by a runtime item — one per package — that a component item declares
 * in `registryDependencies`. The shadcn CLI installs that tree transitively.
 *
 * The caveat is part of the document, not a footnote: a shadcn project gets the
 * files, and the files render through GPUix's reconciler against `@gpuix/react`
 * rather than the DOM.
 */

import { absoluteUrl } from "./site";

/** The registry's name, as the index and every item address it. */
export const registryName = "gpuixui";

/** The directory every item installs into, under the project's `ui` alias. */
export const installRoot = "gpuixui";

/**
 * The one thing a copied file does not tell a reader.
 *
 * It is repeated in the index and in every item's `docs`, because the failure
 * mode is a plain React project that installs a component and finds the
 * renderer missing — not a broken download.
 */
export const registryCaveat =
  "These are GPUix native components: the files render through GPUix's reconciler against `@gpuix/react`, not the DOM, and need the per-platform `@gpuix/native` binding. The CLI installs the `@gpuixui/*` runtime the components import as registry items, so the copied tree resolves on its own; wrap it in `ThemeProvider` before it renders.";

/** The index's description: what the registry is, and what it is not. */
export const registryDescription = `Shadcn registry for GPUIxUI, the native UI component library for GPUix and React. Each item installs a component's source files. ${registryCaveat}`;

/** A file an item installs: its repo path, its target, and its own type. */
export interface RegistryItemFile {
  /** Repository-relative path, e.g. `packages/components/src/accordion.tsx`. */
  readonly path: string;
  /** Where the shadcn CLI writes it, e.g. `@ui/gpuixui/components/accordion.tsx`. */
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
  /**
   * What the item is: a documented page's component, or the runtime modules a
   * component imports. A runtime item installs source too, but solves no page's
   * example, so the index and the tests keep the two apart.
   */
  readonly kind: "component" | "runtime";
  /** The documented page this item comes from, e.g. `/docs/components/accordion`. */
  readonly url: string;
  readonly title: string;
  readonly description: string;
  readonly type: "registry:component" | "registry:lib";
  /**
   * The runtime items this item's files import, as absolute addresses.
   *
   * A component item ships its own package's files; the packages it borrows
   * from are installed by their own runtime item, so the CLI fetches and writes
   * that tree once instead of copying it into every component.
   */
  readonly registryDependencies: ReadonlyArray<string>;
  readonly files: ReadonlyArray<RegistryItemFile>;
}

/** The package a repository module belongs to, e.g. `primitives`. */
export const packageOfModule = (module: string): string | undefined =>
  /^packages\/([^/]+)\/src\//.exec(module)?.[1];

/** Where a repository module installs, under the project's `ui` alias. */
export const installTarget = (module: string): string => {
  const packageName = packageOfModule(module);
  if (packageName === undefined)
    throw new Error(`registry: ${module} is not a package source`);
  return `@ui/${installRoot}/${packageName}/${module.slice(`packages/${packageName}/src/`.length)}`;
};

/** The runtime item that installs a package's files, e.g. `gpuix-primitives`. */
export const runtimeItemName = (packageName: string): string =>
  `gpuix-${packageName}`;

/** The address a component item names that runtime item by. */
export const runtimeItemAddress = (packageName: string): string =>
  absoluteUrl(`/${runtimeItemName(packageName)}.json`);

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
 * The relative specifier from one install target to another.
 *
 * Both targets live under the same install root, so the path is the number of
 * directories to climb and then the target's tail. TypeScript resolves a `.js`
 * specifier to the `.ts`/`.tsx` file beside it, which is the convention every
 * package source already uses.
 */
export const relativeTarget = (from: string, to: string): string => {
  const root = `@ui/${installRoot}/`;
  const fromParts = from.slice(root.length).split("/");
  const toParts = to.slice(root.length).split("/");
  let shared = 0;
  while (shared < fromParts.length - 1 && fromParts[shared] === toParts[shared])
    shared++;
  const tail = [
    ...Array<string>(fromParts.length - 1 - shared).fill(".."),
    ...toParts.slice(shared),
  ].join("/");
  return `${tail.startsWith(".") ? tail : `./${tail}`}`.replace(
    /\.tsx?$/,
    ".js",
  );
};

/**
 * Every workspace import in a source, rewritten to its installed target.
 *
 * Only import and export statements are touched — a doc comment that names a
 * package is prose — and only `@gpuixui/*` specifiers are rewritten: a relative
 * import already points at a file the item installs beside it, and an npm
 * package is a `dependencies` entry.
 */
export const rewriteWorkspaceImports = (
  source: string,
  fromTarget: string,
  targetOf: (specifier: string) => string | undefined,
): string =>
  source.replace(
    /^([ \t]*(?:import|export)\b[^;]*?\bfrom\s+|[ \t]*import\s+)(["'])([^"']+)\2/gm,
    (statement, lead: string, quote: string, specifier: string) => {
      const target = specifier.startsWith("@gpuixui/")
        ? targetOf(specifier)
        : undefined;
      return target === undefined
        ? statement
        : `${lead}${quote}${relativeTarget(fromTarget, target)}${quote}`;
    },
  );

/**
 * The npm dependencies a set of files imports, at the versions the workspace
 * pins.
 *
 * Bare specifiers are kept at their package (`effect/Array` → `effect`,
 * `@gpuix/react/floating` → `@gpuix/react`); relative imports are files the item
 * already installs. An installed item carries no `@gpuixui/*` specifier — the
 * rewrite makes them relative — so a workspace name here is a generator bug the
 * tests catch.
 *
 * The version is part of the entry because the CLI installs a bare name at
 * `latest`: `@tanstack/hotkeys` 0.22 changed the signature this source calls,
 * and an install that resolved it was a successful copy of code that no longer
 * compiled. A name the workspace does not pin stays bare.
 */
export const dependenciesOf = (
  files: ReadonlyArray<RegistryItemFile>,
  versions: Readonly<Record<string, string>>,
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
    .toSorted()
    .map((name) => {
      const version = versions[name];
      return version === undefined ? name : `${name}@${version}`;
    });
};

/** The author a registry item reports. */
export const registryAuthor = {
  name: "Cyberistic",
  url: "https://github.com/Cyberistic",
} as const;

/** The item's JSON, with each file's content. */
export const itemJson = (
  item: RegistryItem,
  versions: Readonly<Record<string, string>>,
): string =>
  JSON.stringify(
    {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      author: `${registryAuthor.name} <${registryAuthor.url}>`,
      dependencies: dependenciesOf(item.files, versions),
      ...(item.registryDependencies.length === 0
        ? {}
        : { registryDependencies: item.registryDependencies }),
      files: item.files.map((file) => ({
        path: file.path,
        target: file.target,
        type: file.type,
        content: file.content,
      })),
      docs: `[${item.title}](${absoluteUrl(item.url)}) — ${registryCaveat}`,
      meta: {
        url: item.url,
        kind: item.kind,
        runtime: "gpuix",
        registry: registryName,
      },
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
        ...(item.registryDependencies.length === 0
          ? {}
          : { registryDependencies: item.registryDependencies }),
        files: item.files.map((file) => ({
          path: file.path,
          target: file.target,
          type: file.type,
        })),
        meta: {
          url: item.url,
          kind: item.kind,
          runtime: "gpuix",
          registry: registryName,
        },
      })),
    },
    null,
    2,
  );

/** The content type every registry document is served with. */
export const registryContentType = "application/json; charset=utf-8";
