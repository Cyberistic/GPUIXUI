import { describe, expect, it } from "vitest";
import {
  namedImports,
  readRepo,
  typescriptSnippets,
  unresolvedImports,
} from "./doc-snippets.test-util";

/**
 * The introduction is the page that states what the library is built on, so its
 * two factual claims are held to the workspace: the host elements the runtime
 * publishes (the capability record lists the union) and the symbols its snippets
 * import.
 *
 * A host element added to the runtime and missing here would leave the first
 * page describing a smaller runtime than the one the library uses; one removed
 * would have the page promise an element the runtime no longer has.
 */

const page = readRepo("apps/docs/content/docs/index.mdx");
const record = readRepo("docs/gpuix-capabilities.md");

/** The union of host elements, as the capability record prints it. */
const recordElements: ReadonlyArray<string> = [
  ...(
    record.split("\n").find((line) => line.includes('"virtual-list"')) ?? ""
  ).matchAll(/"([a-z-]+)"/g),
].map((match) => match[1] ?? "");

/** The elements the introduction's "host elements" sentence names. */
const pageHostText = page.slice(
  page.indexOf("host elements"),
  page.indexOf("GPUIxUI builds"),
);
const pageElements: ReadonlyArray<string> = [
  ...pageHostText.matchAll(/`([a-z-]+)`/g),
].map((match) => match[1] ?? "");

describe("the introduction page", () => {
  it("names exactly the host elements the runtime publishes", () => {
    expect(recordElements.length).toBeGreaterThanOrEqual(10);
    expect(pageElements.toSorted()).toEqual(recordElements.toSorted());
  });

  it("imports only names the packages publish", () => {
    const imports = namedImports(typescriptSnippets(page));

    expect(imports.length).toBeGreaterThanOrEqual(1);
    expect(unresolvedImports(imports)).toEqual([]);
  });
});
