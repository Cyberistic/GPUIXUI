/**
 * The workspace package graph.
 *
 * The architecture page's package table is the map a contributor reads before
 * adding a dependency, so it is generated from the manifests rather than kept
 * by hand: the hand-written column drifted the first time a package gained a
 * dependency (`@gpuixui/editor` → `@gpuixui/dock`), while the page still taught
 * the old edges.
 *
 * Two things a manifest cannot say are curated here: the table's reading order
 * (the layers a component is built from, then the packages that stand alone —
 * not alphabetical) and each package's responsibility sentence. A package missing from either is reported rather than dropped — the
 * table still prints the manifest's own description and appends the package at
 * the end, so a new package is visible before its row is written.
 */

/** One package, as its manifest declares it. */
export interface PackageManifest {
  /** The published name, e.g. `@gpuixui/tokens`. */
  readonly name: string;
  /** The manifest's own description, or `""`. */
  readonly description: string;
  /** The workspace packages it declares in `dependencies`, sorted. */
  readonly dependencies: ReadonlyArray<string>;
}

/** One row of the architecture page's table. */
export interface PackageRow {
  readonly name: string;
  readonly responsibility: string;
  readonly dependencies: ReadonlyArray<string>;
}

/** The table, plus the two lists that say what has not been curated yet. */
export interface PackageGraph {
  readonly packages: ReadonlyArray<PackageRow>;
  /** Packages whose responsibility came from the manifest, not this file. */
  readonly uncatalogued: ReadonlyArray<string>;
  /** Packages the curated order does not place; they print last. */
  readonly unordered: ReadonlyArray<string>;
}

/**
 * The table's reading order.
 *
 * The layers a component is built from come first, then the packages that
 * stand alone; the order is what makes the page a map rather than an
 * alphabetical directory. A package is placed here once.
 */
export const packageOrder: ReadonlyArray<string> = [
  "@gpuixui/tokens",
  "@gpuixui/tw",
  "@gpuixui/icons",
  "@gpuixui/primitives",
  "@gpuixui/components",
  "@gpuixui/data",
  "@gpuixui/dock",
  "@gpuixui/editor",
  "@gpuixui/files",
  "@gpuixui/shell",
  "@gpuixui/media",
  "@gpuixui/keyboard",
  "@gpuixui/motion",
  "@gpuixui/runtime",
  "@gpuixui/testing",
  "@gpuixui/config",
  "@gpuixui/deploy",
];

/** The sentence each package's row prints, curated from the layer it belongs to. */
export const packageResponsibilities: Readonly<Record<string, string>> = {
  "@gpuixui/tokens":
    "Semantic colour roles, type, spacing, radii, density and elevation; light, dark, high contrast and platform styles.",
  "@gpuixui/tw":
    "The Tailwind-subset recipe registry: compiles class strings to a GPUix StyleDesc.",
  "@gpuixui/icons": "Icon markup, its size scale and the accessibility rules.",
  "@gpuixui/primitives":
    "Tier 1: layout, type, actions, inputs, selection and indicators.",
  "@gpuixui/components":
    "Tier 2: cards, overlays, menus, tabs, pickers and feedback.",
  "@gpuixui/data":
    "Tier 3: the table core, sorting, selection, filtering, virtualisation and charts.",
  "@gpuixui/editor":
    "Tier 4 code surfaces: a highlighted editor, a diff viewer and find-and-replace.",
  "@gpuixui/files":
    "Tier 4 file surfaces: a file tree, a log viewer and a property panel.",
  "@gpuixui/shell":
    "Tier 4 application chrome: menu bars, status bars and toolbars.",
  "@gpuixui/dock":
    "Tier 4 panel workspace: split panes, panel groups and docking layouts.",
  "@gpuixui/media":
    "Tier 5 media surfaces: image preview, upload queue and drop zone.",
  "@gpuixui/keyboard":
    "Accelerator grammar, scoped keymaps, event matching and the command registry.",
  "@gpuixui/motion": "Renderer-neutral springs, easing, timelines and inertia.",
  "@gpuixui/runtime":
    "The pinned GPUix capability matrix and its typed refusals.",
  "@gpuixui/testing":
    "Shared harnesses: render helpers, state replay and smoke utilities.",
  "@gpuixui/config": "Shared TypeScript, lint and format configuration.",
  "@gpuixui/deploy": "The Cloudflare Worker that publishes this docs site.",
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A manifest's `dependencies` as the `@gpuixui/*` names a page may print. */
export const workspaceDependencies = (
  dependencies: unknown,
): ReadonlyArray<string> => {
  if (!isRecord(dependencies)) return [];
  return Object.keys(dependencies)
    .filter((name) => name.startsWith("@gpuixui/"))
    .toSorted();
};

/**
 * Read one manifest, or nothing when it is not a package manifest.
 *
 * A directory under `packages/` without a name is not a package this table can
 * describe, so it is skipped rather than printed with an empty cell.
 */
export const parsePackageManifest = (
  value: unknown,
): PackageManifest | undefined => {
  if (!isRecord(value)) return undefined;
  const { name, description, dependencies } = value;
  if (typeof name !== "string") return undefined;

  return {
    name,
    description: typeof description === "string" ? description : "",
    dependencies: workspaceDependencies(dependencies),
  };
};

/** The table, in reading order, with uncurated packages visible and reported. */
export const buildPackageGraph = (
  manifests: ReadonlyArray<PackageManifest>,
): PackageGraph => {
  const byName = new Map(
    manifests.map((manifest) => [manifest.name, manifest]),
  );
  const ordered = packageOrder.flatMap((name) => {
    const manifest = byName.get(name);
    return manifest === undefined ? [] : [manifest];
  });
  const rest = manifests
    .filter((manifest) => !packageOrder.includes(manifest.name))
    .toSorted((left, right) => left.name.localeCompare(right.name));

  const uncatalogued = manifests
    .filter((manifest) => packageResponsibilities[manifest.name] === undefined)
    .map((manifest) => manifest.name);

  return {
    packages: [...ordered, ...rest].map((manifest) => ({
      name: manifest.name,
      responsibility:
        packageResponsibilities[manifest.name] ??
        (manifest.description === ""
          ? "Not described yet."
          : manifest.description),
      dependencies: manifest.dependencies,
    })),
    uncatalogued,
    unordered: rest.map((manifest) => manifest.name),
  };
};
