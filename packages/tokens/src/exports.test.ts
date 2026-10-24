/**
 * Guards the defect fixed in plan 016: `@gpuixui/tokens` exported `./dist/*`,
 * but `dist/` is gitignored, so a consumer in a clean checkout could not resolve
 * the package and every workspace that depends on it had to build it first — the
 * `primitives` package worked around it with a structural copy of the theme.
 * A workspace package must export source.
 *
 * The second defect is a public table a reader cannot look up: `platformStyles`
 * is the one value a consumer copies to start a look of their own, and its
 * architecture note was written above a **second** comment block, so it
 * documented nothing and an editor showed the table with no description while
 * every other export carried one. A declaration a consumer imports needs the
 * JSDoc that names it (AGENTS.md §5, EF-11); an overload's second signature
 * does not, because the first one owns the block.
 *
 * `node:fs` is used deliberately: this is a packaging test over the tree's own
 * manifest, and the tokens package has no `effect` dependency to borrow
 * `FileSystem` from (it ships zero runtime dependencies by design).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";

interface ExportTarget {
  readonly subpath: string;
  readonly target: string;
}

const packageUrl = new URL("..", import.meta.url);

const exportTargets: ReadonlyArray<ExportTarget> = Object.entries(
  packageJson.exports,
).flatMap(([subpath, entry]) =>
  typeof entry === "string"
    ? { subpath, target: entry }
    : Object.entries(entry).map(([, target]) => ({ subpath, target })),
);

describe("package exports", () => {
  it("exposes the core and react entries", () => {
    const subpaths = exportTargets.map((entry) => entry.subpath);
    expect(subpaths).toContain(".");
    expect(subpaths).toContain("./react");
  });

  it("points every entry at a file in the repository, not a build artifact", () => {
    expect(exportTargets.length).toBeGreaterThan(2);
    exportTargets.forEach(({ subpath, target }) => {
      // A gitignored build directory is absent from a clean checkout.
      expect(target, subpath).not.toMatch(/^\.\/(dist|build)\//);
      expect(
        existsSync(new URL(target, packageUrl)),
        `${subpath} → ${target}`,
      ).toBe(true);
    });
  });
});

/** Every published source file — a test or an example is not the package. */
const sources: ReadonlyArray<string> = readdirSync(
  new URL("./", import.meta.url),
).filter(
  (name) =>
    (name.endsWith(".ts") || name.endsWith(".tsx")) &&
    !name.includes(".test.") &&
    !name.includes(".example."),
);

/** One exported declaration a consumer imports, and the line that writes it. */
interface Declaration {
  readonly file: string;
  readonly line: number;
  readonly name: string;
}

/**
 * Every exported declaration in a source file, in the order it is written.
 *
 * An overload's second signature repeats a name the first one already declared,
 * so only the first declaration of a name is a surface with its own block. A
 * re-export (`export { x }` / `export type { x }`) declares nothing and is left
 * out — the source module owns that documentation.
 */
const declarationsIn = (
  file: string,
  source: string,
): ReadonlyArray<Declaration> =>
  source.split("\n").reduce<{
    readonly seen: ReadonlySet<string>;
    readonly found: ReadonlyArray<Declaration>;
  }>(
    (state, line, index) => {
      const match =
        /^export\s+(?:declare\s+)?(?:const|let|function|class|interface|type)\s+([A-Za-z_$][\w$]*)/.exec(
          line,
        );
      const name = match?.[1];
      if (name === undefined || state.seen.has(name)) {
        return state;
      }
      return {
        seen: new Set([...state.seen, name]),
        found: [...state.found, { file, line: index + 1, name }],
      };
    },
    { seen: new Set(), found: [] },
  ).found;

/**
 * Whether the declaration at `at` is written below a JSDoc block.
 *
 * The nearest non-blank line above it has to close a block: a blank line
 * between a comment and its declaration detaches it, which is what an orphaned
 * architecture note looks like.
 */
const documented = (lines: ReadonlyArray<string>, at: number): boolean =>
  (
    lines
      .slice(0, at)
      .filter((line) => line.trim() !== "")
      .at(-1) ?? ""
  )
    .trimEnd()
    .endsWith("*/");

describe("the documented surface", () => {
  it("gives every exported declaration the JSDoc that names it", () => {
    const undocumented = sources.flatMap((file) => {
      const lines = readFileSync(
        new URL(`./${file}`, import.meta.url),
        "utf8",
      ).split("\n");
      return declarationsIn(file, lines.join("\n"))
        .filter(({ line }) => !documented(lines, line - 1))
        .map(({ line, name }) => `${file}:${line}: ${name} has no JSDoc`);
    });

    expect(undocumented).toEqual([]);
  });
});
