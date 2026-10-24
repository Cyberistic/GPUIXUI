import { readFileSync } from "node:fs";
import { preferenceOf } from "../../../../packages/motion/src/timing.js";
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

/**
 * The React entry's exports: its `export const` hooks and the names its
 * `export { … }` blocks re-publish. The page's module table is the one list a
 * reader uses to find a hook, so it is held to this set rather than to a
 * hand-written row.
 */
const reactSource = read("packages/motion/src/react.ts");
const reactExports = [
  ...[...reactSource.matchAll(/^export const (\w+)/gm)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
  ),
  ...[...reactSource.matchAll(/export \{([^}]*)\}/g)].flatMap((match) =>
    (match[1] ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter((name) => name !== "" && !name.startsWith("type ")),
  ),
];

/** The page's own React row, between its bars. */
const reactRow = (): string => {
  const start = page.indexOf("| React |");
  const end = page.indexOf("|", start + 9);
  return page.slice(start, end);
};

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

  it("names every React entry the page's module table lists", () => {
    // Bug guarded: the row listed four sampling hooks and none of the presence
    // hooks a surface composes, so a reader of the module table never learned
    // the mounted window exists — while the package publishes it here.
    const row = reactRow();
    const missing = reactExports.filter((name) => !row.includes(`\`${name}\``));

    expect(reactExports.length).toBeGreaterThanOrEqual(8);
    expect(row).not.toBe("");
    expect(missing).toEqual([]);
  });

  it("splits the presence table's ownership where the package does", () => {
    // Bug guarded: the page said the presence entry owns the mount window,
    // while the timer lives in the React entry (`useSurfacePresence`) and the
    // presence entry publishes only its conversion (`exitWindowMs`). A reader
    // was pointed at a module that cannot keep a leaving box mounted.
    expect(read("packages/motion/src/react.ts")).toContain(
      "export const useSurfacePresence = (",
    );
    expect(read("packages/motion/src/presence.ts")).toContain(
      "export const exitWindowMs = (",
    );
    expect(page).toContain("the **mounted window** itself is a timer");
    expect(page).toContain("`useSurfacePresence` keeps a leaving box painted");
    expect(page).not.toContain(
      "owns the three frames, the enter and exit timing and the mount window",
    );
  });

  it("teaches the fail-safe a stored preference takes", () => {
    // Bug guarded: the page taught the two literal names and the provider's
    // default, so a reader whose settings row decodes as NULL — or as a string
    // a release renamed — could not learn what their tree would do, or why the
    // fallback direction is the reduced one.
    expect(preferenceOf("animated")).toBe("animated");
    expect(preferenceOf("reduced")).toBe("reduced");
    expect(preferenceOf(null)).toBe("animated");
    expect(preferenceOf(undefined)).toBe("animated");
    expect(preferenceOf("middle")).toBe("reduced");

    expect(page).toContain("`preferenceOf`");
    expect(page).toContain("@gpuixui/motion/timing");
    expect(page).toContain("An absent value");
    expect(page).toContain('the house `"animated"`');
    expect(page).toContain("not one of those names");
    expect(page).toContain('takes `"reduced"`');
    expect(page).toContain("The two mistakes are not equal");
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
