import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `/docs/motion` is the one page that documents `@gpuixui/motion`, and it
 * claimed the package while omitting one of its entry points: the presence seam
 * — `fadeFrom`, `presenceTiming`, `presenceMotion`, `presenceStyle`,
 * `exitWindowMs` and the rest — shipped and every overlay in the library takes
 * its frames, timing and mount window from it, but the page listed five modules
 * and showed two specifiers, so a reader writing their own surface could not
 * find the journey. The level table was hand-typed beside `motionLevels`, which
 * is the drift this repo holds to a derivation elsewhere.
 *
 * Both lists are read from the package now: the entry points from its `exports`
 * map, the presence values from the module's own `export const` lines, and the
 * five levels from `timing.ts`. A new export therefore fails until the page
 * names it, and a changed duration fails until the table follows.
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

const manifest: unknown = JSON.parse(read("packages/motion/package.json"));
const exportsMap =
  isRecord(manifest) && isRecord(manifest["exports"])
    ? manifest["exports"]
    : {};

/** `.` → `@gpuixui/motion`; `./presence` → `@gpuixui/motion/presence`. */
const specifier = (key: string): string =>
  key === "." ? "@gpuixui/motion" : `@gpuixui/motion/${key.slice(2)}`;

const entryPoints = Object.keys(exportsMap).map(specifier).toSorted();

const page = read("apps/docs/content/docs/motion.mdx").replace(/\s+/g, " ");

const presenceValues = [
  ...read("packages/motion/src/presence.ts").matchAll(/^export const (\w+)/gm),
].flatMap((match) => (match[1] === undefined ? [] : [match[1]]));

interface Level {
  readonly name: string;
  readonly ms: string;
}

const declaredLevels: ReadonlyArray<Level> = (() => {
  const source = read("packages/motion/src/timing.ts");
  const block =
    source.split("export const motionLevels = {")[1]?.split("} as const")[0] ??
    "";

  return [...block.matchAll(/^\s*(\w+): (\d+),$/gm)].flatMap((match) =>
    match[1] === undefined || match[2] === undefined
      ? []
      : [{ name: match[1], ms: match[2] }],
  );
})();

/** The page's own level rows: a name, its milliseconds and the reason. */
const printedLevels: ReadonlyArray<Level> = [
  ...page.matchAll(/\| `(\w+)` \| (\d+) \|/g),
].flatMap((match) =>
  match[1] === undefined || match[2] === undefined
    ? []
    : [{ name: match[1], ms: match[2] }],
);

describe("the motion page", () => {
  it("names every entry point the package publishes", () => {
    const missing = entryPoints.filter(
      (entry) => !page.includes(`\`${entry}\``),
    );

    expect(entryPoints.length).toBeGreaterThanOrEqual(5);
    expect(missing).toEqual([]);
  });

  it("documents the presence seam every surface takes its journey from", () => {
    const missing = presenceValues.filter(
      (name) => !page.includes(`\`${name}\``),
    );

    expect(presenceValues.length).toBeGreaterThanOrEqual(8);
    expect(missing).toEqual([]);
    expect(page).toContain("## Presence");
    expect(page).toContain("@gpuixui/motion/presence");
  });

  it("prints the five durations motionLevels declares", () => {
    expect(declaredLevels.length).toBeGreaterThanOrEqual(5);
    expect(printedLevels).toEqual(declaredLevels);
  });

  it("calls the frame builder with the arguments it declares", () => {
    // Bug guarded: the snippet called `fadeFrom("top")` with one argument
    // while the builder takes an axis and an offset, and the frames table
    // named the side-aware builder `fadeFrom` instead of `fadeFromSide`.
    expect(read("packages/motion/src/presence.ts")).toContain(
      "export const fadeFromSide = (",
    );
    expect(page).toContain('fadeFromSide("top", 8)');
    expect(page).toContain("`fadeFromSide(side, offset)`");
    expect(page).toContain("`fadeFrom(axis, offset)`");
    expect(page).not.toMatch(/fadeFrom\("top"\)/);
  });
});
