/**
 * The Tier 1 inventory's "why wip" must be true (plan `648`).
 *
 * The bug this guards: the preamble above the 28 Tier 1 status rows said the
 * rows stay `wip` because the release-tag box model is 2 px smaller and the
 * geometry assertions fail — plans `597`/`598` corrected that reading and the
 * runtime suite is green — and it said every row has a docs page "in-package
 * and on the docs site" while six public parts have no Fumadocs page. A reader
 * uses this paragraph to decide what is done, so a stale reason is a real
 * defect (the class plans `583`, `608` and `641` fixed in the same ledger).
 *
 * The rows themselves stay `wip`; flipping one is a deliberate ledger change.
 * `Effect.runPromise` below is the test boundary (EF-10).
 */

import { Effect, FileSystem, Path } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The seven parts with no page on the Fumadocs site, per this workstream's TODO. */
const DOCS_SITE_GAPS = [
  "IconButton",
  "ToggleGroup",
  "CheckboxGroup",
  "Grid",
  "InfoTip",
  "ThemeProvider",
  "Surface",
] as const;

/** The lines after `start`, up to the next line beginning with `end`. */
const between = (
  lines: ReadonlyArray<string>,
  start: string,
  end: string,
): ReadonlyArray<string> =>
  Option.match(Arr.findFirstIndex(lines, Str.startsWith(start)), {
    onNone: () => [],
    onSome: (index) =>
      Arr.takeWhile(
        Arr.drop(lines, index + 1),
        (line) => !Str.startsWith(end)(line),
      ),
  });

const contains = (text: string, needle: string): boolean =>
  Str.includes(needle)(text);

const scan = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;
  const inventory = yield* fs.readFileString(
    path.join(import.meta.dirname, "..", "..", "..", "COMPONENTS.md"),
  );
  const lines = Str.split("\n")(inventory);
  const section = between(lines, "## Tier 1 — foundational", "## Tier 2");
  const preambleLines = between(
    section,
    "**Why every row below is `wip`:**",
    "| Component | Status |",
  );
  /** A paragraph normalised to one line, so a wrapped sentence still matches. */
  const paragraph = (text: ReadonlyArray<string>): string =>
    Arr.join(" ")(Arr.map(text, Str.trim));
  const rows = Arr.filter(
    section,
    (line) =>
      Str.startsWith("| ")(line) &&
      !Str.startsWith("| Component")(line) &&
      !Str.startsWith("| ---")(line),
  );
  return {
    text: paragraph(section),
    preamble: paragraph(preambleLines),
    statuses: Arr.map(rows, (row) =>
      Str.trim(Option.getOrElse(Arr.get(Str.split("|")(row), 2), () => "")),
    ),
    rows: Arr.length(rows),
  };
}).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

describe("the Tier 1 inventory's wip reason", () => {
  it("does not claim a box-model geometry gap", async () => {
    const { text } = await Effect.runPromise(scan);
    expect(
      contains(text, "box model is 2 px smaller") ||
        contains(text, "absolute-geometry assertions are short"),
      "COMPONENTS.md: plans `597`/`598` corrected the published box model; the preamble must not say the geometry still fails",
    ).toBe(false);
  });

  it("names the provenance caveat and every docs-site gap", async () => {
    const { preamble } = await Effect.runPromise(scan);
    expect(
      contains(preamble, "source build of the published `0.10.0` tag"),
      "COMPONENTS.md: the preamble must name the source-build provenance (ADR `0003`)",
    ).toBe(true);
    expect(
      contains(preamble, "in-package and on the docs site"),
      "COMPONENTS.md: seven parts have no docs-site page; do not claim they all do",
    ).toBe(false);
    expect(
      Arr.filter(DOCS_SITE_GAPS, (part) => !Str.includes(part)(preamble)),
      "COMPONENTS.md: the preamble must name every part still missing a docs-site page (see TODO.md)",
    ).toEqual([]);
  });

  it("says the box model is corrected, not a remaining gap", async () => {
    const { preamble } = await Effect.runPromise(scan);
    expect(preamble).toContain("`597`");
    expect(preamble).toContain("`598`");
    expect(preamble).toContain("not** a remaining gap");
  });

  it("keeps every Tier 1 row wip until the ledger changes deliberately", async () => {
    const { rows, statuses } = await Effect.runPromise(scan);
    expect(
      rows,
      "COMPONENTS.md: the Tier 1 table must have its rows",
    ).toBeGreaterThanOrEqual(28);
    expect(
      Arr.filter(statuses, (status) => status !== "wip"),
      "COMPONENTS.md: a Tier 1 row that flips to done must update this plan and the preamble in the same change",
    ).toEqual([]);
  });
});
