import { absoluteUrl } from "./site";

export const registryName = "gpuixui";

export const installRoot = "gpuixui";

export const registryCaveat =
  "These are GPUix native components: the files render through GPUix's reconciler against `@gpuix/react`, not the DOM, and need the per-platform `@gpuix/native` binding. The CLI installs the `@gpuixui/*` runtime the components import as registry items, so the copied tree resolves on its own; wrap it in `ThemeProvider` before it renders.";

export const registryDescription = `Shadcn registry for GPUIxUI, the native UI component library for GPUix and React. Each item installs a component's source files. ${registryCaveat}`;

export interface RegistryItemFile {
  readonly path: string;

  readonly target: string;

  readonly type: "registry:component" | "registry:lib";

  readonly content: string;
}

export interface RegistryItem {
  readonly name: string;

  readonly kind: "component" | "runtime";

  readonly url: string;
  readonly title: string;
  readonly description: string;
  readonly type: "registry:component" | "registry:lib";

  readonly registryDependencies: ReadonlyArray<string>;
  readonly files: ReadonlyArray<RegistryItemFile>;
}

export const packageOfModule = (module: string): string | undefined =>
  /^packages\/([^/]+)\/src\//.exec(module)?.[1];

export const installTarget = (module: string): string => {
  const packageName = packageOfModule(module);
  if (packageName === undefined)
    throw new Error(`registry: ${module} is not a package source`);
  return `@ui/${installRoot}/${packageName}/${module.slice(`packages/${packageName}/src/`.length)}`;
};

export const runtimeItemName = (packageName: string): string =>
  `gpuix-${packageName}`;

export const runtimeItemAddress = (packageName: string): string =>
  absoluteUrl(`/${runtimeItemName(packageName)}.json`);

export const itemName = (packageName: string, page: string): string =>
  `${packageName}-${page}`;

export const importsOf = (source: string): ReadonlyArray<string> =>
  [
    /^[ \t]*(?:import|export)\b[^;]*?\bfrom\s+["']([^"']+)["']/gm,
    /^[ \t]*import\s+["']([^"']+)["']/gm,
  ].flatMap((pattern) =>
    [...source.matchAll(pattern)].flatMap((match) =>
      match[1] === undefined ? [] : [match[1]],
    ),
  );

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

export const registryAuthor = {
  name: "Cyberistic",
  url: "https://github.com/Cyberistic",
} as const;

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

export const registryContentType = "application/json; charset=utf-8";
