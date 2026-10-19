import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GPUixVersion } from "./native-platforms";

/**
 * Guards plan 584: the Installation page states the versions the workspace
 * really pins, and the source-build remedy it names exists.
 *
 * The bug being guarded is an install page that drifts from the manifests it
 * describes: a Node or nub bump leaves readers on an old prerequisite, and a
 * moved build script leaves Intel macOS with a command that does not exist.
 *
 * `node:fs` and `JSON.parse` are deliberate: `apps/docs` has no Effect runtime
 * and its bundle must not import `effect` (`architecture.test.ts`); every docs
 * test reads repository files the same way (`content-references.test.ts`).
 */
interface RootManifest {
  readonly engines: { readonly node: string };
  readonly workspaces: { readonly catalog: Readonly<Record<string, string>> };
  readonly devEngines: {
    readonly packageManager: { readonly version: string };
  };
}

interface AppManifest {
  readonly devDependencies: Readonly<Record<string, string>>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isStringRecord = (
  value: unknown,
): value is Readonly<Record<string, string>> =>
  isRecord(value) &&
  Object.values(value).every((item) => typeof item === "string");

const isRootManifest = (value: unknown): value is RootManifest => {
  if (!isRecord(value)) return false;
  const engines = value.engines;
  const workspaces = value.workspaces;
  const devEngines = value.devEngines;
  if (!isRecord(engines) || typeof engines.node !== "string") return false;
  if (!isRecord(workspaces) || !isStringRecord(workspaces.catalog))
    return false;
  if (!isRecord(devEngines) || !isRecord(devEngines.packageManager))
    return false;
  return typeof devEngines.packageManager.version === "string";
};

const isAppManifest = (value: unknown): value is AppManifest =>
  isRecord(value) && isStringRecord(value.devDependencies);

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, "utf8"));

const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));

const root: unknown = readJson(join(repositoryRoot, "package.json"));
const app: unknown = readJson(join(appRoot, "package.json"));
if (!isRootManifest(root))
  throw new Error("root package.json has changed shape");
if (!isAppManifest(app))
  throw new Error("apps/docs/package.json has changed shape");

const nodeVersion = readFileSync(
  join(repositoryRoot, ".node-version"),
  "utf8",
).trim();
const nubVersion = root.devEngines.packageManager.version;
const gpuixVersion = root.workspaces.catalog["@gpuix/react"];
const nativeRange = app.devDependencies["@gpuix/native"];

const page = readFileSync(
  join(appRoot, "content", "docs", "installation.mdx"),
  "utf8",
);
const description = page.slice(0, page.indexOf("---", 4));

describe("installation page prerequisites", () => {
  it("states the pinned Node and nub versions", () => {
    expect(nodeVersion).toBe("24.18.0");
    expect(page).toContain(`\`${nodeVersion}\``);
    expect(page).toContain(`\`${nubVersion}\``);
  });

  it("states the pinned GPUix version from the catalog and the app", () => {
    expect(gpuixVersion).toBe(GPUixVersion);
    expect(nativeRange).toBe(GPUixVersion);
    expect(page).toContain(`\`${GPUixVersion}\``);
  });

  it("names the prerequisite and platform subjects in its summary", () => {
    expect(description).toContain("prerequisites");
    expect(description).toContain("requirements");
    expect(description).toContain("platform support");
  });
});

describe("installation page native bindings", () => {
  it("carries the table before the install commands", () => {
    const prerequisites = page.indexOf("## Prerequisites");
    const bindings = page.indexOf("## Native bindings");
    const table = page.indexOf("<NativePlatforms />");
    const packages = page.indexOf("## Packages are not published yet");
    expect(prerequisites).toBeGreaterThan(-1);
    expect(bindings).toBeGreaterThan(prerequisites);
    expect(table).toBeGreaterThan(bindings);
    expect(packages).toBeGreaterThan(table);
  });

  it("names the Intel Mac absence and the source-build script", () => {
    expect(page).toMatch(/publishes no Intel Mac/i);
    expect(page).toContain("apps/playground/scripts/build-native-binding.sh");
    expect(
      existsSync(
        join(
          repositoryRoot,
          "apps",
          "playground",
          "scripts",
          "build-native-binding.sh",
        ),
      ),
    ).toBe(true);
  });

  it("names the published platform terms a reader searches", () => {
    ["arm64", "x86_64", "apple silicon", "Linux", "Windows"].forEach((term) => {
      expect(page.toLowerCase()).toContain(term.toLowerCase());
    });
  });
});
