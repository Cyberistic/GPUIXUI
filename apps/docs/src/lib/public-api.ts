export interface PackageManifest {
  readonly name: string;

  readonly description: string;
  readonly exports: Readonly<Record<string, unknown>>;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseManifest = (value: unknown): PackageManifest | undefined => {
  if (!isRecord(value)) return undefined;
  const { name, description, exports: map } = value;
  if (typeof name !== "string" || !isRecord(map)) return undefined;
  return {
    name,
    description: typeof description === "string" ? description : "",
    exports: map,
  };
};

const targetOf = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return undefined;
  const candidates = ["default", "import", "types"].map(
    (condition) => value[condition],
  );
  const target = candidates.find((candidate) => typeof candidate === "string");
  return typeof target === "string" ? target : undefined;
};

const isCode = (target: string): boolean =>
  /\.(ts|tsx|js|mjs|cjs)$/.test(target) && !target.endsWith(".d.ts");

export interface EntryPoint {
  readonly specifier: string;

  readonly subpath: string;

  readonly target: string;

  readonly pattern: boolean;

  readonly built: boolean;
}

export interface PackageApi {
  readonly name: string;
  readonly description: string;
  readonly entries: ReadonlyArray<EntryPoint>;
}

export const entryPoints = (
  manifest: PackageManifest,
): ReadonlyArray<EntryPoint> =>
  Object.entries(manifest.exports).flatMap(([subpath, value]) => {
    const target = targetOf(value);
    if (target === undefined || !isCode(target)) return [];
    return [
      {
        specifier: `${manifest.name}${subpath === "." ? "" : subpath.slice(1)}`,
        subpath,
        target,
        pattern: subpath.includes("*"),
        built: target.startsWith("./dist/"),
      },
    ];
  });

export const buildPublicApi = (
  manifests: ReadonlyArray<unknown>,
): ReadonlyArray<PackageApi> =>
  manifests
    .flatMap((value) => {
      const manifest = parseManifest(value);
      if (manifest === undefined) return [];
      const entries = entryPoints(manifest);
      return entries.length === 0
        ? []
        : [{ name: manifest.name, description: manifest.description, entries }];
    })
    .toSorted((left, right) => left.name.localeCompare(right.name));

export const notPublished: ReadonlyArray<{
  readonly name: string;
  readonly reason: string;
}> = [
  {
    name: "@gpuixui/config",
    reason:
      "Shared TypeScript, lint and format configuration. It is a tsconfig, not a module a component imports.",
  },
  {
    name: "@gpuixui/deploy",
    reason:
      "The Cloudflare Worker that publishes this docs site. It is deployed, never imported.",
  },
];
