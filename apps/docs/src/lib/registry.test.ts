import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, posix } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { collectionPages } from "./collection-pages";
import { packageCollections } from "./collection-routes";
import { curatedTwinOf } from "./curated-twins";
import { importsOf } from "./registry";
import { readRegistry } from "./registry-source";
import { siteOrigin } from "./site";

/**
 * The shadcn registry, held to the install it promises.
 *
 * Bug guarded: every component source imports `@gpuixui/*`, and those packages
 * are private to the workspace. An item that copies the source alone still
 * produces valid JSON, passes a schema check and installs a tree that resolves
 * nowhere — `shadcn add` reports success and the consumer gets a build error.
 * So this test rebuilds the install the CLI would write for each item (the item
 * plus the runtime items it declares) and demands that every import in it
 * resolves inside that tree or to a declared npm dependency. It also holds the
 * targets apart across packages, because the flat registry documents two
 * components named `progress` in different packages.
 */

const root = fileURLToPath(new URL("../../../../", import.meta.url));

interface Page {
  readonly url: string;
  readonly file: string;
}

/** The component pages this site writes, minus a pattern page with no library source. */
const sitePages = (): ReadonlyArray<Page> =>
  readdirSync(join(root, "apps/docs/content/docs/components"))
    .filter((name) => name.endsWith(".mdx") && name !== "index.mdx")
    .flatMap((name) => {
      const file = `apps/docs/content/docs/components/${name}`;
      const source = readFileSync(join(root, file), "utf8");
      const module = /<ComponentSource\b[^>]*\bfile="([^"]+)"/.exec(
        source,
      )?.[1];
      return module?.startsWith("packages/") === true
        ? [{ url: `/components/${basename(name, ".mdx")}`, file }]
        : [];
    });

/** The package pages the site serves, after a curated page's shadow and redirects. */
const packagePages = (): ReadonlyArray<Page> =>
  packageCollections
    .filter((collection) => collection.origin !== "icons")
    .flatMap((collection) =>
      collectionPages(root, collection)
        .filter((name) => name !== "index.mdx")
        .map((name) => ({
          url: `${collection.route}/${name.replace(/\.mdx$/, "")}`,
          file: `${collection.dir}/${name}`,
        })),
    );

/** Every page the site serves, in the precedence the site uses. */
const servedPages = (): ReadonlyArray<Page> => {
  const site = sitePages();
  const urls = new Set(site.map((page) => page.url));
  return [
    ...site,
    ...packagePages().filter(
      (page) => !urls.has(page.url) && curatedTwinOf(page.url) === undefined,
    ),
  ];
};

const COMPONENT_LANES = [
  "/components",
  "/primitives",
  "/graphics",
  "/data-display",
  "/editor",
  "/files",
  "/shell",
  "/dock",
  "/media",
  "/effects",
] as const;

/** The served pages a registry item can describe: a guide documents no module. */
const installablePages = (): ReadonlyArray<Page> =>
  servedPages().filter((page) =>
    COMPONENT_LANES.some(
      (lane) => page.url === lane || page.url.startsWith(`${lane}/`),
    ),
  );

interface ItemFile {
  readonly path: string;
  readonly target: string;
  readonly type: string;
  readonly content: string;
}

interface Item {
  readonly name: string;
  readonly type: string;
  readonly title: string;
  readonly description: string;
  readonly author: string;
  readonly dependencies: ReadonlyArray<string>;
  readonly registryDependencies: ReadonlyArray<string>;
  readonly files: ReadonlyArray<ItemFile>;
  readonly meta: {
    readonly url: string;
    readonly kind: "component" | "runtime";
  };
}

const registry = readRegistry(root);
/** An item as served, before the optional fields are normalised. */
type ServedItem = Omit<Item, "registryDependencies"> & {
  readonly registryDependencies?: ReadonlyArray<string>;
  readonly files: ReadonlyArray<ItemFile>;
};

const normalise = (item: ServedItem): Item => ({
  ...item,
  registryDependencies: item.registryDependencies ?? [],
});

const index = JSON.parse(registry.index) as {
  name: string;
  homepage: string;
  items: ReadonlyArray<
    Omit<ServedItem, "files"> & {
      files: ReadonlyArray<Omit<ItemFile, "content">>;
    }
  >;
};
const items = registry.items.map((item) =>
  normalise(JSON.parse(item.json) as ServedItem),
);
const components = items.filter((item) => item.meta.kind === "component");
const runtime = items.filter((item) => item.meta.kind === "runtime");

/** The item a registry dependency address names, e.g. `.../gpuix-tokens.json`. */
const dependencyName = (address: string): string =>
  basename(new URL(address).pathname, ".json");

/** An item and everything its `registryDependencies` install, transitively. */
const installedTree = (item: Item): ReadonlyArray<Item> => {
  const byName = new Map(items.map((entry) => [entry.name, entry]));
  const seen = new Set<string>();
  const walk = (entry: Item): ReadonlyArray<Item> => {
    if (seen.has(entry.name)) return [];
    seen.add(entry.name);
    return [
      entry,
      ...entry.registryDependencies.flatMap((address) => {
        const dependency = byName.get(dependencyName(address));
        return dependency === undefined ? [] : walk(dependency);
      }),
    ];
  };
  return walk(item);
};

/** The package an npm record names, without the version the registry pins. */
const packageOfDependency = (dependency: string): string => {
  const at = dependency.lastIndexOf("@");
  return at > 0 ? dependency.slice(0, at) : dependency;
};

/** The bare package a specifier imports, the way `dependenciesOf` reads it. */
const packageOfSpecifier = (specifier: string): string => {
  const parts = specifier.split("/");
  return specifier.startsWith("@")
    ? parts.slice(0, 2).join("/")
    : (parts[0] ?? "");
};

/** Every file a relative specifier could name, as an installed target. */
const candidates = (from: string, specifier: string): ReadonlyArray<string> => {
  const base = posix
    .normalize(posix.join(posix.dirname(from), specifier))
    .replace(/\.js$/, "");
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
};

/** A source with every import specifier blanked, to compare content alone. */
const withoutSpecifiers = (source: string): string =>
  source
    .replace(
      /^([ \t]*(?:import|export)\b[^;]*?\bfrom\s+)(["'])[^"']+\2/gm,
      '$1"x"',
    )
    .replace(/^([ \t]*import\s+)(["'])[^"']+\2/gm, '$1"x"');

describe("the shadcn registry", () => {
  it("names only pages the site still serves", () => {
    // The generator predates the guide consolidation, so it can still carry a
    // page the site no longer has. Printing the difference is the point: a count
    // says "seven", this says which seven.
    const served = new Set(installablePages().map((page) => page.url));
    expect(
      components.map((item) => item.meta.url).filter((url) => !served.has(url)),
    ).toEqual([]);
  });

  it("names every component page the site serves, once", () => {
    expect(registry.unresolved).toEqual([]);
    expect(components.length).toBeGreaterThan(100);
    expect(components.map((item) => item.meta.url).toSorted()).toEqual(
      installablePages()
        .map((page) => page.url)
        .toSorted(),
    );
    expect(new Set(index.items.map((item) => item.name)).size).toBe(
      items.length,
    );
  });

  it("ships the repository's source, with only workspace specifiers rewritten", () => {
    // A walk that reads the wrong file, or truncates one, still emits valid
    // JSON. Blanking the specifiers is what lets this compare content: the
    // rewrite is the only difference the generator is allowed to make.
    const broken = items.flatMap((item) =>
      item.files.flatMap((file) => {
        const source = readFileSync(join(root, file.path), "utf8");
        return withoutSpecifiers(source) === withoutSpecifiers(file.content)
          ? []
          : [`${item.name}: ${file.path}`];
      }),
    );

    expect(broken).toEqual([]);
    expect(items.flatMap((item) => item.files).length).toBeGreaterThan(
      items.length,
    );
  });

  it("installs only package sources, under one root", () => {
    // A package export can point outside `src` (`@gpuixui/data/examples`), and
    // a target derived from that path would install into a folder with no
    // package. This names the file instead of emitting a malformed address.
    const malformed = items.flatMap((item) =>
      item.files.flatMap((file) => {
        const packageName = file.path.split("/")[1] ?? "";
        const relative = file.path.slice(`packages/${packageName}/src/`.length);
        const expected = `@ui/gpuixui/${packageName}/${relative}`;
        return /^packages\/[^/]+\/src\/.+\.tsx?$/.test(file.path) &&
          file.target === expected
          ? []
          : [`${item.name}: ${file.path} → ${file.target}`];
      }),
    );

    expect(malformed).toEqual([]);
  });

  it(
    "resolves every import inside the tree the CLI installs",
    { timeout: 30_000 },
    () => {
      // The bug this file exists for: `@gpuixui/*` is private, so an item that
      // ships its source without the runtime is a successful install of a tree
      // that cannot build. This walks each item's install exactly as the CLI
      // would resolve it — the item plus its runtime dependencies — and demands
      // that every specifier lands on a file in that tree or a declared package.
      const broken = components.flatMap((component) => {
        const tree = installedTree(component);
        const targets = new Set(
          tree.flatMap((entry) => entry.files.map((file) => file.target)),
        );
        return tree.flatMap((entry) =>
          entry.files.flatMap((file) =>
            importsOf(file.content).flatMap((specifier) => {
              if (specifier.startsWith("@gpuixui/"))
                return [`${entry.name} imports ${specifier} (private package)`];
              if (specifier.startsWith("."))
                return candidates(file.target, specifier).some((candidate) =>
                  targets.has(candidate),
                )
                  ? []
                  : [`${entry.name}: ${file.target} imports ${specifier}`];
              if (specifier.startsWith("node:")) return [];
              const dependency = packageOfSpecifier(specifier);
              return entry.dependencies
                .map(packageOfDependency)
                .includes(dependency)
                ? []
                : [`${entry.name} imports ${specifier}, undeclared`];
            }),
          ),
        );
      });

      expect(broken).toEqual([]);
    },
  );

  it("installs each target once per tree, and never two sources on one target", () => {
    expect(
      components.flatMap((component) => {
        const targets = installedTree(component).flatMap((entry) =>
          entry.files.map((file) => file.target),
        );
        return targets.length === new Set(targets).size ? [] : [component.name];
      }),
    ).toEqual([]);

    // A component page and the runtime for its own package both ship a file the
    // other needs, so the same target can appear in two items; the shadcn CLI
    // writes it once. What must never happen is two *sources* on one target:
    // `primitives-progress` and `components-progress` are distinct components,
    // and a target without its package would make the second install overwrite
    // the first.
    const shipped = new Map<string, { name: string; content: string }>();
    const conflicts = items.flatMap((item) =>
      item.files.flatMap((file) => {
        const seen = shipped.get(file.target);
        shipped.set(file.target, { name: item.name, content: file.content });
        return seen === undefined || seen.content === file.content
          ? []
          : [`${file.target}: ${seen.name} and ${item.name}`];
      }),
    );
    expect(conflicts).toEqual([]);
  });

  it("declares a runtime item for every package a component borrows", () => {
    // The install test proves the files arrive; this proves they arrive as
    // their own item rather than copied into every component.
    const names = new Set(runtime.map((item) => item.name));
    expect(runtime.length).toBeGreaterThan(1);
    expect(
      components.flatMap((component) =>
        component.registryDependencies
          .map(dependencyName)
          .filter((name) => !names.has(name))
          .map((name) => `${component.name} → ${name}`),
      ),
    ).toEqual([]);
    expect(
      components.filter(
        (component) => component.registryDependencies.length === 0,
      ),
    ).toEqual([]);
  });

  it("ships the part files a component imports, not just its entry module", () => {
    // A closure read from the wrong directory still emits the entry module and
    // valid JSON; the install then fails on the first relative import.
    const shipped = (name: string, target: string): boolean =>
      items
        .find((item) => item.name === name)
        ?.files.some((file) => file.target === target) ?? false;

    expect(
      shipped(
        "components-accordion",
        "@ui/gpuixui/components/accordion/logic.ts",
      ),
    ).toBe(true);
    expect(
      shipped("gpuix-primitives", "@ui/gpuixui/primitives/core/theme.ts"),
    ).toBe(true);
    expect(shipped("gpuix-tokens", "@ui/gpuixui/tokens/index.ts")).toBe(true);
  });

  it("declares dependencies the workspace's manifests declare, at their pins", () => {
    // The scan reads source text; a doc comment that said "import … from"
    // once became a dependency named `stay`. Every declared name must be a
    // package the workspace already pins — and the version is part of the entry,
    // because the CLI installs a bare name at `latest`: `@tanstack/hotkeys`
    // 0.22 changed the signature the keyboard source calls, and an unpinned
    // install was a successful copy of code that no longer compiled.
    const rootManifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8"),
    ) as {
      workspaces: { catalog: Readonly<Record<string, string>> };
    };
    const manifests = readdirSync(join(root, "packages"), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const path = join(root, "packages", entry.name, "package.json");
        return existsSync(path)
          ? [
              JSON.parse(readFileSync(path, "utf8")) as {
                dependencies?: Readonly<Record<string, string>>;
                devDependencies?: Readonly<Record<string, string>>;
              },
            ]
          : [];
      });
    const known = new Set([
      ...Object.keys(rootManifest.workspaces.catalog),
      ...manifests.flatMap((manifest) => [
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.devDependencies ?? {}),
      ]),
    ]);

    expect(
      items.flatMap((item) =>
        item.dependencies
          .filter((dependency) => !known.has(packageOfDependency(dependency)))
          .map((dependency) => `${item.name}: ${dependency}`),
      ),
    ).toEqual([]);

    const button = items.find((item) => item.name === "primitives-button");
    expect(button?.dependencies).toContain(
      `effect@${rootManifest.workspaces.catalog.effect}`,
    );
    expect(button?.dependencies).toContain(
      `@gpuix/react@${rootManifest.workspaces.catalog["@gpuix/react"]}`,
    );
    expect(
      items.flatMap((item) =>
        item.dependencies.filter(
          (dependency) =>
            packageOfDependency(dependency) !== dependency &&
            dependency.slice(packageOfDependency(dependency).length + 1) ===
              "latest",
        ),
      ),
    ).toEqual([]);
  });

  it("keeps content out of the index and in each item", () => {
    const listed = (item: Item) => ({
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      author: item.author,
      ...(item.registryDependencies.length === 0
        ? {}
        : { registryDependencies: item.registryDependencies }),
      files: item.files.map((file) => ({
        path: file.path,
        target: file.target,
        type: file.type,
      })),
      meta: item.meta,
    });

    expect(
      index.items.flatMap((item) =>
        item.files.filter((file) => "content" in file),
      ),
    ).toEqual([]);
    expect(
      items.flatMap((item) => item.files.filter((file) => file.content === "")),
    ).toEqual([]);
    expect(index.items).toEqual(items.map(listed));
  });

  it("submits a directory entry that resolves to this site", () => {
    // shadcn's directory is how `@sudokw/<item>` reaches the CLI, so the entry
    // is the one document that must agree with both the origin and the flat
    // layout: a homepage on another host, or a template without `{name}`, is a
    // namespace the CLI resolves to nothing.
    const entry = JSON.parse(
      readFileSync(join(root, "registry/shadcn-directory.json"), "utf8"),
    ) as ReadonlyArray<Record<string, string>>;

    expect(entry).toHaveLength(1);
    const [directory] = entry;
    if (directory === undefined) throw new Error("no directory entry");

    expect(directory.name).toMatch(/^@[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
    expect(directory.homepage).toBe(siteOrigin);
    expect(directory.url).toBe(`${siteOrigin}/{name}.json`);
    expect(directory.logo).toContain("var(--foreground)");
    expect(Object.keys(directory).toSorted()).toEqual([
      "description",
      "homepage",
      "logo",
      "name",
      "url",
    ]);
  });

  it("serves each item at a flat, unique root address", () => {
    const names = items.map((item) => item.name);
    expect(
      names.filter((name) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)),
    ).toEqual([]);
    expect(new Set(names).size).toBe(names.length);
    expect(index.name).toBe("gpuixui");
    expect(index.homepage).toBe("https://gpuixui.sudokw.com/");
    expect(runtime.map((item) => item.name)).toContain("gpuix-primitives");
  });

  it("documents the install the CLI performs", () => {
    // The page is the only place a reader learns the address and the one
    // setting the files need; the CLI strips the files' header comments, so the
    // JSX runtime cannot ride on the source's pragma.
    const page = readFileSync(
      join(root, "apps/docs/content/docs/registry.mdx"),
      "utf8",
    );
    const readme = readFileSync(join(root, "README.md"), "utf8");

    expect(page).toContain("npx shadcn@latest add @sudokw/primitives-button");
    expect(page).toContain('"jsxImportSource": "@gpuix/react"');
    expect(page).toContain("src/components/ui/gpuixui/");
    expect(page).toContain("gpuix-tokens");
    expect(readme).toContain("@sudokw/primitives-button");
  });
});
