import { readFileSync } from "node:fs";
import { densityPresets, type DensityName } from "@gpuixui/tokens";
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
 * It also holds the `h-9` row to the compiler. The page called the default
 * registry "fixed metrics — `h-9` is 36", while `classesToStyle` maps `h-8`,
 * `h-9` and `h-10` onto the density scale's `sm`/`md`/`lg`, so the row taught
 * Tailwind's number where the default theme paints its own control height.
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
  isRecord(manifest) && isRecord(manifest["exports"])
    ? manifest["exports"]
    : {};

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
    read("packages/tw/src/react.tsx")
      .split("export const Tw = {")[1]
      ?.split("} as const")[0] ?? "";

  return [...block.matchAll(/^\s+(\w+):/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  );
})();

const page = read("apps/docs/content/docs/styling.mdx").replace(/\s+/g, " ");

/**
 * The class → control-size table `utilities.ts` compiles with: `"9": "md"`.
 *
 * Read as text rather than imported because the mapping is module-private, and
 * the point of the case is that the page follows the compiler's own table.
 */
const isControlStep = (value: string): value is "sm" | "md" | "lg" =>
  value === "sm" || value === "md" || value === "lg";

const controlSteps = new Map<string, "sm" | "md" | "lg">(
  [
    ...(
      read("packages/tw/src/utilities.ts")
        .split("const CONTROL_HEIGHT")[1]
        ?.split("};")[0] ?? ""
    ).matchAll(/"(\d+)":\s*"(sm|md|lg)"/g),
  ].flatMap((match) => {
    const [, size, step] = match;
    return size === undefined || step === undefined || !isControlStep(step)
      ? []
      : [[size, step] as const];
  }),
);

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

  it("teaches the control height the compiler resolves", () => {
    // Bug guarded: the page taught Tailwind's `h-9` = 36 while the compiler
    // resolves it through the active theme's density.
    const step = controlSteps.get("9");
    if (step === undefined) throw new Error("h-9 resolves to no control step");
    const height = (preset: DensityName) =>
      densityPresets[preset].controlHeight[step];

    expect(page).toContain(`${height("comfortable")} at the default`);
    expect(page).toContain(`${height("compact")} compact`);
    expect(page).toContain(`${height("spacious")} spacious`);
    expect(page).not.toContain("`h-9` is 36");
    expect(page).not.toContain("height: 36");
  });
});
