import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The runtime version every page claims.
 *
 * The site's pages described `0.10.0` for a release after the workspace moved
 * to `0.11.0` — the onboarding, the theming page and the dark-mode page all said
 * the runtime had no appearance API "in 0.10.0". A reader checks the version on
 * the page, so a stale number is a false claim even when the capability gap it
 * describes is still real. This guard reads the pin from the workspace catalogue
 * and fails any page that names another version, which makes the next upgrade a
 * re-read rather than a find-and-replace.
 */

const root = new URL("../../../../", import.meta.url);
const docsDir = new URL("apps/docs/content/docs/", root);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** A catalog value, narrowed without trusting the manifest's shape. */
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

/** Every runtime version a page names, in prose or in a code block. */
const versionMentions = (source: string): ReadonlyArray<string> =>
  [
    ...source.matchAll(
      /\b(?:GPUix|@gpuix\/(?:native|react))\s*(?:@\s*)?v?(\d+\.\d+\.\d+)/g,
    ),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

/** Every `.mdx` under `content/docs`, with its path for the failure message. */
const pages = (dir: URL, slug = ""): ReadonlyArray<[string, string]> =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${slug}${entry.name}`;
    if (entry.isDirectory())
      return pages(new URL(`${entry.name}/`, dir), `${path}/`);
    return entry.name.endsWith(".mdx")
      ? [[path, readFileSync(new URL(entry.name, dir), "utf8")] as const]
      : [];
  });

describe("the pinned runtime", () => {
  it("is one version for the native package and the React bindings", () => {
    expect(nativePin).toBeDefined();
    expect(reactPin).toBe(nativePin);
  });

  it("is what every docs page names", () => {
    const pin = nativePin ?? "";
    const stale = pages(docsDir).flatMap(([path, source]) =>
      versionMentions(source).flatMap((version) =>
        version === pin ? [] : [`${path}: ${version} (pinned ${pin})`],
      ),
    );

    expect(stale).toEqual([]);
  });

  it("is named often enough that the scan cannot pass by matching nothing", () => {
    const mentions = pages(docsDir).flatMap(([, source]) =>
      versionMentions(source),
    );

    // Seven pages name it today; the floor only proves the scan is matching.
    expect(mentions.length).toBeGreaterThan(4);
    expect([...new Set(mentions)]).toEqual([nativePin]);
  });
});
