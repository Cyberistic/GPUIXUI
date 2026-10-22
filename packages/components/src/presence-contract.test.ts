/**
 * The pointer contract every animated floating surface keeps.
 *
 * The bug this guards: `ContextMenuContent` composed the presence seam but never
 * painted the leaving state on its surface, and its `anchored` host kept
 * `occlude`, so for the 200 ms a dismissed menu stayed painted it still took the
 * pointer — a press inside that box went to the ghost (or was swallowed by the
 * occlusion) instead of the control underneath, and the press the dismissal was
 * for needed a second click. `presence.test.tsx` measures the behaviour; this
 * suite holds the shape that makes it possible.
 *
 * A surface hosted by `<FloatingLayer>` or `<anchored>` sits over whatever it
 * opened from, so it must paint `pointerEvents` from its presence while it
 * leaves. An `anchored` host must make `occlude` conditional for the same
 * reason: the occlusion is a native mouse block that no style value can undo.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

/** Every readable source file under `relative`, recursively, minus suites. */
const sourcesUnder = (relative: string): ReadonlyArray<string> => {
  const directory = fileURLToPath(new URL(relative, packageRoot));
  return Arr.flatMap(
    readdirSync(directory, { withFileTypes: true }),
    (entry) => {
      const path = `${relative}${entry.name}`;
      if (entry.isDirectory()) return sourcesUnder(`${path}/`);
      if (!/\.tsx?$/.test(entry.name)) return [];
      if (Str.includes(".test.")(entry.name)) return [];
      return [path];
    },
  );
};

const read = (relative: string): string =>
  readFileSync(fileURLToPath(new URL(relative, packageRoot)), "utf8");

const sources = sourcesUnder("src/");

/** A floating host plus the presence seam: a surface that can cover a control. */
const floating = Arr.filter(sources, (file) => {
  const body = read(file);
  return (
    Str.includes("useSurfacePresence(")(body) &&
    (Str.includes("<FloatingLayer")(body) || Str.includes("<anchored")(body))
  );
});

/** The guard a leaving surface paints: no presses while its exit runs. */
const guard =
  /pointerEvents:\s*(?:presence\.)?present\s*\?\s*"auto"\s*:\s*"none"/;
const occludeGuard = /occlude=\{(?:presence\.)?present\}/;

/** The opening tag of a host, so an attribute is read where it is written. */
const tags = (body: string, host: string): ReadonlyArray<string> => {
  const opening = new RegExp(`^${host}[\\s>]`);
  return Arr.filterMap(Str.split("<")(body), (chunk) =>
    opening.test(chunk)
      ? Option.match(Arr.head(Str.split(">")(chunk)), {
          onNone: () => Result.failVoid,
          onSome: Result.succeed,
        })
      : Result.failVoid,
  );
};

describe("the pointer contract", () => {
  it("covers every floating surface, so the rule cannot pass on an empty tree", () => {
    // A floor rather than the exact count: a new surface joins the rule.
    expect(Arr.length(floating)).toBeGreaterThanOrEqual(6);
  });

  it("a floating surface takes no press while it leaves", () => {
    const offenders = Arr.filterMap(floating, (file) =>
      guard.test(read(file)) ? Result.failVoid : Result.succeed(file),
    );
    expect(offenders).toEqual([]);
  });

  it("a pointer-placed host drops its occlusion with its presence", () => {
    // A deferred host is placed at a point after measurement, and its box is the
    // surface: the occlusion is a native mouse block its child's `pointerEvents`
    // cannot undo (measured on the context menu: with only the style guard the
    // press case failed `expected +0 to be 1`). The modal veil is deliberately
    // exempt — its `<anchored>` is a zero-size anchor at the window origin and
    // its backdrop child owns the box, which `presence.test.tsx` measures a press
    // through while the modal leaves.
    const offenders = Arr.flatMap(floating, (file) => {
      const body = read(file);
      return Arr.filterMap(tags(body, "anchored"), (tag) =>
        Str.includes("occlude")(tag) &&
        Str.includes("deferred")(tag) &&
        !occludeGuard.test(tag)
          ? Result.succeed(`${file}: <anchored occlude> is not conditional`)
          : Result.failVoid,
      );
    });
    expect(offenders).toEqual([]);
  });
});
