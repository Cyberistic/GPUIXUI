/**
 * Guards the ordinal claims in the package's own JSDoc against `themeChecks`.
 *
 * The bug guarded: `themeRingFailures` said it was "the tenth check" and
 * `themeNativeTextFailures` "the ninth", counting the order the checks were
 * *added* to the package. `themeChecks` is the order `themeFailures` composes
 * them, and the reference and README both tell a consumer to iterate it, so the
 * hover text on two public functions named a position the public index
 * contradicts. A future check could drift the same way, because no test read
 * source prose.
 *
 * `node:fs` is deliberate: this is a documentation test over the package's own
 * files, and the package ships zero runtime dependencies by design.
 */
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { themeChecks, type ThemeFailureKind } from "./theme-check.js";

const ordinals = [
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
] as const;

/** The function each check kind returns its failures from. */
const checkFunctions = {
  color: "themeColorFailures",
  opacity: "themeOpacityFailures",
  typeface: "themeTypefaceFailures",
  contrast: "themeContrastFailures",
  ring: "themeRingFailures",
  highlight: "themeHighlightFailures",
  nativeText: "themeNativeTextFailures",
  hierarchy: "themeTextTierFailures",
  direction: "themeDirectionFailures",
  metric: "themeMetricFailures",
} as const satisfies Record<ThemeFailureKind, string>;

const sourceDirectory = new URL(".", import.meta.url);

/** Collapse a JSDoc block to one line so a claim may wrap. */
const oneLine = (text: string): string =>
  text.replace(/\n\s*\* ?/g, " ").replace(/\s+/g, " ");

const sources = readdirSync(sourceDirectory)
  .filter(
    (name) =>
      name.endsWith(".ts") &&
      !name.endsWith(".test.ts") &&
      !name.endsWith(".example.ts"),
  )
  .map((name) => ({
    name,
    source: oneLine(readFileSync(new URL(name, sourceDirectory), "utf8")),
  }));

/** Every `themeXFailures` is the Nth check sentence in the package's JSDoc. */
const claims = sources.flatMap(({ name, source }) =>
  [...source.matchAll(/`(theme[A-Za-z]+Failures)` is the ([a-z]+) check/g)].map(
    (match) => ({
      file: name,
      fn: match[1] ?? "",
      word: match[2] ?? "",
    }),
  ),
);

const kindFor = (fn: string): ThemeFailureKind | undefined =>
  themeChecks.find((kind) => checkFunctions[kind] === fn);

describe("the check ordinals in the package's JSDoc", () => {
  it("finds the ordinal claims it guards", () => {
    const functions = claims.map((claim) => claim.fn);
    expect(functions).toContain("themeRingFailures");
    expect(functions).toContain("themeNativeTextFailures");
  });

  it("states each check's position in themeChecks", () => {
    claims.forEach(({ file, fn, word }) => {
      const kind = kindFor(fn);
      expect(kind, `${file}: ${fn}`).toBeDefined();
      const position = kind === undefined ? -1 : themeChecks.indexOf(kind);
      expect(word, `${file}: ${fn}`).toBe(ordinals[position]);
    });
  });

  it("names a check function its module declares", () => {
    claims.forEach(({ file, fn }) => {
      const source =
        sources.find((candidate) => candidate.name === file)?.source ?? "";
      expect(source, `${file}: ${fn}`).toContain(`export function ${fn}`);
    });
  });

  it("has an ordinal word for every check", () => {
    expect(themeChecks.length).toBeLessThanOrEqual(ordinals.length);
  });

  it("documents the guard in the reference", () => {
    const reference = readFileSync(
      new URL("../../../docs/tokens.md", import.meta.url),
      "utf8",
    ).replace(/\s+/g, " ");
    expect(reference).toContain(
      "Each check's own JSDoc names its position in that list, held by `check-ordinals.test.ts`",
    );
  });
});
