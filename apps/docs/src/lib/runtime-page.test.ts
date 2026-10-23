import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/docs/runtime` is the page that tells a consumer how to read the pinned
 * runtime's matrix, and it showed `capabilities` and `unsupportedFeature` while
 * omitting the two things a caller needs to handle a gap: the
 * `UnsupportedRuntimeFeature` class its Effect fails with, and the
 * `unsupportedFeatures` list of every refused key. The page documented what the
 * runtime cannot do and not how to react to a refusal.
 *
 * The guard reads the package's own `export { … }` blocks and requires every
 * value it publishes to be named, so a new helper or a renamed error fails the
 * page rather than shipping silently.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** The names in the package's `export { … }` blocks, types left out. */
const valueExports = [
  ...read("packages/runtime/src/index.ts").matchAll(/export \{([^}]+)\}/g),
].flatMap((match) =>
  (match[1] ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && !name.startsWith("type ")),
);

const page = read("apps/docs/content/docs/runtime.mdx").replace(/\s+/g, " ");

describe("the runtime page", () => {
  it("names every value the package publishes", () => {
    const missing = valueExports.filter((name) => !page.includes(name));

    expect(valueExports).toEqual([
      "capabilities",
      "unsupportedFeatures",
      "UnsupportedRuntimeFeature",
      "unsupportedFeature",
      "isTerminal",
    ]);
    expect(missing).toEqual([]);
  });

  it("shows how a refusal is caught, with the fields it carries", () => {
    // A reader who only sees `unsupportedFeature` cannot tell whether the gap is
    // an error channel, a defect or a string.
    expect(page).toContain("catchTag");
    expect(page).toContain("UnsupportedRuntimeFeature");
    expect(page).toContain("error.feature");
    expect(page).toContain("error.workaround");
  });
});
