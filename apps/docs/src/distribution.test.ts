import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as Schema from "effect/Schema";
import { describe, expect, it } from "vitest";
import { getMDXComponents } from "./components/mdx";
import {
  distributionAbsences,
  distributionViolations,
  packagerConfig,
  packagerConfigRows,
  packagerFormats,
  packagingArtifacts,
  packagingArtifactsIn,
  packagingDependencies,
  packagingDependenciesIn,
} from "./lib/distribution";
import { distributionSearchEntry } from "./lib/distribution-search";
import { nativePlatforms } from "./lib/native-platforms";
import { generatedSearchEntries, search } from "./lib/search";
import { indexedSurfaces } from "./lib/search-docs";
import { updateFormats } from "./lib/updater";
import { windowFamilies } from "./lib/window-surface";

/**
 * Guards the Shipping a desktop app page (plan 638). The bug being prevented is
 * a release-readiness subject with no owner: `deployment.mdx` said "no packaging
 * guide exists yet", and measured 2026-10-21, `shipping` reached Dark mode,
 * `packaging` the Values API, `bundle identifier` a Text variants paragraph,
 * `notarize` and `executable` returned nothing, and `dmg` reached the Roadmap.
 *
 * Two halves are checked. The pinned-release facts — the update formats, the
 * native targets and the runtime's window fields — are re-derived from the
 * declarations and the page's own data in both directions. The recipe is
 * GPUix's repository, so what this repository can check is the opposite: that it
 * has never packaged anything, so the absences stay true.
 *
 * `node:fs` is a deliberate test-boundary import, as in
 * `test-surface.test.ts`: the docs bundle must never import the native runtime,
 * and the guard has to read the tree.
 */
const appDirectory = fileURLToPath(new URL("..", import.meta.url));
const repository = fileURLToPath(new URL("../../../", import.meta.url));
const page = readFileSync(
  join(appDirectory, "content/docs/distribution.mdx"),
  "utf8",
);
const tables = readFileSync(
  join(appDirectory, "src/components/distribution-tables.tsx"),
  "utf8",
);
const deploymentPage = readFileSync(
  join(appDirectory, "content/docs/deployment.mdx"),
  "utf8",
);
const updatesPage = readFileSync(
  join(appDirectory, "content/docs/updates.mdx"),
  "utf8",
);
const meta = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.Struct({ pages: Schema.Array(Schema.String) })),
)(readFileSync(join(appDirectory, "content/docs/meta.json"), "utf8"));

const repoRelative = (path: string): string =>
  relative(repository, path).split("\\").join("/");

const SKIPPED = new Set([
  ".git",
  ".agents",
  "dist",
  "node_modules",
  "references",
  "workspaces",
]);

/** Every filename under the repository, with the generated trees skipped. */
const fileNames = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? fileNames(path) : [path];
  });

const basenames = fileNames(repository).map((path) =>
  path.slice(path.lastIndexOf("/") + 1),
);

const manifests = [
  join(repository, "package.json"),
  ...["apps", "packages", "examples"].flatMap((kind) =>
    readdirSync(join(repository, kind), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(repository, kind, entry.name, "package.json")),
  ),
].filter(existsSync);

const WorkspaceManifest = Schema.Struct({
  dependencies: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  devDependencies: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  peerDependencies: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  optionalDependencies: Schema.optional(
    Schema.Record(Schema.String, Schema.Unknown),
  ),
});

/** The dependency names one manifest declares, from its four groups. */
const dependencyNames = (path: string): ReadonlyArray<string> => {
  const manifest = Schema.decodeUnknownSync(
    Schema.fromJsonString(WorkspaceManifest),
  )(readFileSync(path, "utf8"));

  return [
    manifest.dependencies,
    manifest.devDependencies,
    manifest.peerDependencies,
    manifest.optionalDependencies,
  ].flatMap((group) => (group === undefined ? [] : Object.keys(group)));
};

/** Every non-test source file under a directory. */
const sourceFiles = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === "dist") return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx)$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name)
      ? [path]
      : [];
  });

/** The sources whose text would make an absence row false if it gained a name. */
const nativeSources = [
  ...readdirSync(join(repository, "packages"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const directory = join(repository, "packages", entry.name, "src");
      return existsSync(directory) ? sourceFiles(directory) : [];
    }),
  ...sourceFiles(join(repository, "examples")),
  ...sourceFiles(join(repository, "apps/playground/src")),
];

const matchingSources = (pattern: RegExp): ReadonlyArray<string> =>
  nativeSources
    .filter((path) => pattern.test(readFileSync(path, "utf8")))
    .map(repoRelative);

const installableFormats = (): ReadonlyArray<string> =>
  packagerFormats.filter((row) => row.update).map((row) => row.format);

describe("the format table and the update client", () => {
  it("has no violations against the real data", () => {
    expect(
      distributionViolations({
        formats: packagerFormats,
        updaterFormats: updateFormats,
        config: packagerConfig,
      }),
    ).toEqual([]);
    expect(packagerFormats.map((row) => row.format)).toEqual([
      "app",
      "dmg",
      "appimage",
      "nsis",
      "wix",
    ]);
    expect(new Set(installableFormats())).toEqual(new Set(updateFormats));
  });

  it("fails by name when a format is dropped or invented", () => {
    expect(
      distributionViolations({
        formats: packagerFormats.filter((row) => row.format !== "wix"),
        updaterFormats: updateFormats,
        config: packagerConfig,
      }),
    ).toEqual(["wix is an update format but has no row"]);

    expect(
      distributionViolations({
        formats: [
          ...packagerFormats,
          {
            os: "Linux",
            format: "deb",
            output: "A `.deb`",
            updateAsset: "The `.deb`",
            update: true,
          },
        ],
        updaterFormats: updateFormats,
        config: packagerConfig,
      }),
    ).toEqual(["deb is marked installable by the updater"]);
  });

  it("marks dmg as the one output the updater cannot install", () => {
    expect(packagerFormats.filter((row) => !row.update)).toEqual([
      expect.objectContaining({ format: "dmg" }),
    ]);
  });
});

describe("the targets agree with Installation", () => {
  it("names every platform Installation lists, and no other", () => {
    const documented = nativePlatforms
      .filter((platform) => page.includes(platform.label))
      .map((platform) => platform.label);

    expect(documented).toEqual(
      nativePlatforms.map((platform) => platform.label),
    );
  });

  it("says the unpublished platform has no prebuilt binary", () => {
    const unpublished = nativePlatforms.filter(
      (platform) => !platform.published,
    );

    expect(unpublished).toHaveLength(1);
    expect(page.replace(/\s+/gu, " ")).toContain(
      `publishes none for ${unpublished[0]?.label ?? "missing"}`,
    );
  });
});

describe("the copyable configuration", () => {
  const fence = /```json title="packager\.json"\n([\s\S]*?)```/u.exec(page)?.[1];

  class PackagerConfigFence extends Schema.Class<PackagerConfigFence>(
    "PackagerConfigFence",
  )({
    productName: Schema.String,
    version: Schema.String,
    identifier: Schema.String,
    binariesDir: Schema.String,
    outDir: Schema.String,
    binaries: Schema.Array(
      Schema.Struct({ path: Schema.String, main: Schema.Boolean }),
    ),
    icons: Schema.Array(Schema.String),
    formats: Schema.Array(Schema.String),
  }) {}

  it("renders the same file the reader copies", () => {
    const decoded = Schema.decodeUnknownSync(
      Schema.fromJsonString(PackagerConfigFence),
    )(fence ?? "{}");

    expect({ ...decoded }).toEqual({ ...packagerConfig });
  });

  it("renders one row per field, in the configuration's order", () => {
    expect(packagerConfigRows.map((row) => row.name)).toEqual(
      Object.keys(packagerConfig),
    );
  });
});

describe("this repository has never packaged an app", () => {
  it("detects each packaging artifact in a fixture list", () => {
    expect(
      packagingArtifactsIn([
        "packager.json",
        "README.md",
        "notes.desktop",
        "dist/app",
        "package.json",
      ]),
    ).toEqual(["packager.json", "notes.desktop"]);
    expect(packagingArtifacts).toContain("tauri.conf.json");
  });

  it("finds no packaging artifact in the repository", () => {
    expect(packagingArtifactsIn(basenames)).toEqual([]);
  });

  it("detects a denied packager dependency in a fixture manifest", () => {
    expect(
      packagingDependenciesIn([
        ["react", "effect"],
        ["electron-builder", "vite"],
      ]),
    ).toEqual(["electron-builder"]);
    expect(
      distributionAbsences.find(
        (absence) => absence.subject === "Packaging configuration",
      )?.deniedDependencies,
    ).toEqual(packagingDependencies);
  });

  it("finds no packager in any workspace manifest", () => {
    expect(packagingDependenciesIn(manifests.map(dependencyNames))).toEqual([]);
  });

  it("keeps every absence with a symbol true in the sources", () => {
    const violated = distributionAbsences.flatMap((absence) =>
      absence.symbol === undefined
        ? []
        : matchingSources(absence.symbol).map(
            (path) => `${absence.subject}: ${path}`,
          ),
    );

    expect(violated).toEqual([]);
  });
});

describe("the runtime has no bundle identity", () => {
  const names = windowFamilies.flatMap((family) =>
    family.fields.map((field) => field.name),
  );

  it("has appId, which is not a bundle identifier", () => {
    expect(names).toContain("appId");
  });

  it("has no icon, bundle identifier or version field", () => {
    expect(
      ["icon", "bundleIdentifier", "version"].filter((name) =>
        names.includes(name),
      ),
    ).toEqual([]);
  });
});

describe("the page", () => {
  it("sits directly before Deployment in the sidebar", () => {
    expect(meta.pages.indexOf("distribution")).toBe(
      meta.pages.indexOf("deployment") - 1,
    );
  });

  it("keeps the sections the recipe needs", () => {
    const headings = [...page.matchAll(/^## (.+)$/gmu)].map(
      (match) => match[1],
    );

    expect(headings).toEqual([
      "What ships",
      "Build one binary",
      "Wrap it in an app",
      "The app icon",
      "Sign the bundle",
      "Publish a release",
      "What this repository does not do",
      "Provenance",
      "Related",
    ]);
  });

  it("renders its tables from the data module", () => {
    const components = getMDXComponents();

    for (const name of [
      "PackagerFormats",
      "PackagerConfig",
      "DistributionAbsences",
    ] as const) {
      expect(page).toContain(`<${name} />`);
      expect(components[name]).toBeTypeOf("function");
    }

    expect(tables).toContain("packagerFormats.map");
    expect(tables).toContain("packagerConfigRows.map");
    expect(tables).toContain("distributionAbsences.map");
  });

  it("states every absence through the table, not as hand-written rows", () => {
    const section =
      /## What this repository does not do\n([\s\S]*?)\n## Provenance/u.exec(
        page,
      )?.[1] ?? "";

    expect(section).toContain("<DistributionAbsences />");
    expect(section.split("\n").filter((line) => line.startsWith("- "))).toEqual(
      [],
    );
    expect(distributionAbsences.length).toBeGreaterThan(0);
  });

  it("hands the subject over from Deployment and Updates", () => {
    expect(deploymentPage).not.toContain("no packaging guide exists yet");
    expect(deploymentPage).toContain("/docs/distribution");
    expect(updatesPage).toContain("/docs/distribution");
    expect(page).toContain("/docs/installation#native-bindings");
    expect(page).toContain("/docs/updates");
    expect(page).toContain("/docs/window");
  });

  it("claims no verification it did not perform", () => {
    expect(page).not.toMatch(/has been verified|verified in the runtime/iu);
    expect(page).not.toMatch(/<LiveSurface|<NativePreview|<PreviewSurface/);
    expect(page.replace(/\s+/gu, " ")).toContain(
      "This site has packaged nothing",
    );
  });
});

describe("shipping is findable", { timeout: 120_000 }, () => {
  it("registers its generated document once", () => {
    expect(generatedSearchEntries).toContain(distributionSearchEntry);
    expect(
      generatedSearchEntries.filter(
        (entry) => entry.index.url === "/docs/distribution",
      ),
    ).toHaveLength(1);
    expect(distributionSearchEntry.names).toEqual(
      expect.arrayContaining([
        "cargo-packager",
        "CARGO_PACKAGER_SIGN_PRIVATE_KEY",
        "CARGO_PACKAGER_SIGN_PRIVATE_KEY_PASSWORD",
      ]),
    );
    expect(distributionSearchEntry.names).not.toContain("nsis");
    expect(distributionSearchEntry.names).not.toContain("wix");
  });

  it("has a Site search row", () => {
    expect(indexedSurfaces).toContainEqual(
      expect.objectContaining({
        title: "Shipping a desktop app",
        url: "/docs/distribution",
      }),
    );
  });

  it.each([
    ["shipping", "/docs/distribution"],
    ["distribute", "/docs/distribution"],
    ["packaging", "/docs/distribution"],
    ["packager", "/docs/distribution"],
    ["bundle identifier", "/docs/distribution"],
    ["app bundle", "/docs/distribution"],
    ["ship an app", "/docs/distribution"],
    ["notarize", "/docs/distribution"],
    ["notarization", "/docs/distribution"],
    ["executable", "/docs/distribution"],
    ["dmg", "/docs/distribution"],
    ["installer", "/docs/distribution"],
    ["cross compile", "/docs/distribution"],
    ["app icon", "/docs/distribution"],
    ["cargo packager", "/docs/distribution"],
    ["cargo-packager", "/docs/distribution"],
  ])("%s reaches the page", async (query, url) => {
    const [first] = await search(query);

    expect(first?.url).toBe(url);
  });

  it.each([
    ["native bindings", "/docs/installation"],
    ["auto update", "/docs/updates"],
    ["checkUpdate", "/docs/updates"],
    ["downloadAndInstall", "/docs/updates"],
    ["icon", "/docs/components/icon"],
    ["release", "/docs/installation"],
    ["updater", "/docs/updates"],
  ])("%s keeps its owner", async (query, url) => {
    const [first] = await search(query);

    expect(first?.url.split("#")[0]).toBe(url);
  });
});
