import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getMDXComponents } from "./components/mdx";

/**
 * The bug guarded: `/docs/accessibility` used `<AriaSupportTable />` before it
 * was registered in `getMDXComponents()`. The unit suite was green, the page's
 * `<head>` rendered, and only the production crawl saw a page with no `<main>`,
 * no `<h1>` and no article — an unregistered MDX component fails during SSR,
 * after the metadata has already been emitted. This test reads every page and
 * compares each capitalised tag with the component map the route uses, so the
 * next unregistered block fails before a build.
 *
 * `node:fs` is test-only; code fences and inline code are stripped so the
 * component *examples* inside them are not treated as page blocks.
 */
const content = fileURLToPath(new URL("../content/docs/", import.meta.url));

const documents = (directory: string): ReadonlyArray<string> =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return documents(path);
    return entry.name.endsWith(".mdx") ? [readFileSync(path, "utf8")] : [];
  });

/** Capitalised tags outside fenced and inline code, in first-use order. */
export const componentTags = (document: string): ReadonlyArray<string> =>
  [
    ...document
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`\n]*`/g, "")
      .matchAll(/<([A-Z][A-Za-z0-9]*)\b/g),
  ].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

/** The used components the page map does not provide. */
export const unregisteredComponents = (
  pages: ReadonlyArray<string>,
  isRegistered: (name: string) => boolean,
): ReadonlyArray<string> =>
  [...new Set(pages.flatMap(componentTags))].filter(
    (name) => !isRegistered(name),
  );

describe("every MDX block is registered", () => {
  it("ignores tags inside code fences and inline code", () => {
    expect(
      componentTags(
        "```tsx\n<AriaSupportTable />\n```\n\nUse `<PartIndex />`.\n\n<PartIndex />",
      ),
    ).toEqual(["PartIndex"]);
  });

  it("reports a component the page map does not provide", () => {
    expect(
      unregisteredComponents(
        ["<AriaSupportTable />"],
        (name) => name === "PartIndex",
      ),
    ).toEqual(["AriaSupportTable"]);
  });

  it("registers every component the pages use", () => {
    const registered = new Set(Object.keys(getMDXComponents()));
    expect(
      unregisteredComponents(documents(content), (name) =>
        registered.has(name),
      ),
    ).toEqual([]);
  });
});
