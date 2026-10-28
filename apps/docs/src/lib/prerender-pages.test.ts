import { describe, expect, it } from "vitest";
import { curatedPrimitiveTwins, servedUrls } from "./curated-twins";
import { packageDocsFiles, siteDocsFiles } from "./docs-pages.test-util";
import { prerenderPaths, staticDocumentPaths } from "./prerender-pages";

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
