import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildWorkspaceSymbolIndex, repoRoot } from "./public-symbols-source";

/**
 * The installation page is the first page a reader follows, so every command on
 * it has to exist: a pinned Node version that is not `.node-version`, a `nub add`
 * for a package the workspace does not ship, or a `nub run` for a script no
 * manifest declares all look correct and fail on the reader's machine.
 *
 * The page used to be trusted by eye; `getting-started` already resolves its
 * commands, and this does the same for the page before it.
 */

const read = (path: string): string =>
  readFileSync(join(repoRoot, path), "utf8");

interface Manifest {
  readonly name: string;
  readonly scripts?: Readonly<Record<string, string>>;
  /** The root manifest's pinned toolchain. */
  readonly devEngines?: {
    readonly packageManager?: { readonly name?: string };
  };
}

const manifest = (path: string): Manifest => JSON.parse(read(path)) as Manifest;

const page = read("apps/docs/content/docs/installation.mdx");
const root = manifest("package.json");

/** Every workspace package, by manifest name. */
const workspaceManifests: ReadonlyArray<Manifest> = readdirSync(
  join(repoRoot, "packages"),
).flatMap((entry) => {
  try {
    return [manifest(`packages/${entry}/package.json`)];
  } catch {
    return [];
  }
});

/** `nub add @gpuixui/<name>@workspace:*` targets. */
const added: ReadonlyArray<string> = [
  ...page.matchAll(/nub add (@gpuixui\/[a-z-]+)@workspace:\*/g),
].map((match) => match[1] ?? "");

interface Run {
  readonly filter: string | undefined;
  readonly script: string;
}

/** `nub run [--filter <package>] <script>` commands the page prints. */
const runs: ReadonlyArray<Run> = [
  ...page.matchAll(/nub run (?:(--filter (\S+) )?([\w:-]+))/g),
].map((match) => ({
  filter: match[2],
  script: match[3] ?? "",
}));

/** The page's fenced TypeScript snippets, in reading order. */
const snippets = [...page.matchAll(/```tsx\n([\s\S]*?)```/g)].map(
  (match) => match[1] ?? "",
);

/** The names each `@gpuixui/*` entry point publishes. */
const published = buildWorkspaceSymbolIndex(repoRoot)
  .packages.flatMap((pkg) => pkg.symbols)
  .flatMap((symbol) =>
    symbol.specifiers.map((specifier) => ({
      specifier,
      name: symbol.name,
    })),
  )
  .reduce((bySpecifier, { specifier, name }) => {
    const names = bySpecifier.get(specifier) ?? new Set<string>();
    names.add(name);
    bySpecifier.set(specifier, names);
    return bySpecifier;
  }, new Map<string, Set<string>>());

describe("the installation page", () => {
  it("pins the toolchain the repository pins", () => {
    const nodeVersion = read(".node-version").trim();
    const manager = root.devEngines?.packageManager;

    expect(nodeVersion.length).toBeGreaterThan(0);
    expect(page).toContain(nodeVersion);
    expect(manager).toBeDefined();
    expect(page).toContain(manager?.name ?? "");
  });

  it("adds only packages the workspace ships", () => {
    expect(added.length).toBeGreaterThanOrEqual(2);

    const shipped = new Set(workspaceManifests.map((entry) => entry.name));
    expect(added.filter((name) => !shipped.has(name))).toEqual([]);
  });

  it("runs only scripts the manifests declare", () => {
    // A silent zero would pass the filter below without reading anything.
    expect(runs.length).toBeGreaterThanOrEqual(4);

    const byPackage = new Map(
      workspaceManifests.map((entry) => [entry.name, entry]),
    );

    const missing = runs.flatMap(({ filter, script }) => {
      const owner = filter === undefined ? root : byPackage.get(filter);
      if (owner === undefined) return [`no workspace package named ${filter}`];
      return owner.scripts?.[script] === undefined
        ? [`${owner.name} has no ${script} script`]
        : [];
    });

    expect(missing).toEqual([]);
  });

  it("imports only names the packages publish", () => {
    const imports = snippets.flatMap((snippet) =>
      [
        ...snippet.matchAll(
          /import\s*\{([\s\S]*?)\}\s*from\s*"(@gpuixui\/[^"]+)"/g,
        ),
      ].map((match) => ({
        specifier: match[2] ?? "",
        names: (match[1] ?? "")
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name !== ""),
      })),
    );

    expect(imports.length).toBeGreaterThanOrEqual(2);
    const missing = imports.flatMap(({ names, specifier }) => {
      const available = published.get(specifier);
      if (available === undefined) {
        return [`${specifier} is not a published entry point`];
      }
      return names
        .filter((name) => !available.has(name))
        .map((name) => `${specifier} does not export ${name}`);
    });

    expect(missing).toEqual([]);
  });
});
