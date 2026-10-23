/**
 * Guards the example gallery's documentation against a drifting count.
 *
 * The header said "39 screens" while the registry had grown to 46 and nothing
 * read it: the scenario pages whatever `examples` holds, so only the prose fell
 * behind. The header must not print a count at all, and the readout must ask the
 * registry — a number written down in either place is the bug.
 *
 * Bug guarded: a registry that grows leaves a one-number claim false. The README
 * carried the other half — its gallery section pinned the size three times, the
 * check total it implied (`4 × 39 + 2`), the readout's own `of=39`, and the
 * negative control's `expected 39, got 1` — and by the time this was written the
 * registry held 72 screens, so a reader judged the suite at half its coverage.
 * The section now states the probe's *shape* instead, and this file derives that
 * shape from the assertion sites, so an assertion added without the sentence and
 * a sentence edited alone both fail.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./examples.tsx", import.meta.url), "utf8");

/** The components registry, read as keys so a collision is checked without loading it. */
const componentRegistry = readFileSync(
  new URL("../../../../packages/components/examples/index.ts", import.meta.url),
  "utf8",
);

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

/** The prose between the gallery's heading and the next one. */
const gallerySection = (() => {
  const start = readme.indexOf("## The example gallery");
  const end = readme.indexOf("\n## ", start + 1);
  return start === -1 || end === -1 ? "" : readme.slice(start, end);
})();

/** The gallery's line in §What is proven here, honestly. */
const provenBullet = (() => {
  const start = readme.indexOf("- Every shipped example the docs quote");
  const end = readme.indexOf("\n- ", start + 1);
  return start === -1 || end === -1 ? "" : readme.slice(start, end);
})();

/** The `Effect.forEach` callback: the checks that run once per page. */
const perPageSource = (() => {
  const start = source.indexOf("yield* Effect.forEach(");
  const end = source.indexOf("{ concurrency: 1 }", start);
  return start === -1 || end === -1 ? "" : source.slice(start, end);
})();

const sites = (text: string): number =>
  text.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;

/** The count in words, so the sentence and the source speak one language. */
const WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
] as const;

describe("the example gallery's header", () => {
  it("does not pin the registry size in prose", () => {
    expect(source).not.toMatch(/\b\d+\s+(?:screens|examples)\b/i);
  });

  it("reports the size from the registry", () => {
    expect(source).toContain("of=${Arr.length(exampleIds)}");
  });
});

describe("the example gallery's README section", () => {
  it("does not pin the registry size or a total derived from it", () => {
    // A reader judges coverage from this section; every count in it is a
    // function of `packages/components/examples`.
    expect(gallerySection).not.toBe("");
    expect(gallerySection).not.toMatch(
      /\b\d+\s+(?:screens?|examples?|checks?)\b/i,
    );
    expect(gallerySection).not.toMatch(/of=\d+/);
    // A quoted negative-control message ("expected 39, got 1") carries the same
    // registry-derived number in the other direction.
    expect(gallerySection).not.toMatch(/expected \d+, got \d+/);
    expect(provenBullet).not.toBe("");
    expect(provenBullet).not.toMatch(
      /\b\d+\s+(?:screens?|examples?|checks?)\b/i,
    );
  });

  it("states the per-page shape the probe actually asserts", () => {
    // Each page asserts four things — the readout names it, its wrapper paints,
    // the wrapper lays out a height and its subtree carries text — and the run
    // adds two whole-run checks. The words are derived: a five-site page (or a
    // third whole-run check) fails the sentence by name instead of passing it
    // with a stale shape.
    const perPage = sites(perPageSource);
    expect(perPage).toBeGreaterThan(1);
    expect(gallerySection).toContain(`${WORDS[perPage]} checks per page`);
    expect(provenBullet).toContain(`${WORDS[perPage]} checks per page`);

    const wholeRun = sites(source) - perPage;
    expect(wholeRun).toBeGreaterThan(0);
    expect(wholeRun).toBeLessThan(WORDS.length);
    expect(gallerySection).toContain(`${WORDS[wholeRun]} checks for the run`);
  });

  it("holds the two negative controls to the probe's own message", () => {
    // The controls are the section's proof that the suite can fail; a message
    // quoted from an older registry ("expected 39, got 1") is a failure the run
    // can no longer produce.
    expect(gallerySection).toContain(
      "`no-such-example lays out a height of its own`",
    );
    expect(gallerySection).toContain("`no two examples paint the same screen`");
    expect(source).toContain('"no two examples paint the same screen"');
    expect(source).toContain("`${id} lays out a height of its own`");
  });
});

describe("the example gallery's registry", () => {
  it("merges the shell package's three examples under the docs' ids", () => {
    expect(source).toContain('from "@gpuixui/shell/examples"');
    expect(source).toContain("AppMenuExample");
    expect(source).toContain("StatusBarExample");
    expect(source).toContain("ToolbarExample");
    expect(source).toContain('"app-menu": AppMenuExample');
    expect(source).toContain('"status-bar": StatusBarExample');
    expect(source).toContain("toolbar: ToolbarExample");
    expect(source).toContain("...componentExamples");
    expect(source).toContain("...shellExamples");
  });

  it("gives the merged ids no name the components registry already uses", () => {
    // A shared id would mount one screen under two names, which the run's
    // no-two-pages-paint-one-screen check would report after 79 mounts instead
    // of here.
    const componentIds = Arr.fromIterable(
      componentRegistry.matchAll(/^  "([a-z0-9-]+)":/gm),
    ).map((match) => match[1] ?? "");
    expect(Arr.length(componentIds)).toBeGreaterThan(40);
    expect(
      Arr.intersection(componentIds, ["app-menu", "status-bar", "toolbar"]),
    ).toEqual([]);
  });
});
