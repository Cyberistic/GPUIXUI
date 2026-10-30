import { describe, expect, it } from "vitest";
import { curatedPrimitiveTwins, servedUrls } from "./curated-twins";
import { packageDocsFiles, siteDocsFiles } from "./docs-pages.test-util";
import { prerenderPaths, staticDocumentPaths } from "./prerender-pages";
import { registryPaths } from "./registry-source";

/**
 * The build renders these paths once and the Worker never renders them again,
 * so a path that is missing here is a page that still burns a Worker's CPU per
 * request, and a path that should not be here is a page whose per-request
 * behaviour is lost.
 *
 * The guard reads the two page trees on disk (`docs-pages.test-util.ts`) rather
 * than a fixture, because a page added to either tree has to reach the
 * prerender list in the same commit.
 */

const root = new URL("../../../../", import.meta.url);
const paths = prerenderPaths(root);

describe("the prerendered paths", () => {
  it("covers every page the two trees serve", () => {
    const served = servedUrls(
      [...siteDocsFiles(), ...packageDocsFiles()].map((page) => page.url),
    );

    expect(served.length).toBeGreaterThan(100);
    expect(paths).toEqual(expect.arrayContaining(served));
  });

  it("renders the machine documents no page tree carries", () => {
    // `/llms-full.txt` prints every page's Markdown; it is the one document
    // that costs a whole free-plan request's CPU, and nothing in it depends on
    // the request.
    expect(staticDocumentPaths).toEqual([
      "/sitemap.xml",
      "/llms.txt",
      "/llms-full.txt",
    ]);
    expect(paths).toEqual(expect.arrayContaining([...staticDocumentPaths]));
  });

  it("keeps the registry out of the Worker's bundle", () => {
    // Registry documents carry the source of every file an item installs, and
    // bundling all 159 of them into the Worker went over Cloudflare's 63.9 MiB
    // ceiling. `scripts/emit-registry.ts` writes them to `dist/client` after
    // the build, so they must never reappear in the prerender list.
    const registry = registryPaths(root);

    expect(registry.length).toBeGreaterThan(100);
    expect(registry).toContain("/registry.json");
    expect(registry.filter((path) => paths.includes(path))).toEqual([]);
  });

  it("leaves the routes a static asset cannot answer to the Worker", () => {
    // `/live` boots the wasm renderer and needs the isolation headers the
    // Worker sets per request; a retired twin is a 301, and a prerendered
    // asset at that address would answer it with a page instead.
    expect(paths).not.toContain("/live");
    expect(
      curatedPrimitiveTwins
        .map((twin) => twin.retired)
        .filter((retired) => paths.includes(retired)),
    ).toEqual([]);
  });

  it("names one canonical address per page", () => {
    expect(new Set(paths).size).toBe(paths.length);
    expect(
      paths.filter((path) => path.length > 1 && path.endsWith("/")),
    ).toEqual([]);
    expect(paths.filter((path) => !path.startsWith("/"))).toEqual([]);
    expect(paths).toEqual([...paths].toSorted());
  });
});
