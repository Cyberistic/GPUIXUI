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

const root = fileURLToPath(new URL("../../../../", import.meta.url));

interface Page {
  readonly url: string;
  readonly file: string;
}

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

const nameCollisions = (rows: ReadonlyArray<Item>): ReadonlyArray<string> => {
  const byName = new Map<string, Set<string>>();
  for (const row of rows) {
    const files = row.files.map((file) => file.path).join("|");
    const seen = byName.get(row.name) ?? new Set<string>();
    seen.add(files);
    byName.set(row.name, seen);
  }
  return [...byName.entries()]
    .filter(([, files]) => files.size > 1)
    .map(([name]) => name);
};

const dependencyName = (address: string): string =>
  basename(new URL(address).pathname, ".json");

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

const packageOfDependency = (dependency: string): string => {
  const at = dependency.lastIndexOf("@");
  return at > 0 ? dependency.slice(0, at) : dependency;
};

const packageOfSpecifier = (specifier: string): string => {
  const parts = specifier.split("/");
  return specifier.startsWith("@")
    ? parts.slice(0, 2).join("/")
    : (parts[0] ?? "");
};

const candidates = (from: string, specifier: string): ReadonlyArray<string> => {
  const base = posix
    .normalize(posix.join(posix.dirname(from), specifier))
    .replace(/\.js$/, "");
  return [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
};

const withoutSpecifiers = (source: string): string =>
  source
    .replace(
      /^([ \t]*(?:import|export)\b[^;]*?\bfrom\s+)(["'])[^"']+\2/gm,
      '$1"x"',
    )
    .replace(/^([ \t]*import\s+)(["'])[^"']+\2/gm, '$1"x"');

describe("the shadcn registry", () => {
  it("names only pages the site still serves", () => {
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
    expect(nameCollisions(items)).toEqual([]);
  });

  it("ships the repository's source, with only workspace specifiers rewritten", () => {
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

  it("serves each item at a flat address, once per source", () => {
    const names = items.map((item) => item.name);
    expect(
      names.filter((name) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)),
    ).toEqual([]);
    expect(nameCollisions(items)).toEqual([]);
    expect(index.name).toBe("gpuixui");
    expect(index.homepage).toBe("https://gpuixui.sudokw.com/");
    expect(runtime.map((item) => item.name)).toContain("gpuix-primitives");
  });

  it("documents the install the CLI performs", () => {
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
