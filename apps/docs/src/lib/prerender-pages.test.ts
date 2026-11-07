import { describe, expect, it } from "vitest";
import { curatedPrimitiveTwins, servedUrls } from "./curated-twins";
import { packageDocsFiles, siteDocsFiles } from "./docs-pages.test-util";
import { prerenderPaths, staticDocumentPaths } from "./prerender-pages";
import { registryPaths } from "./registry-source";

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
    expect(staticDocumentPaths).toEqual([
      "/sitemap.xml",
      "/llms.txt",
      "/llms-full.txt",
    ]);
    expect(paths).toEqual(expect.arrayContaining([...staticDocumentPaths]));
  });

  it(
    "keeps the registry out of the Worker's bundle",
    { timeout: 30_000 },
    () => {
      const registry = registryPaths(root);

      expect(registry.length).toBeGreaterThan(100);
      expect(registry).toContain("/registry.json");
      expect(registry.filter((path) => paths.includes(path))).toEqual([]);
    },
  );

  it("leaves the routes a static asset cannot answer to the Worker", () => {
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
