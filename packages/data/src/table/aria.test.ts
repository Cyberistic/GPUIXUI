/**
 * The `aria-*` set a window carries, held to what the grid writes.
 *
 * `docs/gpuix-capabilities.md` records the set as closed — `role` plus exactly
 * seven `aria-*` attributes — and `a11y-tree` measured that anything else is
 * dropped: an element carrying `aria-disabled` reads as an ordinary row. The
 * `TableRow` wrote exactly that, so a disabled row claimed a state no reader
 * could hear while its own press handler was gone — behaviour and announcement
 * disagreed, and nothing in the suite noticed.
 *
 * The bug this guards: a write outside the measured set is invisible in the
 * source (the attribute types as a host prop) and invisible in a window (the
 * node simply reads as a plain row). The sweep below fails naming the attribute
 * instead, and the row docs have to state what the state *is*.
 */

import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Str from "effect/String";

/** The seven attributes the pinned runtime carries, from the capability record. */
const CLOSED_SET = [
  "aria-label",
  "aria-description",
  "aria-id",
  "aria-expanded",
  "aria-selected",
  "aria-valuetext",
  "aria-level",
] as const;

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

/** Whether a path under `src/` is shipped source rather than a suite. */
const isSource = (entry: string): boolean =>
  (Str.endsWith(".ts")(entry) || Str.endsWith(".tsx")(entry)) &&
  !Str.endsWith(".test.ts")(entry) &&
  !Str.endsWith(".test.tsx")(entry);

/** Every shipped source file, by path relative to `src/`. */
const sourceFiles = (): ReadonlyArray<readonly [string, string]> =>
  Arr.map(
    Arr.filter(
      readdirSync(new URL("../", import.meta.url), {
        recursive: true,
        encoding: "utf8",
      }),
      isSource,
    ),
    (entry) => [entry, read(`../${entry}`)] as const,
  );

/** The `aria-*` names a source file writes as an attribute or an object key. */
const written = (source: string): ReadonlyArray<string> =>
  Arr.appendAll(
    Arr.map(
      Arr.fromIterable(source.matchAll(/aria-[a-z-]+(?==)/g)),
      (match) => match[0],
    ),
    Arr.map(
      Arr.fromIterable(source.matchAll(/"aria-[a-z-]+"(?=\s*:)/g)),
      (match) => Str.replaceAll('"', "")(match[1] ?? match[0]),
    ),
  );

describe("the aria set the grid writes", () => {
  it("writes only the attributes the runtime carries", () => {
    const offenders = Arr.flatMap(sourceFiles(), ([path, source]) =>
      Arr.filter(
        written(source),
        (name) => !Arr.contains(CLOSED_SET, name),
      ).map((name) => `${path}: ${name}`),
    );

    // A write outside the set is a state the runtime drops, so the element
    // reads as an ordinary one while the component believes it said something.
    expect(offenders).toEqual([]);
  });

  it("states why a disabled row is not announced", () => {
    const row = readFileSync(new URL("./table.tsx", import.meta.url), "utf8");

    // The fact (the set has no `aria-disabled`) and the consequence (what the
    // state is instead), so a caller does not put a reason where nothing reads.
    expect(row).toContain("carries no `aria-disabled`");
    expect(row).toContain("no press handler, no pointer wash");
    expect(row).toContain("reason in a cell's text");
  });

  it("is still the closed set the capability record publishes", () => {
    const record = readFileSync(
      new URL("../../../../docs/gpuix-capabilities.md", import.meta.url),
      "utf8",
    );
    const found = Arr.findFirst(Arr.fromIterable(record.split("\n")), (line) =>
      line.startsWith("| `role` and the `aria-*` subset"),
    );
    const row = Option.match(found, {
      onNone: () => "",
      onSome: (line) => line,
    });

    // A record that stops naming the row, or an attribute the record drops,
    // means this package's set is no longer the measured one.
    expect(row).not.toBe("");
    Arr.forEach(CLOSED_SET, (name) => {
      expect(row).toContain(`\`${name}\``);
    });
  });
});
