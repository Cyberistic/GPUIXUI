import { existsSync, readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { sidebarPages } from "./sidebar-pages.test-util";
import { ApiReference } from "../components/docs/api-reference";
import {
  buildPublicApi,
  entryPoints,
  notPublished,
  parseManifest,
  type PackageManifest,
} from "./public-api";
import { publicApi } from "./public-api-data";
import { publicSymbolIndex } from "./public-symbols-data";

/**
 * The public-entry-point reference.
 *
 * The page claims to be the complete public surface, so the guards check it
 * against the manifests on disk rather than against itself: a declared entry
 * that the page omits, a target that does not resolve, a pattern that matches
 * nothing, a duplicate specifier and an unlisted package each fail here.
 */

const root = new URL("../../../../", import.meta.url);

const packages = readdirSync(new URL("packages/", root), {
  withFileTypes: true,
}).filter((entry) => entry.isDirectory());

const manifestOf = (dir: string): PackageManifest | undefined =>
  parseManifest(
    JSON.parse(
      readFileSync(new URL(`packages/${dir}/package.json`, root), "utf8"),
    ),
  );

const published = packages.flatMap((entry) => {
  const manifest = manifestOf(entry.name);
  return manifest === undefined || entryPoints(manifest).length === 0
    ? []
    : [manifest];
});

/** The files a pattern like `./src/*.tsx` can resolve to. */
const patternMatches = (dir: string, target: string): ReadonlyArray<string> => {
  const [directory = "", suffix = ""] = target.replace(/^\.\//, "").split("*");
  return readdirSync(new URL(`packages/${dir}/${directory}`, root)).filter(
    (name) => name.endsWith(suffix),
  );
};

describe("the public API parse", () => {
  it("rejects a value that is not a manifest", () => {
    expect(parseManifest("nope")).toBeUndefined();
    expect(parseManifest({ name: "x" })).toBeUndefined();
    expect(parseManifest({ exports: {} })).toBeUndefined();
  });

  it("reads a built package's import condition, and keeps source out of the JSON filter", () => {
    const manifest: PackageManifest = {
      name: "@gpuixui/demo",
      description: "demo",
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        "./tsconfig.base.json": "./tsconfig.base.json",
      },
    };

    expect(entryPoints(manifest)).toEqual([
      {
        specifier: "@gpuixui/demo",
        subpath: ".",
        target: "./dist/index.js",
        pattern: false,
        built: true,
      },
    ]);
  });

  it("maps each subpath to its specifier and source", () => {
    const manifest: PackageManifest = {
      name: "@gpuixui/demo",
      description: "demo",
      exports: {
        ".": "./src/index.ts",
        "./react": { types: "./src/react.tsx", default: "./src/react.tsx" },
        "./*": "./src/*.tsx",
        "./tsconfig.base.json": "./tsconfig.base.json",
      },
    };

    expect(entryPoints(manifest)).toEqual([
      {
        specifier: "@gpuixui/demo",
        subpath: ".",
        target: "./src/index.ts",
        pattern: false,
        built: false,
      },
      {
        specifier: "@gpuixui/demo/react",
        subpath: "./react",
        target: "./src/react.tsx",
        pattern: false,
        built: false,
      },
      {
        specifier: "@gpuixui/demo/*",
        subpath: "./*",
        target: "./src/*.tsx",
        pattern: true,
        built: false,
      },
    ]);
  });

  it("drops a manifest with no source entry, and sorts the rest", () => {
    const built = buildPublicApi([
      {
        name: "@gpuixui/zeta",
        description: "z",
        exports: { ".": "./src/index.ts" },
      },
      {
        name: "@gpuixui/config",
        description: "c",
        exports: { "./x": "./x.json" },
      },
      {
        name: "@gpuixui/alpha",
        description: "a",
        exports: { ".": "./src/index.ts" },
      },
      "not a manifest",
    ]);

    expect(built.map((pkg) => pkg.name)).toEqual([
      "@gpuixui/alpha",
      "@gpuixui/zeta",
    ]);
  });
});

describe("the reference against the manifests", () => {
  it("lists every package that publishes source", () => {
    expect(publicApi.map((pkg) => pkg.name)).toEqual(
      published
        .map((manifest) => manifest.name)
        .toSorted((a, b) => a.localeCompare(b)),
    );
  });

  it("publishes every declared entry, and nothing extra", () => {
    const declared = published.flatMap((manifest) =>
      entryPoints(manifest).map((entry) => entry.specifier),
    );
    const listed = publicApi.flatMap((pkg) =>
      pkg.entries.map((entry) => entry.specifier),
    );

    expect(new Set(listed)).toEqual(new Set(declared));
    expect(listed.length).toBe(new Set(listed).size);
  });

  it("resolves every source entry to a file that exists", () => {
    const broken = publicApi.flatMap((pkg) => {
      const dir = pkg.name.replace("@gpuixui/", "");
      return pkg.entries.flatMap((entry) => {
        if (entry.built) return [];
        return entry.pattern
          ? patternMatches(dir, entry.target).length === 0
            ? [`${entry.specifier}: ${entry.target} matches no file`]
            : []
          : existsSync(
                new URL(`packages/${dir}/${entry.target.slice(2)}`, root),
              )
            ? []
            : [`${entry.specifier}: ${entry.target} is missing`];
      });
    });

    expect(broken).toEqual([]);
  });

  it("only publishes a build target from a package that has a build script", () => {
    const missing = publicApi.flatMap((pkg) => {
      const shipped = pkg.entries.filter((entry) => entry.built);
      if (shipped.length === 0) return [];
      const manifest: unknown = JSON.parse(
        readFileSync(
          new URL(
            `packages/${pkg.name.replace("@gpuixui/", "")}/package.json`,
            root,
          ),
          "utf8",
        ),
      );
      const scripts =
        typeof manifest === "object" &&
        manifest !== null &&
        "scripts" in manifest &&
        typeof manifest.scripts === "object" &&
        manifest.scripts !== null
          ? manifest.scripts
          : {};
      return "build" in scripts ? [] : [pkg.name];
    });

    expect(missing).toEqual([]);
  });

  it("accounts for every workspace package, published or explicitly not", () => {
    const accounted = [
      ...publicApi.map((pkg) => pkg.name),
      ...notPublished.map((pkg) => pkg.name),
    ];
    const unexplained = packages.flatMap((entry) => {
      const raw: unknown = JSON.parse(
        readFileSync(
          new URL(`packages/${entry.name}/package.json`, root),
          "utf8",
        ),
      );
      const name =
        typeof raw === "object" && raw !== null && "name" in raw
          ? raw.name
          : undefined;
      return typeof name === "string" && accounted.includes(name)
        ? []
        : [entry.name];
    });

    expect(unexplained).toEqual([]);
  });
});

describe("the rendered reference", () => {
  const markup = renderToStaticMarkup(<ApiReference />);

  it("prints every specifier the packages publish", () => {
    const missing = publicApi.flatMap((pkg) =>
      pkg.entries
        .filter((entry) => !markup.includes(entry.specifier))
        .map((entry) => entry.specifier),
    );

    expect(missing).toEqual([]);
  });

  it("prints every symbol the packages publish, with the file it lives in", () => {
    const missing = publicSymbolIndex.packages.flatMap((pkg) =>
      pkg.symbols
        .filter((row) => !markup.includes(row.module))
        .map((row) => `${pkg.name}/${row.name}`),
    );

    expect(missing).toEqual([]);
  });

  it("prints the summary a symbol's doc comment carries", () => {
    const createTheme = publicSymbolIndex.packages
      .flatMap((pkg) => pkg.symbols)
      .find((row) => row.name === "createTheme");

    expect(createTheme?.summary).not.toBe("");
    expect(markup).toContain(createTheme?.summary);
  });

  it("names the packages that are not published, so the omission is explicit", () => {
    expect(notPublished.filter((pkg) => !markup.includes(pkg.name))).toEqual(
      [],
    );
  });
});

describe("the reference page", () => {
  const page = readFileSync(
    new URL("../../content/docs/reference.mdx", import.meta.url),
    "utf8",
  );

  it("mounts the generated table instead of a hand-written list", () => {
    expect(page).toContain("<ApiReference />");
  });

  it("sits in its own sidebar section before Contributing", () => {
    const pages = sidebarPages(new URL("../../", import.meta.url));

    expect(pages.indexOf("reference")).toBeGreaterThan(pages.indexOf("blocks"));
    expect(pages.indexOf("reference")).toBeLessThan(
      pages.indexOf("contributing"),
    );
  });
});
