/**
 * The public surface of the workspace, read from the package manifests.
 *
 * A package's `exports` map is the contract: an import it does not declare is
 * internal, whatever the file layout looks like. The reference page is built
 * from those maps rather than a hand-written list, so adding a subpath publishes
 * it here in the same commit and no page claims an entry point that does not
 * exist.
 */

/** The part of a package manifest the reference reads. */
export interface PackageManifest {
  readonly name: string;
  /** Empty when the package does not describe itself. */
  readonly description: string;
  readonly exports: Readonly<Record<string, unknown>>;
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A manifest, or `undefined` when the value is not one. */
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

/**
 * The file an export condition points at. A built package declares `import`
 * and `types` rather than the source `default`.
 */
const targetOf = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return undefined;
  const candidates = ["default", "import", "types"].map(
    (condition) => value[condition],
  );
  const target = candidates.find((candidate) => typeof candidate === "string");
  return typeof target === "string" ? target : undefined;
};

/** A module a consumer can import; a JSON config or a type stub is not one. */
const isCode = (target: string): boolean =>
  /\.(ts|tsx|js|mjs|cjs)$/.test(target) && !target.endsWith(".d.ts");

export interface EntryPoint {
  /** The import specifier, e.g. `@gpuixui/primitives/core`. */
  readonly specifier: string;
  /** The subpath key, e.g. `.` or `./core`. */
  readonly subpath: string;
  /** The source file, or the pattern a subpath expands to. */
  readonly target: string;
  /** `./*` publishes one entry per file rather than a single module. */
  readonly pattern: boolean;
  /** The target is a release build (`dist/`) rather than workspace source. */
  readonly built: boolean;
}

export interface PackageApi {
  readonly name: string;
  readonly description: string;
  readonly entries: ReadonlyArray<EntryPoint>;
}

/** The entry points one manifest publishes. */
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

/** Every package that publishes source, alphabetically. */
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

/** The workspace packages that are not imported by a consumer, and why. */
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
