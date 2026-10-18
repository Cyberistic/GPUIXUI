/**
 * The capability reference must stay true to the pinned runtime.
 *
 * Plan `203`'s first table was checked against `references/gpuix` — `main`,
 * ahead of the published release — and therefore claimed `aspectRatio`, inset
 * shadows, `borderStyle` and `onScrollChange` for 0.10.0. None of them exist in
 * the published types; a component built on one fails to compile, and a
 * capability doc that lists it silently authorises the mistake. This test
 * asserts the verdicts that keep the two apart, so reverting a row to the
 * main-only claim fails by name.
 */

import { Effect, FileSystem, Option, Path, pipe } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Str from "effect/String";

const root = (...segments: ReadonlyArray<string>) =>
  Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return yield* fileSystem.readFileString(
      path.join(import.meta.dirname, "..", "..", "..", ...segments),
    );
  }).pipe(Effect.provide(NodeFileSystem.layer), Effect.provide(NodePath.layer));

const readCapabilities = () => root("docs", "gpuix-capabilities.md");

const VERDICTS: ReadonlyArray<string> = [
  "supported",
  "partial",
  "not supported",
  "window-only",
  "unverified",
];

const NO_ROW: ReadonlyArray<string> = [];

/** A markdown table line's cells, without the leading and trailing pipes. */
const cells = (line: string): ReadonlyArray<string> =>
  pipe(line, Str.split("|"), Arr.map(Str.trim), Arr.drop(1), Arr.dropRight(1));

const isRule = (line: string) => /^\|[\s|:-]+\|$/.test(line);

/** The lines between one heading and the next top-level heading. */
const section = (doc: string, heading: string): ReadonlyArray<string> => {
  const lines = Str.split("\n")(doc);
  const start = Arr.findFirstIndex(lines, (line) =>
    Str.startsWith(heading)(line),
  );
  const rest = Option.match(start, {
    onNone: () => [],
    onSome: (index) => Arr.drop(lines, index + 1),
  });
  const end = Arr.findFirstIndex(rest, (line) => Str.startsWith("## ")(line));
  return Option.match(end, {
    onNone: () => rest,
    onSome: (index) => Arr.take(rest, index),
  });
};

const verdictOf = (cell: string): string =>
  pipe(cell, Str.replaceAll("*", ""), Str.trim);

/** Every typed row of the limits table, with its verdict in cell 1. */
const limitsRows = (doc: string): ReadonlyArray<ReadonlyArray<string>> =>
  pipe(
    section(doc, "## 3."),
    Arr.map(Str.trim),
    Arr.filter(Str.startsWith("|")),
    Arr.filter((line) => !isRule(line)),
    Arr.map(cells),
    Arr.filter(
      (row) =>
        row.length === 4 && Arr.contains(VERDICTS, verdictOf(row[1] ?? "")),
    ),
  );

const rowFor = (doc: string, capability: string): ReadonlyArray<string> =>
  pipe(
    limitsRows(doc),
    Arr.findFirst((row) => Str.includes(capability)(row[0] ?? "")),
    Option.getOrElse(() => NO_ROW),
  );

const verdictFor = (doc: string, capability: string): string =>
  verdictOf(rowFor(doc, capability)[1] ?? "");

describe("GPUix capability reference", () => {
  it("declares every host element in the published ElementType union", async () => {
    const doc = await Effect.runPromise(readCapabilities());
    const hosts = Arr.join(section(doc, "## 1."), "\n");
    const elements = [
      "div",
      "text",
      "img",
      "svg",
      "canvas",
      "input",
      "textarea",
      "anchored",
      "code",
      "diff",
      "markdown",
      "virtual-list",
    ];
    expect(
      Arr.filter(elements, (element) => !Str.includes(`"${element}"`)(hosts)),
    ).toStrictEqual([]);
  });

  it("gives every limits row one verdict, some evidence and a workaround", async () => {
    const rows = limitsRows(await Effect.runPromise(readCapabilities()));
    expect(rows.length).toBeGreaterThanOrEqual(20);
    expect(
      Arr.filter(rows, (row) => !Str.isNonEmpty(row[2] ?? "")),
    ).toStrictEqual([]);
    expect(
      Arr.filter(rows, (row) => !Str.isNonEmpty(row[3] ?? "")),
    ).toStrictEqual([]);
  });

  it("keeps main-only style fields out of the supported rows", async () => {
    const doc = await Effect.runPromise(readCapabilities());
    expect(verdictFor(doc, "aspectRatio")).toBe("not supported");
    expect(verdictFor(doc, "borderStyle")).toBe("not supported");
    expect(verdictFor(doc, "z-index")).toBe("not supported");
    expect(verdictFor(doc, "Text shadow")).toBe("not supported");
  });

  it("does not claim scroll or layout callbacks the published props lack", async () => {
    const doc = await Effect.runPromise(readCapabilities());
    expect(verdictFor(doc, "onScrollChange")).toBe("not supported");
  });

  it("marks at least three capabilities unverified", async () => {
    const doc = await Effect.runPromise(readCapabilities());
    const unverified = Arr.filter(
      limitsRows(doc),
      (row) => verdictOf(row[1] ?? "") === "unverified",
    );
    expect(Arr.length(unverified)).toBeGreaterThanOrEqual(3);
    expect(verdictFor(doc, "Reduced-motion")).toBe("unverified");
  });

  it("records canvas as unverified rather than a drawing surface", async () => {
    const doc = await Effect.runPromise(readCapabilities());
    expect(verdictFor(doc, "Custom paint")).toBe("unverified");
  });

  it("records the partial accessibility contract and what is missing", async () => {
    const doc = await Effect.runPromise(readCapabilities());
    const row = rowFor(doc, "aria-*");
    expect(verdictOf(row[1] ?? "")).toBe("partial");
    expect(Arr.join(row, " ")).toContain("aria-checked");
  });

  it("names createPortal as unpublished in 0.10.0", async () => {
    const doc = await Effect.runPromise(readCapabilities());
    const unpublished = Arr.join(section(doc, "### Not published"), "\n");
    expect(unpublished).toContain("createPortal");
  });

  it("does not contradict the gradient verdict in the Box page", async () => {
    // The bug guarded (plan 342): box.mdx said `StyleDesc` "supports solid
    // roles only" while this table says a two-stop gradient is supported.
    const doc = await Effect.runPromise(readCapabilities());
    const box = await Effect.runPromise(
      root("packages", "primitives", "docs", "box.mdx"),
    );
    expect(verdictFor(doc, "Two-stop linear gradient")).toBe("supported");
    expect(Str.includes("supports solid roles only")(box)).toBe(false);
    expect(Str.includes("linear-gradient")(box)).toBe(true);
  });
});
