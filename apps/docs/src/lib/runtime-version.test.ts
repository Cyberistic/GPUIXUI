import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../../../", import.meta.url);
const docsDir = new URL("apps/docs/content/docs/", root);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const catalogPin = (manifest: unknown, key: string): string | undefined => {
  const workspaces = isRecord(manifest) ? manifest.workspaces : undefined;
  const catalog = isRecord(workspaces) ? workspaces.catalog : undefined;
  if (!isRecord(catalog)) return undefined;

  const value = catalog[key];
  return typeof value === "string" ? value : undefined;
};

const manifest: unknown = JSON.parse(
  readFileSync(new URL("package.json", root), "utf8"),
);

const nativePin = catalogPin(manifest, "@gpuix/native");
const reactPin = catalogPin(manifest, "@gpuix/react");

const versionMentions = (source: string): ReadonlyArray<string> =>
  [
    ...source.matchAll(
      /(?:GPUix\b|@gpuix\/(?:native|react)\b)[\x60*]*\s*(?:@\s*)?v?(\d+\.\d+\.\d+)/g,
    ),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

const pages = (dir: URL, slug = ""): ReadonlyArray<[string, string]> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${slug}${entry.name}`;
    if (entry.isDirectory())
      return pages(new URL(`${entry.name}/`, dir), `${path}/`);
    return entry.name.endsWith(".mdx")
      ? [[path, readFileSync(new URL(entry.name, dir), "utf8")] as const]
      : [];
  });

const documents = [
  ".agents/slop/COMPONENTS.md",
  "README.md",
  "docs/gpuix-capabilities.md",
].map((path) => [path, readFileSync(new URL(path, root), "utf8")] as const);

const staleVersions = (
  sources: ReadonlyArray<readonly [string, string]>,
  pin: string,
): ReadonlyArray<string> =>
  sources.flatMap(([path, source]) =>
    versionMentions(source).flatMap((version) =>
      version === pin ? [] : [`${path}: ${version} (pinned ${pin})`],
    ),
  );

describe("the pinned runtime", () => {
  it("is one version for the native package and the React bindings", () => {
    expect(nativePin).toBeDefined();
    expect(reactPin).toBe(nativePin);
  });

  it("is what every docs page names", () => {
    expect(staleVersions(pages(docsDir), nativePin ?? "")).toEqual([]);
  });

  it("is named often enough that the scan cannot pass by matching nothing", () => {
    const mentions = pages(docsDir).flatMap(([, source]) =>
      versionMentions(source),
    );

    expect(mentions.length).toBeGreaterThan(0);
    expect([...new Set(mentions)]).toEqual([nativePin]);
  });

  it("is the version the documents beside the site name", () => {
    expect(staleVersions(documents, nativePin ?? "")).toEqual([]);
  });
});
