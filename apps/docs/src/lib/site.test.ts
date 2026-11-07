import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { absoluteUrl, siteOrigin } from "./site";

const deployedDomain = (): string | undefined => {
  const stack = readFileSync(
    new URL("../../../../packages/deploy/alchemy.run.docs.ts", import.meta.url),
    "utf8",
  );
  return stack
    .split("\n")
    .find((line) => line.includes("const DOCS_DOMAIN"))
    ?.split('"')[1];
};

describe("the site origin", () => {
  it("is the host the deploy stack publishes", () => {
    expect(deployedDomain()).toBeDefined();
    expect(siteOrigin).toBe("https://" + deployedDomain());
  });

  it("builds an absolute URL for a path, a bare path and the root", () => {
    expect(absoluteUrl("/getting-started")).toBe(
      `${siteOrigin}/getting-started`,
    );
    expect(absoluteUrl("getting-started")).toBe(
      `${siteOrigin}/getting-started`,
    );
    expect(absoluteUrl("/")).toBe(`${siteOrigin}/`);
  });
});

// Bug guarded: the comment pass deleted these headers, so /live revalidated 20 MiB of wasm.
describe("the deployed assets", () => {
  it("caches hashed assets for a year", () => {
    const stack = readFileSync(
      new URL(
        "../../../../packages/deploy/alchemy.run.docs.ts",
        import.meta.url,
      ),
      "utf8",
    );
    expect(stack).toContain("/assets/*");
    expect(stack).toContain("max-age=31536000, immutable");
    expect(stack).toContain("headers: docsAssetHeaders");
  });
});
