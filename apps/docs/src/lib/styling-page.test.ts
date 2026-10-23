import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/docs/styling` described itself as "how a class string becomes a GPUix style,
 * and how to extend the rules" and then stopped at the default registry: it
 * never showed `createTw`, the extension point the primitives package its own
 * documentation points at, and it never named `@gpuixui/tw/react` or the
 * `jsxImportSource` that compiles a shadcn host element — so a consumer could
 * read the page, adopt the compiler, and still not know how to add a utility or
 * mount a classed element.
 *
 * The page now teaches the four extension points, the refusals, the React
 * wrappers and the JSX runtime. This guard reads the package to keep it true:
 * the reader-facing entry points from `exports` (the two `jsx-*` keys are
 * compiler targets, not specifiers a reader imports), the `Tw` host table from
 * `react.tsx`, and the extension API from the root module.
 *
 * The reads are synchronous because this is a test boundary, like the rest of
 * the site's Markdown guards.
 */

const root = new URL("../../../../", import.meta.url);

const read = (path: string): string =>
  readFileSync(new URL(path, root), "utf8");

/** A record, narrowed without asserting a shape. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const manifest: unknown = JSON.parse(read("packages/tw/package.json"));
const exportsMap =
  isRecord(manifest) && isRecord(manifest["exports"]) ? manifest["exports"] : {};

/**
 * The JSX transform resolves these two specifiers from `jsxImportSource`; a
 * reader never imports them, so the page teaches the setting instead.
 */
const compilerTargets: ReadonlySet<string> = new Set([
  "./jsx-runtime",
  "./jsx-dev-runtime",
]);

const readerEntryPoints = Object.keys(exportsMap)
  .filter((key) => !compilerTargets.has(key))
  .map((key) => (key === "." ? "@gpuixui/tw" : `@gpuixui/tw/${key.slice(2)}`))
  .toSorted();

const rootModule = read("packages/tw/src/index.ts");

const twHosts = (() => {
  const block =
    read("packages/tw/src/react.tsx").split("export const Tw = {")[1]?.split(
      "} as const",
    )[0] ?? "";

  return [...block.matchAll(/^\s+(\w+):/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
})();

const page = read("apps/docs/content/docs/styling.mdx").replace(/\s+/g, " ");

describe("the styling page", () => {
  it("names every entry point a reader imports", () => {
    const missing = readerEntryPoints.filter(
      (entry) => !page.includes(`\`${entry}\``),
    );

    expect(readerEntryPoints).toEqual(["@gpuixui/tw", "@gpuixui/tw/react"]);
    expect(missing).toEqual([]);
  });

  it("teaches the JSX runtime the manifest publishes", () => {
    expect(Object.keys(exportsMap)).toContain("./jsx-runtime");
    expect(page).toContain("jsxImportSource");
    expect(page).toContain('"jsxImportSource": "@gpuixui/tw"');
  });

  it("teaches the extension API the root module exports", () => {
    // Bug guarded: the description promised extension; the body named none.
    expect(rootModule).toContain("createTw");
    expect(rootModule).toContain("unsupportedReason");
    expect(page).toContain("`createTw`");
    expect(page).toContain("`unsupportedReason`");
    expect(page).toContain("TwRegistryConfig");
  });

  it("names every host the React wrappers publish", () => {
    const missing = twHosts.filter((host) => !page.includes(`Tw.${host}`));

    expect(twHosts.length).toBeGreaterThanOrEqual(3);
    expect(missing).toEqual([]);
    expect(page).toContain("TwProvider");
  });
});
