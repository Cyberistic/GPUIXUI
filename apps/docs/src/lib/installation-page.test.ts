import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  namedImports,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";
import { repoRoot } from "./public-symbols-source";

/**
 * The installation page is the first page a reader follows, so every command on
 * it has to exist: a pinned Node version that is not `.node-version`, a `nub add`
 * for a package the workspace does not ship, or a `nub run` for a script no
 * manifest declares all look correct and fail on the reader's machine.
 *
 * The page used to be trusted by eye; `getting-started` already resolves its
 * commands, and this does the same for the page before it.
 */

interface Manifest {
  readonly name: string;
  readonly scripts?: Readonly<Record<string, string>>;
  /** The root manifest's pinned toolchain. */
  readonly devEngines?: {
    readonly packageManager?: { readonly name?: string };
  };
  /** The native package's declared prebuild matrix. */
  readonly napi?: { readonly targets?: ReadonlyArray<string> };
}

const manifest = (path: string): Manifest =>
  JSON.parse(readRepo(path)) as Manifest;

const page = readRepo("apps/docs/content/docs/installation.mdx");
const root = manifest("package.json");
const snippets = typescriptSnippets(page);
const imports = namedImports(snippets);

/** Every workspace package, by manifest name. */
const workspaceManifests: ReadonlyArray<Manifest> = readdirSync(
  join(repoRoot, "packages"),
  { withFileTypes: true },
).flatMap((entry) =>
  entry.isDirectory() ? [manifest(`packages/${entry.name}/package.json`)] : [],
);

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

describe("the installation page", () => {
  it("pins the toolchain the repository pins", () => {
    const nodeVersion = readRepo(".node-version").trim();
    const manager = root.devEngines?.packageManager;

    expect(nodeVersion.length).toBeGreaterThan(0);
    expect(page).toContain(nodeVersion);
    expect(manager?.name).toBeDefined();
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
    expect(imports.length).toBeGreaterThanOrEqual(2);
    expect(unresolvedImports(imports)).toEqual([]);
  });

  it("names every host the native package builds for, and the host it does not", () => {
    // The binding is native, so a host with no binary for it installs cleanly
    // and exits `2` before a component paints. Intel macOS is exactly that host
    // (BLOCKERS B1), and this is the first page a reader follows: the table is
    // held to the installed package's own target list rather than to memory,
    // and the workaround is held to the script that exists.
    const native = manifest(
      "apps/docs/node_modules/@gpuix/native/package.json",
    );
    const targets = native.napi?.targets ?? [];

    expect(targets.length).toBeGreaterThanOrEqual(4);
    expect(targets.filter((target) => !page.includes(target))).toEqual([]);

    // The premise the source-build note rests on: no prebuilt Intel macOS
    // binding, so the page names that target and the command that builds it.
    expect(targets).not.toContain("x86_64-apple-darwin");
    expect(page).toContain("x86_64-apple-darwin");

    const script = "apps/playground/scripts/build-native-binding.sh";
    expect(page).toContain(script);
    expect(existsSync(join(repoRoot, script))).toBe(true);
    expect(page).toContain(
      "apps/playground/README.md#the-binding-on-this-host",
    );
  });

  it("says which hosts can run the offscreen renderer's suites", () => {
    // A Linux x64 host loads the binding but cannot run the behaviour suites,
    // because `TestRenderer` is macOS and Windows only. The page links the
    // preflight instead of restating a per-host matrix that would drift, and
    // the claim is read through the concatenated string the source builds.
    const preflight = readRepo("packages/testing/src/runtime.ts")
      .replaceAll(/["+]/g, " ")
      .replaceAll(/\s+/g, " ");

    expect(preflight).toContain("are macOS and Windows only");
    expect(page).toContain("macOS and Windows only");
  });
});
