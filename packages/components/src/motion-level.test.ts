/**
 * The `level` vocabulary of a surface that can also be told to paint at rest.
 *
 * The bug these guard: four surfaces widen the motion table past `MotionLevel`
 * with `"none"` — `PageTransition`, `CodeBlock`, `CopyButton` and
 * `ThemeToggler` — and a level is a persisted choice as often as a literal, so
 * an application decodes one from storage before it paints. The published read
 * (`motionLevelOf` in `@gpuixui/motion`) is the table's, and the table does not
 * carry `"none"`: it answers the house `normal` arrival, so a saved `"none"`
 * decoded through it animated exactly where the caller asked for still. The
 * components' reader keeps the word as itself and sends everything else through
 * the table, and each of the four props is read through it rather than compared
 * raw, so the vocabulary and the reader cannot drift apart.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { motionLevelOf, motionLevels } from "@gpuixui/motion/timing";
import * as Arr from "effect/Array";
import * as R from "effect/Record";
import * as Str from "effect/String";
import { describe, expect, it } from "vitest";
import { surfaceLevelOf } from "./motion.js";

/** The text of one source file beside this suite. */
const sourceOf = (name: string): string =>
  readFileSync(
    fileURLToPath(new URL(`./${name}.tsx`, import.meta.url)),
    "utf8",
  );

/** The four surfaces whose `level` prop accepts the no-journey word. */
const surfaces = [
  "page-transition",
  "code-block",
  "copy-button",
  "theme-toggler",
] as const;

/** The values a level a store wrote can arrive as. */
const stored: ReadonlyArray<unknown> = [
  "Faster",
  " normal",
  "",
  "None",
  "NONE",
  42,
  null,
  undefined,
  {},
  [],
  "toString",
  "__proto__",
];

describe("surfaceLevelOf", () => {
  it("keeps the one word the props use for no journey", () => {
    expect(surfaceLevelOf("none")).toBe("none");
    // The table's own reader — the tempting delegate — cannot answer it, and a
    // surface decoded through that one animates where the caller asked for still.
    expect(motionLevelOf("none")).toBe("normal");
  });

  it("reads every other value through the table", () => {
    const names = R.keys(motionLevels);
    expect(Arr.map(names, surfaceLevelOf)).toEqual(names);
    expect(surfaceLevelOf("slow")).toBe("slow");

    expect(Arr.map(stored, surfaceLevelOf)).toEqual(
      Arr.map(stored, () => "normal"),
    );
  });

  it("is the reader the four surface props are typed and read with", () => {
    const missing = Arr.filter(surfaces, (name) => {
      const source = sourceOf(name);
      const reads =
        Str.includes("readonly level?: SurfaceLevel;")(source) &&
        Str.includes("level: storedLevel")(source) &&
        Str.includes("surfaceLevelOf(storedLevel)")(source);
      return !reads || Str.includes('MotionLevel | "none"')(source);
    });
    expect(missing).toEqual([]);
  });
});
